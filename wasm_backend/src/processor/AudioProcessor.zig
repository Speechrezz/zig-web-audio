const std = @import("std");
const audio = @import("framework").audio;
const logging = @import("framework").logging;

phase: f32 = 0.0,
phase_delta: f32 = 0.0,

pub fn init(self: *@This()) void {
    self.* = .{};
}

pub fn deinit(self: *@This()) void {
    _ = self; // TODO
}

pub fn prepare(self: *@This(), allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    _ = allocator;

    self.phase = 0.0;

    const frequency = 220.0;
    const sample_rate: f32 = @floatCast(spec.sample_rate);
    self.phase_delta = frequency * 2.0 * std.math.pi / sample_rate;
}

pub fn process(self: *@This(), allocator: std.mem.Allocator, audio_view: audio.AudioView) !void {
    _ = allocator;
    const gain = 0.2;

    for (0..audio_view.getNumSamples()) |i| {
        const sample = @sin(self.phase) * gain;
        self.phase += self.phase_delta;

        audio_view.getChannel(0)[i] = sample;
        audio_view.getChannel(1)[i] = sample;
    }

    self.phase = @mod(self.phase, 2.0 * std.math.pi);
}
