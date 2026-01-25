const std = @import("std");

pub const lerp = std.math.lerp;

pub fn hermite(v0: anytype, v1: anytype, v2: anytype, v3: anytype, t: anytype) @TypeOf(v0, v1, v2, v3, t) {
    const slope0 = (v2 - v0) * 0.5;
    const slope1 = (v3 - v1) * 0.5;
    const v = v1 - v2;
    const w = slope0 + v;
    const a = w + v + slope1;
    const b_neg = w + a;
    const stage1 = a * t - b_neg;
    const stage2 = stage1 * t + slope0;
    return stage2 * t + v1;
}
