const std = @import("std");
const audio = @import("framework").audio;
const logging = @import("framework").logging;
const MidiEvent = @import("framework").MidiEvent;

phase: f32 = 0.0,
radians_coeff: f32 = 0.0,
frequency: f32 = 220.0,

pub fn init(self: *@This()) void {
    self.* = .{};
}

pub fn deinit(self: *@This()) void {
    _ = self; // TODO
}

pub fn prepare(self: *@This(), allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    _ = allocator;

    self.phase = 0.0;

    const sample_rate: f32 = @floatCast(spec.sample_rate);
    self.radians_coeff = 2.0 * std.math.pi / sample_rate;
}

pub fn process(self: *@This(), allocator: std.mem.Allocator, audio_view: audio.AudioView, midi_events: []MidiEvent) !void {
    _ = allocator;
    const gain = 0.15;

    for (midi_events) |midi_event| {
        if (midi_event.isNoteOn()) {
            self.frequency = midi_event.getNoteFreqeuncy();
        }
    }

    const phase_delta = self.frequency * self.radians_coeff;

    for (0..audio_view.getNumSamples()) |i| {
        const sample = @sin(self.phase) * gain;
        self.phase += phase_delta;

        audio_view.getChannel(0)[i] = sample;
        audio_view.getChannel(1)[i] = sample;
    }

    self.phase = @mod(self.phase, 2.0 * std.math.pi);
}
