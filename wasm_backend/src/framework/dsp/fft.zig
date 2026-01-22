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

// Uses the Radix-2 Cooley-Tukey algorithm. Not the fastest implementation.
pub fn fftInplace(comptime FloatType: type, array: []std.math.Complex(FloatType), inverse: bool) void {
    const Complex = std.math.Complex(FloatType);

    const N = array.len;
    std.debug.assert(std.math.isPowerOfTwo(N));

    // 1. Bit-reversal
    var num_bits: usize = 0;
    var temp = N;
    while (temp > 1) {
        temp >>= 1;
        num_bits += 1;
    }

    for (0..N) |i| {
        const j = reverseBits(i, num_bits);
        if (j > i) {
            std.mem.swap(Complex, &array[i], &array[2]);
        }
    }

    // 2. Iterative butterfly
    var m: usize = 2;
    const sign: FloatType = if (inverse) -1.0 else 1.0;
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
        for (0..N) |i| {
            const v = &array[i];
            v.re /= @floatFromInt(N);
            v.im /= @floatFromInt(N);
        }
    }
}

test "FFT test" {
    const Complex = std.math.Complex(f32);

    // FFT of an impulse

    var values1 = [_]Complex{
        .{ .re = 1.0, .im = 0.0 },
        .{ .re = 0.0, .im = 0.0 },
        .{ .re = 0.0, .im = 0.0 },
        .{ .re = 0.0, .im = 0.0 },
    };

    fftInplace(f32, &values1, false);

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

    fftInplace(f32, &values2, false);

    for (values2, 0..) |v, i| {
        if (@mod(i, 2) == 0) {
            try std.testing.expectApproxEqAbs(0.0, v.re, 1e-5);
        } else {
            try std.testing.expectApproxEqRel(2.0, v.re, 1e-5);
        }

        try std.testing.expectApproxEqAbs(0.0, v.im, 1e-5);
    }

    // FFT and inverse FFT

    var values3: [4]Complex = undefined;
    var i: f32 = 1.0;
    for (&values3) |*v| {
        v.re = i;
        i += 1.0;
        v.im = i;
        i += 1.0;
    }

    const values3_copy = values3;

    fftInplace(f32, &values3, false);
    fftInplace(f32, &values3, true);

    for (values3, values3_copy) |v1, v2| {
        try std.testing.expectApproxEqRel(v1.re, v2.re, 1e-5);
        try std.testing.expectApproxEqRel(v1.im, v2.im, 1e-5);
    }
}
