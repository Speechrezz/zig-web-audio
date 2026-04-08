const std = @import("std");
const audio = @import("../audio/audio.zig");
const dsp = @import("../dsp/dsp.zig");
const logging = @import("../web/logging.zig");
const MidiEvent = @import("../midi/MidiEvent.zig");
const state = @import("../state/state.zig");

pub const kind = "testProcessor";
pub const name = "Test Processor";

processor: audio.AudioProcessor,

gain_param: *state.AudioParameter,
gain_processor: dsp.GainProcessor,

// Debugging info
is_prepared: bool,

pub fn init(self: *@This(), allocator: std.mem.Allocator) !void {
    self.processor.init(
        kind,
        name,
        self,
        &.{
            .destroy = destroy,
            .prepare = prepare,
            .process = process,
            .stop = stop,
        },
    );

    self.gain_param = try self.processor.parameters.add(allocator, try .create(
        allocator,
        "gain",
        "Gain",
        .initSkewedCenter(0.0, 1.0, 0.2),
        0.2,
        .initBasic(1, .{ .scale = 100.0, .suffix = "%" }),
    ));
    self.gain_processor = .init;

    self.is_prepared = false;
}

pub fn create(allocator: std.mem.Allocator) !*audio.AudioProcessor {
    const self = try allocator.create(@This());
    try self.init(allocator);
    return &self.processor;
}

fn destroy(ctx: *anyopaque, allocator: std.mem.Allocator) void {
    const self: *@This() = @ptrCast(@alignCast(ctx));

    self.gain_processor.deinit(allocator);
    allocator.destroy(self);
}

fn prepare(ctx: *anyopaque, allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    const self: *@This() = @ptrCast(@alignCast(ctx));
    self.is_prepared = true;

    try self.gain_processor.prepare(allocator, spec);
}

fn process(ctx: *anyopaque, allocator: std.mem.Allocator, audio_view: audio.AudioView, midi_events: []MidiEvent) !void {
    const self: *@This() = @ptrCast(@alignCast(ctx));
    _ = allocator;
    _ = midi_events;

    if (!self.is_prepared) {
        @panic("AudioProcessor.process() has been called before prepare()");
    }

    self.gain_processor.setGain(self.gain_param.getValue());
    self.gain_processor.process(audio_view);
}

fn stop(ctx: *anyopaque, allow_tail_off: bool) void {
    const self: *@This() = @ptrCast(@alignCast(ctx));
    _ = self;
    _ = allow_tail_off;
}
