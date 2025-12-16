const std = @import("std");
const audio = @import("framework").audio;
const logging = @import("framework").logging;
const MidiEvent = @import("framework").MidiEvent;
const SynthProcessor = @import("synth/SynthProcessor.zig");

phase: f32 = 0.0,
radians_coeff: f32 = 0.0,
frequency: f32 = 220.0,
synth_processor: SynthProcessor = undefined,

pub fn init(self: *@This()) void {
    self.* = .{};
    self.synth_processor.init();
}

pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
    self.synth_processor.deinit(allocator);
}

pub fn prepare(self: *@This(), allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    self.phase = 0.0;

    const sample_rate: f32 = @floatCast(spec.sample_rate);
    self.radians_coeff = 2.0 * std.math.pi / sample_rate;

    try self.synth_processor.prepare(allocator, spec);
}

pub fn process(self: *@This(), allocator: std.mem.Allocator, audio_view: audio.AudioView, midi_events: []MidiEvent) !void {
    _ = allocator;

    self.synth_processor.process(audio_view, midi_events);

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

test "AudioProcessor test" {
    const allocator = std.testing.allocator;

    const sample_rate = 48000.0;
    const num_channels = 2;
    const block_size = 128;

    var audio_buffer: audio.AudioBuffer = .empty;
    defer audio_buffer.deinit(allocator);
    try audio_buffer.resize(allocator, num_channels, block_size);

    var audio_processor: @This() = undefined;
    audio_processor.init();
    defer audio_processor.deinit(allocator);

    try audio_processor.prepare(allocator, .{
        .sample_rate = sample_rate,
        .num_channels = num_channels,
        .block_size = block_size,
    });

    const packed_event = 6043280;
    var midi_slice = [_]MidiEvent{.initFromPacked(packed_event, 10)};
    const audio_view = audio_buffer.createViewWithLength(block_size);
    try audio_processor.process(allocator, audio_view, &midi_slice);
}
