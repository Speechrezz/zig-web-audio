const std = @import("std");

const Self = @This();

pub fn noteNumberToFrequency(note_number: i32, frequency_of_a: f32) f32 {
    const normalized_note: f32 = @floatFromInt(note_number - 69);
    return frequency_of_a * std.math.pow(f32, 2.0, normalized_note / 12.0);
}

status: u8,
d1: u8,
d2: u8,
sample_position: i64,

pub fn asByte(v: u32) u8 {
    return @intCast(v & 0xff);
}

pub fn initFromPacked(packed_event: u32, sample_position: i64) @This() {
    return .{
        .status = asByte(packed_event),
        .d1 = asByte(packed_event >> 8),
        .d2 = asByte(packed_event >> 16),
        .sample_position = sample_position,
    };
}

// Note functions

pub fn isNoteOn(self: @This()) bool {
    return self.getCommand() == 0x9;
}

pub fn isNoteOff(self: @This()) bool {
    return self.getCommand() == 0x8;
}

pub fn isNoteOnOrOff(self: @This()) bool {
    return self.isNoteOn() or self.isNoteOff();
}

pub fn getNoteNumber(self: @This()) i32 {
    return @intCast(self.d1);
}

pub fn getNoteFreqeuncy(self: @This()) f32 {
    return self.getNoteFreqeuncyWithA(440.0);
}

pub fn getNoteFreqeuncyWithA(self: @This(), frequency_of_a: f32) f32 {
    return noteNumberToFrequency(self.getNoteNumber(), frequency_of_a);
}

pub fn getVelocity(self: @This()) u32 {
    return @intCast(self.d2);
}

pub fn getVelocityFloat(self: @This()) f32 {
    const velocity_float: f32 = @floatFromInt(self.getVelocity());
    return velocity_float * (1.0 / 127.0);
}

// General functions

pub fn getSamplePosition(self: @This()) i64 {
    return self.sample_position;
}

pub fn getChannel(self: @This()) u8 {
    return (self.status & 0x0f) + 1;
}

fn getCommand(self: @This()) u8 {
    return self.status >> 4;
}

pub fn sortPositionAsc(_: void, a: @This(), b: @This()) bool {
    return a.sample_position < b.sample_position;
}

test "Packed midi event test" {
    const packed_event = 6043280;
    const midi_event = Self.initFromPacked(packed_event, 0);

    try std.testing.expect(midi_event.getNoteNumber() == 54);
    try std.testing.expect(midi_event.isNoteOn());
    try std.testing.expectApproxEqRel(185.0, midi_event.getNoteFreqeuncy(), 0.01);
}
