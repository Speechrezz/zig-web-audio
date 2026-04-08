const std = @import("std");
const audio = @import("framework").audio;
const logging = @import("framework").logging;
const MidiEvent = @import("framework").MidiEvent;
const SynthProcessor = @import("../../../synth/synth_processor.zig").SynthProcessor;
const SynthVoice = @import("TriangleSynthVoice.zig");

pub const kind = "triangleSynth";
pub const name = "Triangle Synth";

processor: audio.AudioProcessor,
synth_processor: SynthProcessor(SynthVoice),

pub fn init(self: *@This(), allocator: std.mem.Allocator) !void {
    self.processor.init(
        kind,
        name,
        self,
        &.{
            .destroy = destroy,
            .prepare = prepare,
            .process = process,
            .stop = stop,
        },
    );

    _ = allocator;
    self.synth_processor.init();
}

pub fn create(allocator: std.mem.Allocator) !*audio.AudioProcessor {
    const self = try allocator.create(@This());
    try self.init(allocator);
    return &self.processor;
}

fn destroy(ctx: *anyopaque, allocator: std.mem.Allocator) void {
    const self: *@This() = @ptrCast(@alignCast(ctx));

    self.synth_processor.deinit(allocator);
    allocator.destroy(self);
}

fn prepare(ctx: *anyopaque, allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    const self: *@This() = @ptrCast(@alignCast(ctx));
    try self.synth_processor.prepare(allocator, spec);
}

fn process(ctx: *anyopaque, allocator: std.mem.Allocator, audio_view: audio.AudioView, midi_events: []MidiEvent) !void {
    const self: *@This() = @ptrCast(@alignCast(ctx));
    _ = allocator;

    self.synth_processor.process(audio_view, midi_events);
}

fn stop(ctx: *anyopaque, allow_tail_off: bool) void {
    const self: *@This() = @ptrCast(@alignCast(ctx));
    self.synth_processor.stopAllNotes(allow_tail_off);
}
