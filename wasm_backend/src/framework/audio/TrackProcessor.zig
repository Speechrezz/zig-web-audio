const std = @import("std");
const audio = @import("audio.zig");
const dsp = @import("../dsp/dsp.zig");
const midi = @import("../midi/midi.zig");
const state = @import("../state/state.zig");
const LoadError = state.json.LoadError;

pub const id = "trackProcessor";
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
generator_device: ?Device,
effect_device_list: std.ArrayList(Device),

gain_param: *state.AudioParameter,
gain_processor: dsp.GainProcessor,

pub fn init(self: *@This(), allocator: std.mem.Allocator) !void {
    try self.processor.init(
        id,
        name,
        self,
        &.{
            .destroy = destroy,
            .prepare = prepare,
            .process = process,
            .stop = stop,
            .toJsonSpec = toJsonSpec,
            .save = save,
            .load = load,
        },
    );

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

fn destroy(ctx: *anyopaque, allocator: std.mem.Allocator) void {
    const self: *@This() = @ptrCast(@alignCast(ctx));

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

fn prepare(ctx: *anyopaque, allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    const self: *@This() = @ptrCast(@alignCast(ctx));

    if (self.generator_device) |*device| {
        try device.processor.prepare(allocator, spec);
    }

    for (self.effect_device_list.items) |*device| {
        try device.processor.prepare(allocator, spec);
    }

    try self.gain_processor.prepare(allocator, spec);
}

fn process(ctx: *anyopaque, allocator: std.mem.Allocator, audio_view: audio.AudioView, midi_events: []midi.MidiEvent) !void {
    const self: *@This() = @ptrCast(@alignCast(ctx));

    if (self.generator_device) |*device| {
        try device.processor.process(allocator, audio_view, midi_events);
    }

    for (self.effect_device_list.items) |*device| {
        try device.processor.process(allocator, audio_view, midi_events);
    }

    self.gain_processor.setGain(self.gain_param.getValue());
    self.gain_processor.process(audio_view);
}

fn stop(ctx: *anyopaque, allow_tail_off: bool) void {
    const self: *@This() = @ptrCast(@alignCast(ctx));

    if (self.generator_device) |*device| {
        device.processor.stop(allow_tail_off);
    }

    for (self.effect_device_list.items) |*device| {
        device.processor.stop(allow_tail_off);
    }
}

pub fn toJsonSpec(ctx: *anyopaque, write_stream: *std.json.Stringify) !void {
    const self: *@This() = @ptrCast(@alignCast(ctx));

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

pub fn save(ctx: *anyopaque, write_stream: *std.json.Stringify) !void {
    const self: *@This() = @ptrCast(@alignCast(ctx));

    if (self.generator_device) |*device| {
        try write_stream.objectField("generator");
        try device.processor.save(write_stream);
    }

    try write_stream.objectField("effects");
    try write_stream.beginArray();
    for (self.effect_device_list.items) |*device| {
        try device.processor.save(write_stream);
    }
    try write_stream.endArray();
}

pub fn load(ctx: *anyopaque, allocator: std.mem.Allocator, parsed: std.json.ObjectMap) !void {
    const self: *@This() = @ptrCast(@alignCast(ctx));

    if (parsed.getPtr("generator")) |gen| {
        // TODO: This is very wrong. Need to dynamically assign correct type of generator.
        //       Don't forget to deallocate old generator if exists.
        try self.generator_device.?.processor.load(allocator, gen);
    } else if (self.generator_device) |*device| {
        device.deinit(allocator);
        self.generator_device = null;
    }

    for (self.effect_device_list.items) |*device| {
        device.deinit(allocator);
    }
    self.effect_device_list.clearRetainingCapacity();

    const effects_array = try state.json.getFieldArray(parsed, "effects");
    for (effects_array.items) |*value| {
        _ = value;
        // TODO: Dynamically add correct effect device and load.
    }
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
    const allocator = std.testing.allocator;

    var track_processor = try @This().create(allocator);
    var track = &track_processor.processor;
    defer track.destroy(allocator);

    const generator_dummy = try @This().create(allocator);
    track_processor.generator_device = Device.init(&generator_dummy.processor);

    // Stringify
    var out: std.io.Writer.Allocating = .init(allocator);
    defer out.deinit();
    var write_stream: std.json.Stringify = .{
        .writer = &out.writer,
        .options = .{ .whitespace = .indent_2 },
    };

    try track.toJsonSpec(&write_stream);
    // std.debug.print("{s}\n", .{out.written()});

    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"id\": \"trackProcessor\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"parameters\":") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"generator\": {") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"generator\": null") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"effects\": []") != null);
}
