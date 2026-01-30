const std = @import("std");
const audio = @import("../audio/audio.zig");
const midi = @import("../midi/midi.zig");
const AudioProcessor = @import("AudioProcessor.zig");

audio_buffer: audio.AudioBuffer = undefined,
midi_buffer: midi.MidiBuffer = undefined,
audio_processor: *AudioProcessor = undefined,

pub fn init(audio_processor: *AudioProcessor) @This() {
    var new_wrapper: @This() = .{};

    new_wrapper.audio_buffer.init();
    new_wrapper.midi_buffer.init();
    new_wrapper.audio_processor = audio_processor;

    return new_wrapper;
}

pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
    self.audio_buffer.deinit(allocator);
    self.midi_buffer.deinit(allocator);
    self.audio_processor.destroy(allocator);
}

pub fn prepare(self: *@This(), allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    try self.audio_buffer.resize(allocator, spec.num_channels, spec.block_size);
    try self.midi_buffer.resize(allocator, 4 * spec.block_size);
    try self.audio_processor.prepare(allocator, spec);
}

pub fn process(self: *@This(), allocator: std.mem.Allocator, block_size: usize) !void {
    const audio_view = self.audio_buffer.createViewWithLength(block_size);
    const midi_events = self.midi_buffer.getCurrentBlockEvents(block_size);
    try self.audio_processor.process(allocator, audio_view, midi_events);
}

pub fn stop(self: *@This(), allow_tail_off: bool) void {
    self.midi_buffer.clear();
    self.audio_processor.stop(allow_tail_off);
}
