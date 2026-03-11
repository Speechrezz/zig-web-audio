const std = @import("std");

pub fn NormalizableRange(comptime T: type) type {
    if (@typeInfo(T) != .float) {
        @compileError("Expected a runtime float type");
    }

    return struct {
        start: T,
        end: T,
        mapping: Mapping,

        pub fn initLinear(start: T, end: T) @This() {
            return .{
                .start = start,
                .end = end,
                .mapping = .linear,
            };
        }

        pub fn initSkewed(start: T, end: T, exp: T) @This() {
            std.debug.assert(exp > 0.0);

            return .{
                .start = start,
                .end = end,
                .mapping = .{ .skewed = exp },
            };
        }

        pub fn initSkewedCenter(start: T, end: T, centerPointValue: T) @This() {
            const exp = std.math.log(T, toNormalizedLinear(start, end, centerPointValue), 0.5);
            return @This().initSkewed(start, end, exp);
        }

        pub fn toNormalized(self: *const @This(), v: T) T {
            const normalized = self.mapping.toNormalized(self.start, self.end, v);
            return std.math.clamp(normalized, 0.0, 1.0);
        }

        pub fn fromNormalized(self: *const @This(), v: T) T {
            const clamped = std.math.clamp(v, 0.0, 1.0);
            return self.mapping.fromNormalized(self.start, self.end, clamped);
        }

        // ---Mapping functions---

        const Mapping = union(enum) {
            linear: void,
            skewed: T,

            pub fn toNormalized(self: Mapping, start: T, end: T, v: T) T {
                return switch (self) {
                    .linear => toNormalizedLinear(start, end, v),
                    .skewed => |exp| toNormalizedSkewed(start, end, exp, v),
                };
            }

            pub fn fromNormalized(self: Mapping, start: T, end: T, v: T) T {
                return switch (self) {
                    .linear => fromNormalizedLinear(start, end, v),
                    .skewed => |exp| fromNormalizedSkewed(start, end, exp, v),
                };
            }
        };

        // Linear
        fn toNormalizedLinear(start: T, end: T, v: T) T {
            std.debug.assert(end > start);
            return (v - start) / (end - start);
        }
        fn fromNormalizedLinear(start: T, end: T, v: T) T {
            std.debug.assert(end > start);
            return start + (end - start) * v;
        }

        // Skewed
        fn toNormalizedSkewed(start: T, end: T, exp: T, v: T) T {
            std.debug.assert(end > start);
            std.debug.assert(exp > 0.0);

            const proportion = (v - start) / (end - start);
            return std.math.pow(T, proportion, exp);
        }
        fn fromNormalizedSkewed(start: T, end: T, exp: T, v: T) T {
            std.debug.assert(end > start);
            std.debug.assert(exp > 0.0);

            const proportion = std.math.pow(T, v, 1.0 / exp);
            return start + (end - start) * proportion;
        }
    };
}

test "NormalizableRange f32" {
    // Linear
    var range = NormalizableRange(f32).initLinear(10.0, 20.0);

    try std.testing.expectApproxEqAbs(0.0, range.toNormalized(10.0), 1e-5);
    try std.testing.expectApproxEqRel(10.0, range.fromNormalized(0.0), 1e-5);

    try std.testing.expectApproxEqRel(0.5, range.toNormalized(15.0), 1e-5);
    try std.testing.expectApproxEqRel(15.0, range.fromNormalized(0.5), 1e-5);

    try std.testing.expectApproxEqRel(1.0, range.toNormalized(20.0), 1e-5);
    try std.testing.expectApproxEqRel(20.0, range.fromNormalized(1.0), 1e-5);

    try std.testing.expectApproxEqAbs(0.0, range.toNormalized(5.0), 1e-5);
    try std.testing.expectApproxEqRel(10.0, range.fromNormalized(-1.0), 1e-5);

    try std.testing.expectApproxEqRel(1.0, range.toNormalized(30.0), 1e-5);
    try std.testing.expectApproxEqRel(20.0, range.fromNormalized(2.0), 1e-5);

    // Skewed
    range = NormalizableRange(f32).initSkewedCenter(10.0, 20.0, 12.0);
    var value = range.toNormalized(12.0);
    try std.testing.expectApproxEqRel(0.5, value, 1e-5);
    value = range.fromNormalized(value);
    try std.testing.expectApproxEqRel(12.0, value, 1e-5);

    value = range.toNormalized(15.0);
    value = range.fromNormalized(value);
    try std.testing.expectApproxEqRel(15.0, value, 1e-5);

    try std.testing.expectApproxEqAbs(0.0, range.toNormalized(10.0), 1e-5);
    try std.testing.expectApproxEqRel(10.0, range.fromNormalized(0.0), 1e-5);

    try std.testing.expectApproxEqRel(1.0, range.toNormalized(20.0), 1e-5);
    try std.testing.expectApproxEqRel(20.0, range.fromNormalized(1.0), 1e-5);
}
