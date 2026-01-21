const std = @import("std");
const audio = @import("framework").audio;
const logging = @import("framework").logging;
const MidiEvent = @import("framework").MidiEvent;
const SynthProcessor = @import("../../synth/synth_processor.zig").SynthProcessor;
const SynthVoice = @import("TriangleSynthVoice.zig");

pub const name = "Sine Synth";

synth_processor: SynthProcessor(SynthVoice) = undefined,

pub fn init(self: *@This()) void {
    self.synth_processor.init();
}

pub fn create(allocator: std.mem.Allocator) !audio.AudioProcessor {
    const self = try allocator.create(@This());
    self.init();
    return self.processor();
}

pub fn processor(self: *@This()) audio.AudioProcessor {
    return .{
        .name = name,
        .ptr = self,
        .vtable = &.{
            .destroy = destroy,
            .prepare = prepare,
            .process = process,
            .stop = stop,
        },
    };
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
    audio_view.multiplyBy(0.15); // Reduce volume
}

fn stop(ctx: *anyopaque, allow_tail_off: bool) void {
    const self: *@This() = @ptrCast(@alignCast(ctx));
    self.synth_processor.stopAllNotes(allow_tail_off);
}
