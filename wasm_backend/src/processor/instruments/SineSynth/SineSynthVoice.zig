const std = @import("std");
const audio = @import("framework").audio;
const dsp = @import("framework").dsp;
const SineOscillator = @import("SineOscillator.zig");

buffer: audio.AudioBuffer = .empty,
osc: SineOscillator = .init,
adsr: dsp.AdsrProcessor = .init,
frequency: f32 = 0.0,
velocity: f32 = 1.0,
is_note_on: bool = false,

pub fn init(self: *@This()) void {
    self.* = .{};
}

pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
    self.buffer.deinit(allocator);
}

pub fn prepare(self: *@This(), allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    try self.buffer.resize(allocator, spec.num_channels, spec.block_size);
    self.buffer.clear();

    self.osc.prepare(spec);
    self.adsr.prepare(spec);
    self.adsr.updateParameters(.{});
}

pub fn renderNextBlock(self: *@This(), output_view: audio.AudioView) void {
    if (!self.isCurrentlyPlaying() or output_view.getNumSamples() == 0) return;

    const voice_view = self.buffer.createViewWithLength(output_view.getNumSamples());

    self.osc.process(voice_view, self.frequency, self.velocity);
    self.adsr.process(voice_view);

    output_view.addFrom(voice_view);
}

pub fn startNote(self: *@This(), note_frequency: f32, velocity: f32, _: i32) void {
    self.frequency = note_frequency;
    self.velocity = velocity;

    self.osc.reset();
    self.adsr.noteOn();

    self.is_note_on = true;
}

pub fn stopNote(self: *@This(), _: f32, allow_tail_off: bool) void {
    if (allow_tail_off) {
        self.adsr.noteOff();
    } else {
        self.adsr.reset();
    }

    self.is_note_on = false;
}

pub fn isCurrentlyPlaying(self: @This()) bool {
    return self.adsr.isCurrentlyPlaying();
}

pub fn updateAdsr(self: *@This(), parameters: dsp.AdsrProcessor.Parameters) void {
    self.adsr.updateParameters(parameters);
}
