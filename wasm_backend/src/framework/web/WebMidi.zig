const std = @import("std");
const MidiEvent = @import("../midi/MidiEvent.zig");
const logging = @import("logging.zig");

events: std.ArrayList(MidiEvent) = .empty,

pub fn init(self: *@This()) void {
    self.* = .{};
}

pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
    self.events.deinit(allocator);
}

pub fn resize(self: *@This(), allocator: std.mem.Allocator, max_size: usize) !void {
    try self.events.ensureTotalCapacity(allocator, max_size);
}

pub fn clear(self: *@This()) void {
    self.events.clearRetainingCapacity();
}

pub fn append(self: *@This(), event: MidiEvent) void {
    self.events.appendAssumeCapacity(event);
}

pub fn appendPacked(self: *@This(), packed_event: u32, sample_position: u64) void {
    const midi_event = MidiEvent.initFromPacked(
        packed_event,
        sample_position,
    );

    logging.logDebug("[WASM] midi_event={}", .{midi_event});

    self.events.appendAssumeCapacity(midi_event);
}
