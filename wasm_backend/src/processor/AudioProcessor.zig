const std = @import("std");
const audio = @import("framework").audio;
const logging = @import("framework").logging;
const MidiEvent = @import("framework").MidiEvent;
const Instrument = @import("instrument/Instrument.zig");
const SineSynthInstrument = @import("instrument/SineSynthInstrument.zig");

instruments: std.ArrayList(Instrument) = .empty,

pub fn init(self: *@This()) void {
    self.* = .{};
}

pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
    for (self.instruments.items) |*instrument| {
        instrument.destroy(allocator);
    }

    self.instruments.deinit(allocator);
}

pub fn prepare(self: *@This(), allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    // TODO: REMOVE ME
    if (self.instruments.items.len == 0) {
        try self.instruments.append(allocator, try SineSynthInstrument.create(allocator));
    }

    for (self.instruments.items) |*instrument| {
        try instrument.prepare(allocator, spec);
    }
}

pub fn process(self: *@This(), allocator: std.mem.Allocator, audio_view: audio.AudioView, midi_events: []MidiEvent) !void {
    for (self.instruments.items) |*instrument| {
        try instrument.process(allocator, audio_view, midi_events);
    }
}

pub fn stopAllNotes(self: *@This(), allow_tail_off: bool) void {
    for (self.instruments.items) |*instrument| {
        instrument.stop(allow_tail_off);
    }
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
