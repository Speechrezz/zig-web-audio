const std = @import("std");
const fmt = @import("../fmt/fmt.zig");
const math = @import("../math/math.zig");
const state = @import("../state/state.zig");

const LoadError = state.json.LoadError;

const ValueFormatter = fmt.ValueFormatter(f32);
const NormalizableRange = math.NormalizableRange(f32);

formatter: ValueFormatter,
range: NormalizableRange,

pub fn deinit(self: *const @This(), allocator: std.mem.Allocator) void {
    self.formatter.deinit(allocator);
    self.range.deinit(allocator);
}

pub fn save(self: *const @This(), write_stream: *std.json.Stringify) !void {
    try write_stream.objectField("formatter");
    try write_stream.beginObject();
    try self.formatter.save(write_stream);
    try write_stream.endObject();

    try write_stream.objectField("range");
    try write_stream.beginObject();
    try self.range.save(write_stream);
    try write_stream.endObject();
}

pub fn load(self: *@This(), allocator: std.mem.Allocator, json: *const std.json.Value) !void {
    if (json.* != .object) return LoadError.MissingField;

    const formatter_json = try state.json.getField(json.object, "formatter");
    const range_json = try state.json.getField(json.object, "range");

    try self.formatter.load(allocator, formatter_json);
    try self.range.load(allocator, range_json);
}

test "ParameterSpec" {
    const allocator = std.testing.allocator;

    // Serialize spec to JSON

    var spec: @This() = undefined;
    defer spec.deinit(allocator);

    spec.formatter = .initHertz(2);
    spec.range = .initLinear(10.0, 20.0);

    var out: std.io.Writer.Allocating = .init(allocator);
    defer out.deinit();
    var write_stream: std.json.Stringify = .{
        .writer = &out.writer,
        .options = .{ .whitespace = .indent_2 },
    };

    try write_stream.beginObject();
    try spec.save(&write_stream);
    try write_stream.endObject();

    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"formatter\":") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"range\":") != null);

    // Parse from JSON back to a formatter

    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, out.written(), .{});
    defer parsed.deinit();

    var spec_load: @This() = undefined;
    try spec_load.load(allocator, &parsed.value);
    defer spec_load.deinit(allocator);

    try std.testing.expect(spec_load.formatter.formatting == .hertz);
    try std.testing.expectEqual(spec.formatter.decimals, spec_load.formatter.decimals);

    try std.testing.expect(spec_load.range.mapping == .linear);
    try std.testing.expectApproxEqRel(spec.range.start, spec_load.range.start, 1e-5);
}
