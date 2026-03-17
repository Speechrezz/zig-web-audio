const std = @import("std");
const state = @import("../state/state.zig");
const formatFloatSurround = @import("float.zig").formatFloatSurround;
const parseFloat = @import("float.zig").parseFloat;
const LoadError = state.json.LoadError;

pub fn ValueFormatter(comptime T: type) type {
    if (@typeInfo(T) != .float) {
        @compileError("Expected a runtime float type");
    }

    return struct {
        pub const BasicFormatterOptions = struct {
            scale: T = 1.0,
            prefix: []const u8 = "",
            suffix: []const u8 = "",
        };

        const Formatting = union(enum) {
            basic: BasicFormatterOptions,
            hertz: void,
            seconds: struct { decimals_ms: u8 },
        };

        decimals: u8,
        formatting: Formatting,
        owns_strings: bool = false,

        pub fn initBasic(decimals: u8, options: BasicFormatterOptions, owns_strings: bool) @This() {
            return .{
                .decimals = decimals,
                .formatting = .{ .basic = options },
                .owns_strings = owns_strings,
            };
        }

        pub fn initHertz(decimals: u8) @This() {
            return .{
                .decimals = decimals,
                .formatting = .hertz,
            };
        }

        pub fn initSeconds(decimals_sec: u8, decimals_ms: u8) @This() {
            return .{
                .decimals = decimals_sec,
                .formatting = .{ .seconds = .{ .decimals_ms = decimals_ms } },
            };
        }

        pub fn deinit(self: *const @This(), allocator: std.mem.Allocator) void {
            if (self.owns_strings == false) return;

            switch (self.formatting) {
                .basic => |basic| {
                    allocator.free(basic.suffix);
                },
                else => {},
            }
        }

        pub fn textFromValue(self: *const @This(), allocator: std.mem.Allocator, value: T) ![]u8 {
            return switch (self.formatting) {
                .basic => |options| textFromValueBasic(
                    allocator,
                    value,
                    self.decimals,
                    options,
                ),
                .hertz => textFromValueHertz(
                    allocator,
                    value,
                    self.decimals,
                ),
                .seconds => |options| textFromValueSeconds(
                    allocator,
                    value,
                    self.decimals,
                    options.decimals_ms,
                ),
            };
        }

        pub fn valueFromText(self: *const @This(), text: []const u8) !T {
            return switch (self.formatting) {
                .basic => |options| valueFromTextBasic(text, options),
                .hertz => valueFromTextHertz(text),
                .seconds => valueFromTextSeconds(text),
            };
        }

        // ---Serialization---
        pub fn save(self: *const @This(), write_stream: *std.json.Stringify) !void {
            const active_tag = std.meta.activeTag(self.formatting);

            try write_stream.objectField("type");
            try write_stream.write(@tagName(active_tag));

            try write_stream.objectField("decimals");
            try write_stream.write(self.decimals);

            switch (self.formatting) {
                .basic => |options| {
                    try write_stream.objectField("ctx");
                    try write_stream.beginObject();

                    try write_stream.objectField("scale");
                    try write_stream.write(options.scale);

                    try write_stream.objectField("prefix");
                    try write_stream.write(options.prefix);

                    try write_stream.objectField("suffix");
                    try write_stream.write(options.suffix);

                    try write_stream.endObject();
                },
                .seconds => |options| {
                    try write_stream.objectField("ctx");
                    try write_stream.beginObject();

                    try write_stream.objectField("decimals_ms");
                    try write_stream.write(options.decimals_ms);

                    try write_stream.endObject();
                },
                else => {},
            }
        }

        pub fn load(self: *@This(), allocator: std.mem.Allocator, json: *const std.json.Value) !void {
            if (json.* != .object) return LoadError.MissingField;

            const type_string = try state.json.getFieldString(json.object, "type");
            const decimals = try state.json.getFieldInt(u8, json.object, "decimals");

            const active_tag = std.meta.stringToEnum(std.meta.Tag(Formatting), type_string) orelse {
                return LoadError.IncorrectFieldType;
            };

            switch (active_tag) {
                .basic => {
                    const ctx_object = try state.json.getFieldObject(json.object, "ctx");
                    const scale = try state.json.getFieldFloat(T, ctx_object, "scale");
                    const prefix_json = try state.json.getFieldString(ctx_object, "prefix");
                    const suffix_json = try state.json.getFieldString(ctx_object, "suffix");

                    const prefix = try allocator.dupe(u8, prefix_json);
                    const suffix = try allocator.dupe(u8, suffix_json);

                    self.formatting = .{ .basic = .{
                        .scale = scale,
                        .prefix = prefix,
                        .suffix = suffix,
                    } };

                    self.owns_strings = true;
                },
                .hertz => self.formatting = .hertz,
                .seconds => {
                    const ctx_object = try state.json.getFieldObject(json.object, "ctx");
                    const decimals_ms = try state.json.getFieldInt(u8, ctx_object, "decimals_ms");
                    self.formatting = .{ .seconds = .{ .decimals_ms = decimals_ms } };
                },
            }

            self.decimals = decimals;
        }

        // ---Format functions---

        fn textFromValueBasic(allocator: std.mem.Allocator, value: T, decimals: u8, options: BasicFormatterOptions) ![]u8 {
            return formatFloatSurround(
                allocator,
                options.scale * value,
                decimals,
                options.prefix,
                options.suffix,
            );
        }
        fn valueFromTextBasic(text: []const u8, options: BasicFormatterOptions) !T {
            const parsed = try parseFloat(T, text);
            return parsed / options.scale;
        }

        fn textFromValueHertz(allocator: std.mem.Allocator, value: T, decimals: u8) ![]u8 {
            if (value >= 1000.0) {
                return formatFloatSurround(allocator, 1e-3 * value, decimals, "", " kHz");
            } else {
                return formatFloatSurround(allocator, value, decimals, "", " Hz");
            }
        }
        fn valueFromTextHertz(text: []const u8) !T {
            const kilo_index = std.mem.indexOfAny(u8, text, "Kk");
            if (kilo_index != null) {
                return 1e3 * try parseFloat(T, text);
            } else {
                return parseFloat(T, text);
            }
        }

        fn textFromValueSeconds(allocator: std.mem.Allocator, value: T, decimals_sec: u8, decimals_ms: u8) ![]u8 {
            if (value >= 1.0) {
                return formatFloatSurround(allocator, value, decimals_sec, "", " sec");
            } else {
                return formatFloatSurround(allocator, 1e3 * value, decimals_ms, "", " ms");
            }
        }
        fn valueFromTextSeconds(text: []const u8) !T {
            const ms_index = std.mem.indexOf(u8, text, "ms");
            if (ms_index != null) {
                return 1e-3 * try parseFloat(T, text);
            } else {
                return parseFloat(T, text);
            }
        }
    };
}

test "ValueFormatter basic f32" {
    const allocator = std.testing.allocator;
    const formatter = ValueFormatter(f32).initBasic(
        1,
        .{ .scale = 100.0, .suffix = "%" },
        false,
    );
    defer formatter.deinit(allocator);

    const formatted = try formatter.textFromValue(allocator, 1.0);
    defer allocator.free(formatted);
    try std.testing.expectEqualSlices(u8, "100.0%", formatted);
    try std.testing.expectApproxEqRel(1.0, try formatter.valueFromText(formatted), 1e-5);
}

test "ValueFormatter hertz f32" {
    const allocator = std.testing.allocator;
    const formatter = ValueFormatter(f32).initHertz(2);
    defer formatter.deinit(allocator);

    var formatted = try formatter.textFromValue(allocator, 1234.5);
    try std.testing.expectEqualSlices(u8, "1.23 kHz", formatted);
    try std.testing.expectApproxEqRel(1230.0, try formatter.valueFromText(formatted), 1e-5);
    allocator.free(formatted);

    formatted = try formatter.textFromValue(allocator, 5.678);
    try std.testing.expectEqualSlices(u8, "5.68 Hz", formatted);
    try std.testing.expectApproxEqRel(5.68, try formatter.valueFromText(formatted), 1e-5);
    allocator.free(formatted);
}

test "ValueFormatter seconds f32" {
    const allocator = std.testing.allocator;
    const formatter = ValueFormatter(f32).initSeconds(2, 1);
    defer formatter.deinit(allocator);

    var formatted = try formatter.textFromValue(allocator, 0.12345);
    try std.testing.expectEqualSlices(u8, "123.5 ms", formatted);
    try std.testing.expectApproxEqRel(0.1235, try formatter.valueFromText(formatted), 1e-5);
    allocator.free(formatted);

    formatted = try formatter.textFromValue(allocator, 5.678);
    try std.testing.expectEqualSlices(u8, "5.68 sec", formatted);
    try std.testing.expectApproxEqRel(5.68, try formatter.valueFromText(formatted), 1e-5);
    allocator.free(formatted);
}

test "ValueFormatter basic JSON" {
    const allocator = std.testing.allocator;

    // Serialize formatter to JSON

    const formatter = ValueFormatter(f32).initBasic(
        1,
        .{ .scale = 100.0, .suffix = "%" },
        false,
    );
    defer formatter.deinit(allocator);

    var out: std.io.Writer.Allocating = .init(allocator);
    defer out.deinit();
    var write_stream: std.json.Stringify = .{
        .writer = &out.writer,
        .options = .{ .whitespace = .indent_2 },
    };

    try write_stream.beginObject();
    try formatter.save(&write_stream);
    try write_stream.endObject();

    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"type\": \"basic\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"decimals\": 1") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"scale\": 100") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"suffix\": \"%\"") != null);

    // Parse from JSON back to a formatter

    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, out.written(), .{});
    defer parsed.deinit();

    var formatter_load: ValueFormatter(f32) = undefined;
    try formatter_load.load(allocator, &parsed.value);
    defer formatter_load.deinit(allocator);

    try std.testing.expect(formatter_load.formatting == .basic);
    try std.testing.expectEqual(formatter.decimals, formatter_load.decimals);
    try std.testing.expectApproxEqRel(formatter.formatting.basic.scale, formatter_load.formatting.basic.scale, 1e-5);
    try std.testing.expectEqualSlices(u8, formatter.formatting.basic.prefix, formatter_load.formatting.basic.prefix);
    try std.testing.expectEqualSlices(u8, formatter.formatting.basic.suffix, formatter_load.formatting.basic.suffix);
}

test "ValueFormatter hertz JSON" {
    const allocator = std.testing.allocator;

    // Serialize formatter to JSON

    const formatter = ValueFormatter(f32).initHertz(2);
    defer formatter.deinit(allocator);

    var out: std.io.Writer.Allocating = .init(allocator);
    defer out.deinit();
    var write_stream: std.json.Stringify = .{
        .writer = &out.writer,
        .options = .{ .whitespace = .indent_2 },
    };

    try write_stream.beginObject();
    try formatter.save(&write_stream);
    try write_stream.endObject();

    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"type\": \"hertz\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"decimals\": 2") != null);

    // Parse from JSON back to a formatter

    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, out.written(), .{});
    defer parsed.deinit();

    var formatter_load: ValueFormatter(f32) = undefined;
    try formatter_load.load(allocator, &parsed.value);
    defer formatter_load.deinit(allocator);

    try std.testing.expect(formatter_load.formatting == .hertz);
    try std.testing.expectEqual(formatter.decimals, formatter_load.decimals);
}

test "ValueFormatter seconds JSON" {
    const allocator = std.testing.allocator;

    // Serialize formatter to JSON

    const formatter = ValueFormatter(f32).initSeconds(2, 1);
    defer formatter.deinit(allocator);

    var out: std.io.Writer.Allocating = .init(allocator);
    defer out.deinit();
    var write_stream: std.json.Stringify = .{
        .writer = &out.writer,
        .options = .{ .whitespace = .indent_2 },
    };

    try write_stream.beginObject();
    try formatter.save(&write_stream);
    try write_stream.endObject();

    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"type\": \"seconds\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"decimals\": 2") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"decimals_ms\": 1") != null);

    // Parse from JSON back to a formatter

    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, out.written(), .{});
    defer parsed.deinit();

    var formatter_load: ValueFormatter(f32) = undefined;
    try formatter_load.load(allocator, &parsed.value);
    defer formatter_load.deinit(allocator);

    try std.testing.expect(formatter_load.formatting == .seconds);
    try std.testing.expectEqual(formatter.decimals, formatter_load.decimals);
    try std.testing.expectEqual(formatter.formatting.seconds.decimals_ms, formatter_load.formatting.seconds.decimals_ms);
}
