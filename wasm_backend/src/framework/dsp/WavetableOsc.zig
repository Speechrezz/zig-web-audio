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

phase: f32 = 0.0,
phase_coeff: f32 = 0.0,

pub const init: @This() = .{};

pub fn reset(self: *@This()) void {
    self.phase = 0.0;
}

pub fn prepare(self: *@This(), spec: audio.ProcessSpec) void {
    self.nyquist_frequency = @floatCast(spec.sample_rate * 0.5);
    self.phase_coeff = @floatCast(@as(f64, @floatFromInt(fft_size)) / spec.sample_rate);
    self.phase = 0.0;
}

/// Process oscillator.
pub fn processMono(self: *@This(), output: []f32, frequency: f32, gain: f32) void {
    std.debug.assert(self.nyquist_frequency > 0.0); // Call prepare()

    const phase_delta = frequency * self.phase_coeff;
    const phase_limit: f32 = @floatFromInt(fft_size);

    for (output) |*sample| {
        sample.* = self.getInterpolated(self.phase) * gain;
        self.phase = @mod(self.phase + phase_delta, phase_limit);
    }
}

/// Process oscillator. This will duplicate the mono output across all channels.
pub fn process(self: *@This(), output: audio.AudioView, frequency: f32, gain: f32) void {
    if (output.getNumChannels() == 0) return;

    const first_channel = output.getChannel(0);
    self.processMono(first_channel, frequency, gain);

    for (1..output.getNumChannels()) |ch| {
        const channel = output.getChannel(ch);
        @memcpy(channel, first_channel);
    }
}

/// Gets interpolated sample. Be sure to call `prepare()`, `analyzeTable`, and `bandLimitAtFrequency()` first.
pub fn getInterpolated(self: *@This(), index: f32) f32 {
    std.debug.assert(self.nyquist_frequency > 0.0); // Call prepare()
    std.debug.assert(index >= 0.0);
    std.debug.assert(index < @as(f32, @floatFromInt(fft_size)));

    const i: usize = @intFromFloat(index);
    const offset = index - @floor(index);
    return interpolation.hermite(
        self.table_full[i + 0],
        self.table_full[i + 1],
        self.table_full[i + 2],
        self.table_full[i + 3],
        offset,
    );
}

/// Call this after inserting new table into oscillator.
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

pub fn getTable(self: *@This()) *[fft_size]f32 {
    return self.table_full[1 .. fft_size + 1];
}

pub fn fillSawWave(table: []f32) void {
    for (0..table.len) |i| {
        const portion = @as(f32, @floatFromInt(i)) / @as(f32, @floatFromInt(fft_size - 1)); // 0..1
        const sample = 1.0 - 2.0 * portion;
        table[i] = sample;
    }
}

test "Wavetable Oscillator" {
    const allocator = std.testing.allocator;
    const spec: audio.ProcessSpec = .{
        .sample_rate = 48000,
        .num_channels = 2,
        .block_size = 128,
    };

    var osc: @This() = .init;
    osc.prepare(spec);

    // Saw wave
    var saw_wave: [fft_size]f32 = undefined;
    const table = osc.getTable();
    try std.testing.expect(table.len == fft_size);

    fillSawWave(&saw_wave);
    @memcpy(table, &saw_wave);

    osc.analyzeTable();

    // This should do FULL band-limiting (AKA all frequencies are 0)
    osc.bandLimitAtFrequency(40000);
    for (table) |v| {
        try std.testing.expectApproxEqAbs(0.0, v, 1e-5);
    }

    // This should not do any band-limiting
    osc.bandLimitAtFrequency(0.1);
    for (saw_wave, table) |v1, v2| {
        try std.testing.expectApproxEqRel(v1 + 2.0, v2 + 2.0, 1e-5);
    }

    // Check to see if the interpolated sample is between the neighboring samples
    const index = fft_size / 4;
    const index_float = @as(f32, @floatFromInt(index)) + 0.5;
    const sample_interpolated = osc.getInterpolated(index_float);
    try std.testing.expect(table[index] > sample_interpolated);
    try std.testing.expect(table[index + 1] < sample_interpolated);

    // Test processing
    var audio_buffer: audio.AudioBuffer = undefined;
    audio_buffer.init();
    defer audio_buffer.deinit(allocator);

    // Stereo
    try audio_buffer.resize(allocator, spec.num_channels, spec.block_size);
    osc.reset();
    osc.process(audio_buffer.createView(), 440.0, 0.5);

    // Mono
    try audio_buffer.resize(allocator, 1, spec.block_size);
    osc.reset();
    osc.process(audio_buffer.createView(), 440.0, 0.5);
}
