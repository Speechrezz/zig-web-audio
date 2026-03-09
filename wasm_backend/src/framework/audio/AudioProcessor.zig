const std = @import("std");
const audio = @import("audio.zig");
const midi = @import("../midi/midi.zig");
const state = @import("../state/state.zig");

const Error = std.mem.Allocator.Error;

id: []const u8,
name: []const u8,
ptr: *anyopaque,
vtable: *const VTable,

parameters: state.ParameterContainer = .empty,

pub const VTable = struct {
    destroy: *const fn (*anyopaque, std.mem.Allocator) void,
    prepare: *const fn (*anyopaque, std.mem.Allocator, spec: audio.ProcessSpec) Error!void,
    process: *const fn (*anyopaque, std.mem.Allocator, audio_view: audio.AudioView, midi_events: []midi.MidiEvent) Error!void,
    stop: *const fn (*anyopaque, allow_tail_off: bool) void,
};

pub fn init(
    self: *@This(),
    id: []const u8,
    name: []const u8,
    ptr: *anyopaque,
    vtable: *const VTable,
) !void {
    self.* = .{
        .id = id,
        .name = name,
        .ptr = ptr,
        .vtable = vtable,
    };
}

pub fn destroy(self: *@This(), allocator: std.mem.Allocator) void {
    self.parameters.deinit(allocator);
    self.vtable.destroy(self.ptr, allocator);
}

pub fn prepare(self: *@This(), allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    try self.vtable.prepare(self.ptr, allocator, spec);
}

pub fn process(self: *@This(), allocator: std.mem.Allocator, audio_view: audio.AudioView, midi_events: []midi.MidiEvent) !void {
    try self.vtable.process(self.ptr, allocator, audio_view, midi_events);
}

pub fn stop(self: *@This(), allow_tail_off: bool) void {
    self.vtable.stop(self.ptr, allow_tail_off);
}
