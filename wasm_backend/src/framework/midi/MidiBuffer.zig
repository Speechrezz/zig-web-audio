const std = @import("std");
const MidiEvent = @import("MidiEvent.zig");
const logging = @import("../web/logging.zig");
const externs = @import("../web/externs.zig");

const Self = @This();

events: std.ArrayList(MidiEvent) = .empty,
read_index: usize = 0,

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
    self.read_index = 0;
    self.events.clearRetainingCapacity();
}

pub fn append(self: *@This(), event: MidiEvent) void {
    self.events.appendAssumeCapacity(event);
}

pub fn appendPacked(self: *@This(), packed_event: u32, sample_position: i64) void {
    const midi_event = MidiEvent.initFromPacked(
        packed_event,
        sample_position,
    );

    self.events.appendAssumeCapacity(midi_event);
}

pub fn getCurrentBlockEvents(self: *@This(), block_size: usize) []MidiEvent {
    return self.getCurrentBlockEventsImpl(
        @intCast(block_size),
        externs.getCurrentFrame(),
    );
}

fn getCurrentBlockEventsImpl(self: *@This(), block_size: i64, current_frame: i64) []MidiEvent {
    // Remove previously read events
    if (self.read_index > 0) {
        const unread_count = self.events.items.len - self.read_index;
        @memmove(self.events.items[0..unread_count], self.events.items[self.read_index..]);
        self.events.items.len = unread_count;
        self.read_index = 0;
    }

    std.sort.block(MidiEvent, self.events.items[self.read_index..], {}, comptime MidiEvent.sortPositionAsc);

    // Figure out which events fall within the current block
    while (self.read_index < self.events.items.len) : (self.read_index += 1) {
        const midi_event = &self.events.items[self.read_index];
        const sample_offset: i64 = @max(@as(i64, 0), midi_event.sample_position - current_frame);

        if (sample_offset >= block_size) break;

        midi_event.sample_position = sample_offset;
    }

    return self.events.items[0..self.read_index];
}

test "Add and read current block midi events" {
    const allocator = std.testing.allocator;
    const block_size = 128;

    var midi_buffer: Self = undefined;
    midi_buffer.init();
    defer midi_buffer.deinit(allocator);
    try midi_buffer.resize(allocator, block_size * 4);

    const packed_event = 6043280;

    midi_buffer.appendPacked(packed_event, 50);
    midi_buffer.appendPacked(packed_event, 0);
    midi_buffer.appendPacked(packed_event, 100);
    midi_buffer.appendPacked(packed_event, 150);
    midi_buffer.appendPacked(packed_event, 200);
    midi_buffer.appendPacked(packed_event, 50);

    const events_block1 = midi_buffer.getCurrentBlockEventsImpl(block_size, 0);
    try std.testing.expect(events_block1.len == 4);
    try std.testing.expect(events_block1[0].sample_position == 0);
    try std.testing.expect(midi_buffer.read_index == 4);
    try std.testing.expect(midi_buffer.events.items.len == 6);

    const events_block2 = midi_buffer.getCurrentBlockEventsImpl(block_size, block_size);
    try std.testing.expect(events_block2.len == 2);
    try std.testing.expect(events_block2[0].sample_position == 22);
    try std.testing.expect(midi_buffer.read_index == 2);
    try std.testing.expect(midi_buffer.events.items.len == 2);

    const events_block3 = midi_buffer.getCurrentBlockEventsImpl(block_size, block_size * 2);
    try std.testing.expect(events_block3.len == 0);
    try std.testing.expect(midi_buffer.read_index == 0);
    try std.testing.expect(midi_buffer.events.items.len == 0);
}
