const std = @import("std");
const audio = @import("../audio/audio.zig");
const math = @import("../math/math.zig");

current: f32 = 0.0,
target: f32 = 0.0,
gain_buffer: std.ArrayList(f32) = .empty,

pub const init: @This() = .{};

pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
    self.gain_buffer.deinit(allocator);
}

pub fn reset(self: *@This()) void {
    self.current = self.target;
}

pub fn prepare(self: *@This(), allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    try self.gain_buffer.resize(allocator, spec.block_size);
}

pub fn process(self: *@This(), audio_view: audio.AudioView) void {
    std.debug.assert(audio_view.num_samples > 0);

    if (self.current == self.target) {
        audio_view.multiplyBy(self.target);
    } else {
        self.fillGainBuffer(audio_view.num_samples);
        audio_view.multiplyByArray(self.gain_buffer.items);
    }
}

pub fn setGain(self: *@This(), gain: f32) void {
    self.target = gain;
}

pub fn setGainDecibels(self: *@This(), dB: f32) void {
    const gain = math.audio.fromDecibels(dB);
    self.setGain(gain);
}

fn fillGainBuffer(self: *@This(), num_samples: usize) void {
    std.debug.assert(num_samples <= self.gain_buffer.items.len);

    const step = (self.target - self.current) / @as(f32, @floatFromInt(num_samples));
    for (0..num_samples - 1) |i| {
        self.current += step;
        self.gain_buffer.items[i] = self.current;
    }

    self.current = self.target;
    self.gain_buffer.items[num_samples - 1] = self.target;
}

test "GainProcessor" {
    const allocator = std.testing.allocator;

    var gain: @This() = .init;
    defer gain.deinit(allocator);
    try gain.prepare(allocator, .{ .block_size = 4, .num_channels = 2, .sample_rate = 48000.0 });

    gain.setGain(1.0);
    gain.reset();
    gain.setGain(2.0);

    gain.fillGainBuffer(4);

    try std.testing.expectApproxEqRel(1.25, gain.gain_buffer.items[0], 1e-5);
    try std.testing.expectApproxEqRel(1.50, gain.gain_buffer.items[1], 1e-5);
    try std.testing.expectApproxEqRel(1.75, gain.gain_buffer.items[2], 1e-5);
    try std.testing.expectApproxEqRel(2.00, gain.gain_buffer.items[3], 1e-5);
}
