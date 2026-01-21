const std = @import("std");
const audio = @import("framework").audio;

phase: f32 = 0.0,
radians_coeff: f32 = 0.0,

pub const init: @This() = .{};

pub fn reset(self: *@This()) void {
    self.phase = 0.0;
}

pub fn prepare(self: *@This(), spec: audio.ProcessSpec) void {
    self.phase = 0.0;

    const sample_rate: f32 = @floatCast(spec.sample_rate);
    self.radians_coeff = 1.0 / sample_rate;
}

pub fn process(self: *@This(), audio_view: audio.AudioView, frequency: f32, gain: f32) void {
    const phase_delta = frequency * self.radians_coeff;
    var current_phase: f32 = undefined;

    for (0..audio_view.getNumChannels()) |ch| {
        current_phase = self.phase;
        const channel = audio_view.getChannel(ch);

        for (channel) |*sample| {
            sample.* = phaseToSample(current_phase, gain);

            current_phase += phase_delta;
            if (current_phase >= 1.0) {
                current_phase -= @floor(current_phase);
            }
        }
    }
}

fn phaseToSample(phase: f32, gain: f32) f32 {
    return gain * (1.0 - 4.0 * @abs(phase - 0.5));
}
