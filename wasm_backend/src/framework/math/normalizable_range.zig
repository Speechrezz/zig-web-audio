const std = @import("std");
const state = @import("../state/state.zig");
const LoadError = state.json.LoadError;

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

        pub fn deinit(self: *const @This(), _: std.mem.Allocator) void {
            _ = self;
            // TODO
        }

        pub fn toNormalized(self: *const @This(), v: T) T {
            return self.mapping.toNormalized(self.start, self.end, v);
        }

        pub fn fromNormalized(self: *const @This(), v: T) T {
            return self.mapping.fromNormalized(self.start, self.end, clamp(v));
        }

        // ---Serialization---

        pub fn save(self: *const @This(), write_stream: *std.json.Stringify) !void {
            const active_tag = std.meta.activeTag(self.mapping);

            try write_stream.objectField("type");
            try write_stream.write(@tagName(active_tag));

            try write_stream.objectField("start");
            try write_stream.write(self.start);
            try write_stream.objectField("end");
            try write_stream.write(self.end);

            if (active_tag != .linear) {
                try write_stream.objectField("ctx");
                try write_stream.beginObject();

                switch (self.mapping) {
                    .linear => unreachable,
                    .skewed => |exp| {
                        try write_stream.objectField("exp");
                        try write_stream.write(exp);
                    },
                }

                try write_stream.endObject();
            }
        }

        pub fn load(self: *@This(), _: std.mem.Allocator, json: *const std.json.Value) !void {
            if (json.* != .object) return LoadError.MissingField;

            const type_string = try state.json.getFieldString(json.object, "type");
            const start_float = try state.json.getFieldFloat(T, json.object, "start");
            const end_float = try state.json.getFieldFloat(T, json.object, "end");

            const active_tag = std.meta.stringToEnum(std.meta.Tag(Mapping), type_string) orelse {
                return LoadError.IncorrectFieldType;
            };

            switch (active_tag) {
                .linear => {
                    self.mapping = .linear;
                },
                .skewed => {
                    const ctx_object = try state.json.getFieldObject(json.object, "ctx");
                    const exp_float = try state.json.getFieldFloat(T, ctx_object, "exp");
                    self.mapping = .{ .skewed = exp_float };
                },
            }

            self.start = start_float;
            self.end = end_float;
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

        fn clamp(v: T) T {
            return std.math.clamp(v, 0.0, 1.0);
        }

        // Linear
        fn toNormalizedLinear(start: T, end: T, v: T) T {
            std.debug.assert(end > start);
            return clamp((v - start) / (end - start));
        }
        fn fromNormalizedLinear(start: T, end: T, v: T) T {
            std.debug.assert(end > start);
            return start + (end - start) * v;
        }

        // Skewed
        fn toNormalizedSkewed(start: T, end: T, exp: T, v: T) T {
            std.debug.assert(end > start);
            std.debug.assert(exp > 0.0);

            const proportion = clamp((v - start) / (end - start));
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

test "NormalizableRange linear JSON" {
    const allocator = std.testing.allocator;

    // Serialize range to JSON

    const range = NormalizableRange(f32).initLinear(10.0, 20.0);

    var out: std.io.Writer.Allocating = .init(allocator);
    defer out.deinit();
    var write_stream: std.json.Stringify = .{
        .writer = &out.writer,
        .options = .{ .whitespace = .indent_2 },
    };

    try write_stream.beginObject();
    try range.save(&write_stream);
    try write_stream.endObject();

    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"type\": \"linear\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"start\": 10") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"end\": 20") != null);

    // Parse from JSON back to a range

    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, out.written(), .{});
    defer parsed.deinit();

    var range_load: NormalizableRange(f32) = undefined;
    try range_load.load(allocator, &parsed.value);
    try std.testing.expect(range.mapping == .linear);
    try std.testing.expectApproxEqRel(range.start, range_load.start, 1e-5);
    try std.testing.expectApproxEqRel(range.end, range_load.end, 1e-5);
}

test "NormalizableRange skewed JSON" {
    const allocator = std.testing.allocator;

    // Serialize range to JSON

    const range = NormalizableRange(f32).initSkewedCenter(10.0, 20.0, 12.0);

    var out: std.io.Writer.Allocating = .init(allocator);
    defer out.deinit();
    var write_stream: std.json.Stringify = .{
        .writer = &out.writer,
        .options = .{ .whitespace = .indent_2 },
    };

    try write_stream.beginObject();
    try range.save(&write_stream);
    try write_stream.endObject();

    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"type\": \"skewed\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"ctx\"") != null);

    // Parse from JSON back to a range

    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, out.written(), .{});
    defer parsed.deinit();

    var range_load: NormalizableRange(f32) = undefined;
    try range_load.load(allocator, &parsed.value);
    try std.testing.expect(range_load.mapping == .skewed);
    try std.testing.expectApproxEqRel(range.start, range_load.start, 1e-5);
    try std.testing.expectApproxEqRel(range.end, range_load.end, 1e-5);
    try std.testing.expectApproxEqRel(range.mapping.skewed, range_load.mapping.skewed, 1e-5);
}
