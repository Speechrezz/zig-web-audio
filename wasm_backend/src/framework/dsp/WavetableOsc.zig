const std = @import("std");
const audio = @import("../audio/audio.zig");
const math = @import("../math/math.zig");

const Complex = std.math.Complex(f32);
const fft = math.fft;
const interpolation = math.interpolation;

const fft_order = 11;
const fft_size = 1 << fft_order; // 2048
const table_padding = 3; // Additional margin for more efficient interpolation

nyquist_frequency: f32 = -1.0,
table_full: [fft_size + table_padding]f32 = undefined,
freq_buffer: [fft_size]Complex = undefined,
time_buffer: [fft_size]Complex = undefined,

pub fn init(self: *@This()) void {
    self.* = .{};
}

pub fn prepare(self: *@This(), spec: audio.ProcessSpec) void {
    self.nyquist_frequency = @floatCast(spec.sample_rate * 0.5);
}

// Call this after inserting new table into oscillator
pub fn analyzeTable(self: *@This()) void {
    const table = self.getTable();
    for (table, &self.freq_buffer) |r, *c| {
        c.* = .{ .re = r, .im = 0.0 };
    }

    fft.fftInPlace(f32, &self.freq_buffer, false);
}

pub fn bandLimitAtFrequency(self: *@This(), frequency: f32) void {
    std.debug.assert(self.nyquist_frequency > 0.0); // Call prepare()

    // Remove harmonics above Nyquist
    const num_harmonics: usize = @intFromFloat(@floor(self.nyquist_frequency / frequency));
    @memcpy(&self.time_buffer, &self.freq_buffer);

    if (num_harmonics <= fft_size) {
        for (self.time_buffer[num_harmonics..]) |*v| {
            v.* = .{ .re = 0.0, .im = 0.0 };
        }
    }

    fft.fftInPlace(f32, &self.time_buffer, true);

    // Complex to real
    const table = self.getTable();
    for (0..self.time_buffer.len) |i| {
        table[i] = self.time_buffer[i].re;
    }

    // Pad the table
    self.table_full[0] = self.table_full[fft_size];
    self.table_full[fft_size + 1] = self.table_full[1];
    self.table_full[fft_size + 2] = self.table_full[2];
}

pub fn getTable(self: *@This()) []f32 {
    return self.table_full[1 .. fft_size + 1];
}

test "Wavetable Oscillator" {
    var osc: @This() = undefined;
    osc.init();
    osc.prepare(.{
        .sample_rate = 48000,
        .num_channels = 2,
        .block_size = 128,
    });

    // Saw wave
    var saw_wave: [fft_size]f32 = undefined;
    const table = osc.getTable();
    try std.testing.expect(table.len == fft_size);

    for (0..fft_size) |i| {
        const portion = @as(f32, @floatFromInt(i)) / @as(f32, @floatFromInt(fft_size - 1)); // 0..1
        const sample = 1.0 - 2.0 * portion;
        saw_wave[i] = sample;
        table[i] = sample;
    }

    osc.analyzeTable();

    // This should not do any band-limiting
    osc.bandLimitAtFrequency(0.1);
    for (saw_wave, table) |v1, v2| {
        try std.testing.expectApproxEqRel(v1 + 2.0, v2 + 2.0, 1e-4);
    }

    // This should do FULL band-limiting (AKA all frequencies are 0)
    osc.bandLimitAtFrequency(40000);

    for (table) |v| {
        try std.testing.expectApproxEqAbs(0.0, v, 1e-5);
    }
}
