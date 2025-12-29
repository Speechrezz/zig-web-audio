const std = @import("std");
const audio = @import("framework").audio;
const logging = @import("framework").logging;
const MidiEvent = @import("framework").MidiEvent;
const SynthProcessor = @import("synth/SynthProcessor.zig");

synth_processor: SynthProcessor = undefined,

pub fn init(self: *@This()) void {
    self.* = .{};
    self.synth_processor.init();
}

pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
    self.synth_processor.deinit(allocator);
}

pub fn prepare(self: *@This(), allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    try self.synth_processor.prepare(allocator, spec);
}

pub fn process(self: *@This(), allocator: std.mem.Allocator, audio_view: audio.AudioView, midi_events: []MidiEvent) !void {
    _ = allocator;

    self.synth_processor.process(audio_view, midi_events);
    audio_view.multiplyBy(0.15); // Reduce volume
}

pub fn stopAllNotes(self: *@This(), allow_tail_off: bool) void {
    self.synth_processor.stopAllNotes(allow_tail_off);
}

test "AudioProcessor tests" {
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
    const audio_view = audio_buffer.createView();
    try audio_processor.process(allocator, audio_view, &midi_slice);
}
