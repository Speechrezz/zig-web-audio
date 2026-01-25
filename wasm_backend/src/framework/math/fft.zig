const std = @import("std");

fn reverseBits(x_in: anytype, num_bits: usize) @TypeOf(x_in) {
    var x = x_in;
    var r: @TypeOf(x) = 0;
    for (0..num_bits) |_| {
        r = (r << 1) | (x & 1);
        x >>= 1;
    }
    return r;
}

fn fftInPlaceNoBitReversal(comptime FloatType: type, array: []std.math.Complex(FloatType), inverse: bool) void {
    const Complex = std.math.Complex(FloatType);

    const N = array.len;
    std.debug.assert(std.math.isPowerOfTwo(N));

    // 2. Iterative butterfly
    var m: usize = 2;
    const sign: FloatType = if (inverse) 1.0 else -1.0;
    while (m <= N) : (m *= 2) {
        const half = m / 2;
        const theta = sign * 2.0 * std.math.pi / @as(FloatType, @floatFromInt(m));
        const wm: Complex = .{ .re = @cos(theta), .im = @sin(theta) };

        var k: usize = 0;
        while (k < N) : (k += m) {
            var w: Complex = .{ .re = 1.0, .im = 0.0 };
            for (0..half) |j| {
                const t = w.mul(array[k + j + half]);
                const u = array[k + j];
                array[k + j] = u.add(t);
                array[k + j + half] = u.sub(t);
                w = w.mul(wm);
            }
        }
    }

    // 3. Normalize if inverse
    if (inverse) {
        const invN = 1.0 / @as(FloatType, @floatFromInt(N));
        for (array) |*v| {
            v.re *= invN;
            v.im *= invN;
        }
    }
}

// Uses the Radix-2 Cooley-Tukey algorithm. Not the fastest implementation.
pub fn fftInPlace(comptime FloatType: type, array: []std.math.Complex(FloatType), inverse: bool) void {
    const Complex = std.math.Complex(FloatType);
    const N = array.len;

    // 1. Bit-reversal
    const num_bits = std.math.log2_int(usize, N);
    for (0..N) |i| {
        const j = reverseBits(i, num_bits);
        if (j > i) {
            std.mem.swap(Complex, &array[i], &array[j]);
        }
    }

    fftInPlaceNoBitReversal(FloatType, array, inverse);
}

// Uses the Radix-2 Cooley-Tukey algorithm. Not the fastest implementation.
// Maybe should use the Stockham algorithm instead?
pub fn fftOutOfPlace(
    comptime FloatType: type,
    in: []const std.math.Complex(FloatType),
    out: []std.math.Complex(FloatType),
    inverse: bool,
) void {
    const N = in.len;
    std.debug.assert(in.len == out.len);

    // 1. Bit-reversal
    const num_bits = std.math.log2_int(usize, N);
    for (0..N) |i| {
        const j = reverseBits(i, num_bits);
        out[j] = in[i];
    }

    fftInPlaceNoBitReversal(FloatType, out, inverse);
}

test "FFT in-place test" {
    const Complex = std.math.Complex(f32);

    // FFT of an impulse

    var values1: [32]Complex = undefined;
    values1[0] = .{ .re = 1.0, .im = 0.0 };
    for (values1[1..]) |*v| {
        v.* = .{ .re = 0.0, .im = 0.0 };
    }

    fftInPlace(f32, &values1, false);

    for (values1) |v| {
        try std.testing.expectApproxEqRel(1.0, v.re, 1e-5);
        try std.testing.expectApproxEqAbs(0.0, v.im, 1e-5);
    }

    // FFT of cosine

    var values2 = [_]Complex{
        .{ .re = 1.0, .im = 0.0 },
        .{ .re = 0.0, .im = 0.0 },
        .{ .re = -1.0, .im = 0.0 },
        .{ .re = 0.0, .im = 0.0 },
    };

    fftInPlace(f32, &values2, false);

    for (values2, 0..) |v, i| {
        if (@mod(i, 2) == 0) {
            try std.testing.expectApproxEqAbs(0.0, v.re, 1e-5);
        } else {
            try std.testing.expectApproxEqRel(2.0, v.re, 1e-5);
        }

        try std.testing.expectApproxEqAbs(0.0, v.im, 1e-5);
    }

    // FFT and inverse FFT

    var values3: [32]Complex = undefined;
    var i: f32 = 1.0;
    for (&values3) |*v| {
        v.re = i;
        i += 1.0;
        v.im = i;
        i += 1.0;
    }

    const values3_copy = values3;

    fftInPlace(f32, &values3, false);
    fftInPlace(f32, &values3, true);

    for (values3, values3_copy) |v1, v2| {
        try std.testing.expectApproxEqRel(v1.re, v2.re, 1e-5);
        try std.testing.expectApproxEqRel(v1.im, v2.im, 1e-5);
    }
}

test "FFT out-of-place test" {
    const Complex = std.math.Complex(f32);

    // FFT of an impulse

    var values1: [32]Complex = undefined;
    var values1_out: [32]Complex = undefined;
    values1[0] = .{ .re = 1.0, .im = 0.0 };
    for (values1[1..]) |*v| {
        v.* = .{ .re = 0.0, .im = 0.0 };
    }

    fftOutOfPlace(f32, &values1, &values1_out, false);

    for (values1_out) |v| {
        try std.testing.expectApproxEqRel(1.0, v.re, 1e-5);
        try std.testing.expectApproxEqAbs(0.0, v.im, 1e-5);
    }

    // FFT of cosine

    var values2 = [_]Complex{
        .{ .re = 1.0, .im = 0.0 },
        .{ .re = 0.0, .im = 0.0 },
        .{ .re = -1.0, .im = 0.0 },
        .{ .re = 0.0, .im = 0.0 },
    };
    var values2_out: [4]Complex = undefined;

    fftOutOfPlace(f32, &values2, &values2_out, false);

    for (values2_out, 0..) |v, i| {
        if (@mod(i, 2) == 0) {
            try std.testing.expectApproxEqAbs(0.0, v.re, 1e-5);
        } else {
            try std.testing.expectApproxEqRel(2.0, v.re, 1e-5);
        }

        try std.testing.expectApproxEqAbs(0.0, v.im, 1e-5);
    }

    // FFT and inverse FFT

    var values3: [32]Complex = undefined;
    var values3_fft: [32]Complex = undefined;
    var values3_ifft: [32]Complex = undefined;
    var i: f32 = 1.0;
    for (&values3) |*v| {
        v.re = i;
        i += 1.0;
        v.im = i;
        i += 1.0;
    }

    fftOutOfPlace(f32, &values3, &values3_fft, false);
    fftOutOfPlace(f32, &values3_fft, &values3_ifft, true);

    for (values3, values3_ifft) |v1, v2| {
        try std.testing.expectApproxEqRel(v1.re, v2.re, 1e-5);
        try std.testing.expectApproxEqRel(v1.im, v2.im, 1e-5);
    }
}
