const std = @import("std");
const audio = @import("framework").audio;
const SineOscillator = @import("SineOscillator.zig");

buffer: audio.AudioBuffer = .empty,
osc: SineOscillator = .init,
frequency: f32 = 0.0,
velocity: f32 = 1.0,
is_note_on: bool = false,

pub const init: @This() = .{};

pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
    self.buffer.deinit(allocator);
}

pub fn prepare(self: *@This(), allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    try self.buffer.resize(allocator, spec.num_channels, spec.block_size);
    self.buffer.clear();

    self.osc.prepare(spec);
}

pub fn renderNextBlock(self: *@This(), output_view: audio.AudioView) void {
    if (!self.isCurrentlyPlaying() or output_view.getNumSamples() == 0) return;

    const voice_view = self.buffer.createViewWithLength(output_view.getNumSamples());

    self.osc.process(voice_view, self.frequency, self.velocity);
    // TODO: ADSR processing

    output_view.addFrom(voice_view);
}

pub fn startNote(self: *@This(), note_frequency: f32, velocity: f32, pitch_wheel_pos: i32) void {
    _ = pitch_wheel_pos;

    self.frequency = note_frequency;
    self.velocity = velocity;

    self.osc.reset();
    // TODO: ADSR

    self.is_note_on = true;
}

pub fn stopNote(self: *@This(), velocity: f32, allow_tail_off: bool) void {
    _ = velocity;
    _ = allow_tail_off;

    // TODO: ADSR
    self.is_note_on = false;
}

pub fn isCurrentlyPlaying(self: @This()) bool {
    // TODO: ADSR
    return self.is_note_on;
}
