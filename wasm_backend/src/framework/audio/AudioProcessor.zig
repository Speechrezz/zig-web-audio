const std = @import("std");
const audio = @import("audio.zig");
const midi = @import("../midi/midi.zig");
const state = @import("../state/state.zig");

const Error = std.mem.Allocator.Error;
const LoadError = state.json.LoadError;

id: []const u8,
name: []const u8,
ptr: *anyopaque,
vtable: *const VTable,

parameters: state.ParameterContainer = .empty,

pub const VTable = struct {
    // --Audio processing--
    destroy: *const fn (*anyopaque, std.mem.Allocator) void,
    prepare: *const fn (*anyopaque, std.mem.Allocator, spec: audio.ProcessSpec) Error!void,
    process: *const fn (*anyopaque, std.mem.Allocator, audio_view: audio.AudioView, midi_events: []midi.MidiEvent) Error!void,
    stop: *const fn (*anyopaque, allow_tail_off: bool) void,

    // --Serialization--
    toJsonSpec: *const fn (*anyopaque, write_stream: *std.json.Stringify) std.io.Writer.Error!void = saveFallback,
    save: *const fn (*anyopaque, write_stream: *std.json.Stringify) std.io.Writer.Error!void = saveFallback,
    load: *const fn (*anyopaque, *const std.json.Value) LoadError!void = loadFallback,

    fn saveFallback(_: *anyopaque, _: *std.json.Stringify) std.io.Writer.Error!void {}
    fn loadFallback(_: *anyopaque, _: *const std.json.Value) LoadError!void {}
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

pub fn toJsonSpec(self: *@This(), write_stream: *std.json.Stringify) !void {
    try write_stream.objectField(self.id);
    try write_stream.beginObject();

    try write_stream.objectField("ptr");
    try write_stream.write(@intFromPtr(self));

    try self.parameters.save(write_stream);
    try self.vtable.toJsonSpec(self, write_stream);

    try write_stream.endObject();
}

pub fn save(self: *@This(), write_stream: *std.json.Stringify) !void {
    try write_stream.objectField(self.id);
    try write_stream.beginObject();

    try self.parameters.save(write_stream);
    try self.vtable.save(self, write_stream);

    try write_stream.endObject();
}

pub fn load(self: *@This(), parsed: *const std.json.Value) void {
    self.vtable.load(parsed);
}
