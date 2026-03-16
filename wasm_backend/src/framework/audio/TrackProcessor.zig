const std = @import("std");
const audio = @import("audio.zig");
const midi = @import("../midi/midi.zig");
const state = @import("../state/state.zig");

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
        },
    );

    self.generator_device = null;
    self.effect_device_list = .empty;

    try self.processor.parameters.reserve(allocator, 1);

    self.gain_param = self.processor.parameters.addAssumeCapacity(.init(
        "gain",
        "Gain",
        .initSkewedCenter(0.0, 1.0, 0.2),
        0.2,
    ));
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
}

fn process(ctx: *anyopaque, allocator: std.mem.Allocator, audio_view: audio.AudioView, midi_events: []midi.MidiEvent) !void {
    const self: *@This() = @ptrCast(@alignCast(ctx));

    if (self.generator_device) |*device| {
        try device.processor.process(allocator, audio_view, midi_events);
    }

    for (self.effect_device_list.items) |*device| {
        try device.processor.process(allocator, audio_view, midi_events);
    }

    audio_view.multiplyBy(self.gain_param.getValue());
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
