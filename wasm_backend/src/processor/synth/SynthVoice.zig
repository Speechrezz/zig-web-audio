const std = @import("std");
const audio = @import("framework").audio;

buffer: audio.AudioBuffer = .empty,
// TODO: Osc
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
}

pub fn renderNextBlock(self: *@This(), output_view: audio.AudioView) void {
    if (output_view.getNumSamples() == 0) return;

    const voice_view = self.buffer.createViewWithLength(output_view.getNumSamples());

    // TODO: osc & ADSR process

    output_view.addFrom(voice_view);
}

pub fn startNote(self: *@This(), note_frequency: f32, velocity: f32, pitch_wheel_pos: i32) void {
    _ = pitch_wheel_pos;

    self.frequency = note_frequency;
    self.velocity = velocity;

    // TODO: osc & ADSR

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
