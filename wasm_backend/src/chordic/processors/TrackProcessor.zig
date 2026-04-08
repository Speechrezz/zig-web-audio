const std = @import("std");
const framework = @import("framework");
const audio = framework.audio;
const dsp = framework.dsp;
const midi = framework.midi;
const LoadError = framework.state.json.LoadError;
const SerializationContext = @import("../state/SerializationContext.zig");

pub const kind = "track";
pub const name = "Track Processor";

pub const Device = struct {
    processor: *audio.AudioProcessor,

    pub fn init(audio_processor: *audio.AudioProcessor) @This() {
        return .{
            .processor = audio_processor,
        };
    }

    pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
        self.processor.destroy(allocator);
    }
};

processor: audio.AudioProcessor,

audio_buffer: audio.AudioBuffer,
midi_buffer: midi.MidiBuffer,

generator_device: ?Device,
effect_device_list: std.ArrayList(Device),

gain_param: *framework.state.AudioParameter,
gain_processor: dsp.GainProcessor,

pub fn init(self: *@This(), allocator: std.mem.Allocator) !void {
    self.processor.init(
        kind,
        name,
        self,
        &.{
            .destroy = destroyErased,
            .prepare = prepareErased,
            .process = processErased,
            .stop = stopErased,
            .toJsonSpec = toJsonSpecErased,
            .save = saveErased,
            .load = loadErased,
        },
    );

    self.audio_buffer.init();
    self.midi_buffer.init();

    self.generator_device = null;
    self.effect_device_list = .empty;

    self.gain_param = try self.processor.parameters.add(allocator, try .create(
        allocator,
        "gain",
        "Gain",
        .initSkewedCenter(0.0, 1.0, 0.2),
        0.2,
        .initBasic(1, .{ .scale = 100.0, .suffix = "%" }),
    ));
    self.gain_processor = .init;
}

pub fn create(allocator: std.mem.Allocator) !*@This() {
    const self = try allocator.create(@This());
    try self.init(allocator);
    return self;
}

fn destroyErased(ptr: *anyopaque, allocator: std.mem.Allocator) void {
    const self: *@This() = @ptrCast(@alignCast(ptr));

    self.audio_buffer.deinit(allocator);
    self.midi_buffer.deinit(allocator);

    if (self.generator_device) |*device| {
        device.deinit(allocator);
    }

    for (self.effect_device_list.items) |*device| {
        device.deinit(allocator);
    }
    self.effect_device_list.deinit(allocator);

    self.gain_processor.deinit(allocator);

    allocator.destroy(self);
}

pub fn destroy(self: *@This(), allocator: std.mem.Allocator) void {
    self.processor.destroy(allocator);
}

fn prepareErased(ptr: *anyopaque, allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    const self: *@This() = @ptrCast(@alignCast(ptr));

    if (self.generator_device) |*device| {
        try device.processor.prepare(allocator, spec);
    }

    for (self.effect_device_list.items) |*device| {
        try device.processor.prepare(allocator, spec);
    }

    try self.gain_processor.prepare(allocator, spec);
}

pub fn prepare(self: *@This(), allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    try self.audio_buffer.resize(allocator, spec.num_channels, spec.block_size);
    try self.midi_buffer.resize(allocator, 4 * spec.block_size);

    try self.processor.prepare(allocator, spec);
}

fn processErased(ptr: *anyopaque, allocator: std.mem.Allocator, audio_view: audio.AudioView, midi_events: []midi.MidiEvent) !void {
    const self: *@This() = @ptrCast(@alignCast(ptr));

    if (self.generator_device) |*device| {
        try device.processor.process(allocator, audio_view, midi_events);
    }

    for (self.effect_device_list.items) |*device| {
        try device.processor.process(allocator, audio_view, midi_events);
    }

    self.gain_processor.setGain(self.gain_param.getValue());
    self.gain_processor.process(audio_view);
}

pub fn process(self: *@This(), allocator: std.mem.Allocator, block_size: usize) !void {
    const audio_view = self.audio_buffer.createViewWithLength(block_size);
    const midi_events = self.midi_buffer.getCurrentBlockEvents(block_size);

    try self.processor.process(allocator, audio_view, midi_events);
}

fn stopErased(ptr: *anyopaque, allow_tail_off: bool) void {
    const self: *@This() = @ptrCast(@alignCast(ptr));

    if (self.generator_device) |*device| {
        device.processor.stop(allow_tail_off);
    }

    for (self.effect_device_list.items) |*device| {
        device.processor.stop(allow_tail_off);
    }
}

pub fn stop(self: *@This(), allow_tail_off: bool) void {
    self.midi_buffer.clear();
    self.processor.stop(allow_tail_off);
}

fn toJsonSpecErased(ptr: *anyopaque, write_stream: *std.json.Stringify) !void {
    const self: *@This() = @ptrCast(@alignCast(ptr));

    try write_stream.objectField("generator");
    if (self.generator_device) |*device| {
        try device.processor.toJsonSpec(write_stream);
    } else {
        try write_stream.write(null);
    }

    try write_stream.objectField("effects");
    try write_stream.beginArray();
    for (self.effect_device_list.items) |*device| {
        try device.processor.toJsonSpec(write_stream);
    }

    try write_stream.endArray();
}

pub fn toJsonSpec(self: *@This(), write_stream: *std.json.Stringify) !void {
    try self.processor.toJsonSpec(write_stream);
}

fn saveErased(ptr: *anyopaque, ctx: *const anyopaque, write_stream: *std.json.Stringify) !void {
    const self: *@This() = @ptrCast(@alignCast(ptr));

    if (self.generator_device) |*device| {
        try write_stream.objectField("generator");
        try device.processor.save(ctx, write_stream);
    }

    try write_stream.objectField("effects");
    try write_stream.beginArray();
    for (self.effect_device_list.items) |*device| {
        try device.processor.save(ctx, write_stream);
    }
    try write_stream.endArray();
}

pub fn save(self: *@This(), ctx: *const anyopaque, write_stream: *std.json.Stringify) !void {
    try self.processor.save(ctx, write_stream);
}

fn loadErased(ptr: *anyopaque, allocator: std.mem.Allocator, ctx: *anyopaque, parsed: std.json.ObjectMap) !void {
    const self: *@This() = @ptrCast(@alignCast(ptr));
    const context: *SerializationContext = @ptrCast(@alignCast(ctx));

    // --Generator--

    if (self.generator_device) |*device| {
        device.deinit(allocator);
        self.generator_device = null;
    }

    if (parsed.getPtr("generator")) |gen| {
        if (gen.* != .object) return LoadError.IncorrectFieldType;
        const gen_kind = try framework.state.json.getFieldString(gen.object, "kind");

        const proc = try context.registry.createProcessorFromKind(allocator, gen_kind);
        errdefer proc.destroy(allocator);
        try proc.load(allocator, ctx, gen);

        self.generator_device = Device.init(proc);
    }

    // --Effects--

    for (self.effect_device_list.items) |*device| {
        device.deinit(allocator);
    }
    self.effect_device_list.clearRetainingCapacity();

    const effects_array = try framework.state.json.getFieldArray(parsed, "effects");
    for (effects_array.items) |*value| {
        _ = value;
        // TODO: Dynamically add correct effect device and load.
    }
}

pub fn load(self: *@This(), allocator: std.mem.Allocator, ctx: *anyopaque, parsed: *const std.json.Value) !void {
    try self.processor.load(allocator, ctx, parsed);
}

test "TrackProcessor processing" {
    const allocator = std.testing.allocator;

    const num_channels = 2;
    const block_size = 128;

    var track_processor = try @This().create(allocator);
    var track = &track_processor.processor;
    defer track.destroy(allocator);

    const spec: audio.ProcessSpec = .{
        .block_size = block_size,
        .num_channels = num_channels,
        .sample_rate = 48000.0,
    };

    var buffer: audio.AudioBuffer = .empty;
    defer buffer.deinit(allocator);
    try buffer.resize(allocator, num_channels, block_size);

    try track.prepare(allocator, spec);
    try track.process(allocator, buffer.createView(), &[0]midi.MidiEvent{});
    track.stop(true);

    try std.testing.expectApproxEqRel(0.2, track_processor.gain_param.getValue(), 1e-5);
}

test "TrackProcessor toJsonSpec" {
    const TestingAudioProcessor = framework.testing.TestingAudioProcessor;

    const allocator = std.testing.allocator;

    var track_processor = try @This().create(allocator);
    var track = &track_processor.processor;
    defer track.destroy(allocator);

    const generator_dummy = try TestingAudioProcessor.create(allocator);
    track_processor.generator_device = Device.init(generator_dummy);

    // Stringify
    var out: std.io.Writer.Allocating = .init(allocator);
    defer out.deinit();
    var write_stream: std.json.Stringify = .{
        .writer = &out.writer,
        .options = .{ .whitespace = .indent_2 },
    };

    try track.toJsonSpec(&write_stream);
    // std.debug.print("{s}\n", .{out.written()});

    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"kind\": \"track\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"kind\": \"testProcessor\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"parameters\":") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"generator\": {") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"effects\": []") != null);
}

test "TrackProcessor save/load" {
    const TestingAudioProcessor = framework.testing.TestingAudioProcessor;
    const TestingProcessorRegistry = framework.testing.TestingProcessorRegistry;

    const allocator = std.testing.allocator;
    var context = SerializationContext.init(TestingProcessorRegistry.createInstance());
    defer context.deinit(allocator);

    // --Saving--

    var track1 = try @This().create(allocator);
    defer track1.destroy(allocator);

    const generator_dummy = try TestingAudioProcessor.create(allocator);
    track1.generator_device = Device.init(generator_dummy);

    // Stringify
    var out1: std.io.Writer.Allocating = .init(allocator);
    defer out1.deinit();
    var write_stream1: std.json.Stringify = .{
        .writer = &out1.writer,
        .options = .{ .whitespace = .indent_2 },
    };

    try track1.processor.save(&context, &write_stream1);
    // std.debug.print("out1:\n{s}\n", .{out1.written()});

    try std.testing.expect(std.mem.indexOf(u8, out1.written(), "\"kind\": \"testProcessor\"") != null);

    // --Loading--

    var track2 = try @This().create(allocator);
    defer track2.destroy(allocator);

    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, out1.written(), .{});
    defer parsed.deinit();

    try track2.load(allocator, &context, &parsed.value);

    // Stringify
    var out2: std.io.Writer.Allocating = .init(allocator);
    defer out2.deinit();
    var write_stream2: std.json.Stringify = .{
        .writer = &out2.writer,
        .options = .{ .whitespace = .indent_2 },
    };

    try track2.processor.save(&context, &write_stream2);
    // std.debug.print("\nout2:\n{s}\n", .{out2.written()});

    try std.testing.expectEqualSlices(u8, out1.written(), out2.written());
}
