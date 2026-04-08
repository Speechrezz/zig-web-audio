const std = @import("std");
const fmt = @import("../fmt/fmt.zig");
const math = @import("../math/math.zig");
const state = @import("state.zig");
const ParameterSpec = @import("ParameterSpec.zig");
const LoadError = state.json.LoadError;

const ValueFormatter = fmt.ValueFormatter(f32);
const NormalizableRange = math.NormalizableRange(f32);

id: []const u8,
name: []const u8,
spec: ParameterSpec,

value_default: f32,
value_normalized: f32, // Normalized 0..1

pub fn init(
    id: []const u8,
    name: []const u8,
    range: NormalizableRange,
    value_default: f32,
    formatter: ValueFormatter,
) @This() {
    var parameter: @This() = .{
        .id = id,
        .name = name,
        .spec = .{
            .formatter = formatter,
            .range = range,
        },
        .value_default = value_default,
        .value_normalized = undefined,
    };

    parameter.value_normalized = parameter.convertToNormalized(value_default);
    return parameter;
}

pub fn create(
    allocator: std.mem.Allocator,
    id: []const u8,
    name: []const u8,
    range: NormalizableRange,
    value_default: f32,
    formatter: ValueFormatter,
) !*@This() {
    const parameter = try allocator.create(@This());
    parameter.* = .{
        .id = id,
        .name = name,
        .spec = .{
            .formatter = formatter,
            .range = range,
        },
        .value_default = value_default,
        .value_normalized = undefined,
    };

    parameter.value_normalized = parameter.convertToNormalized(value_default);
    return parameter;
}

pub fn getValue(self: *const @This()) f32 {
    return self.convertFromNormalized(self.value_normalized);
}

pub fn getValueNormalized(self: *const @This()) f32 {
    return self.value_normalized;
}

pub fn setValue(self: *@This(), value: f32) void {
    self.value_normalized = self.convertToNormalized(value);
}

pub fn setValueNormalized(self: *@This(), normalized: f32) void {
    self.value_normalized = normalized;
}

pub fn setToDefault(self: *@This()) void {
    self.setValue(self.value_default);
}

pub fn convertToNormalized(self: *const @This(), value: f32) f32 {
    return self.spec.range.toNormalized(value);
}

pub fn convertFromNormalized(self: *const @This(), normalized: f32) f32 {
    return self.spec.range.fromNormalized(normalized);
}

pub fn toJsonSpec(self: *const @This(), write_stream: *std.json.Stringify, index: usize) !void {
    try write_stream.beginObject();

    try write_stream.objectField("index");
    try write_stream.write(index);

    try write_stream.objectField("id");
    try write_stream.write(self.id);

    try write_stream.objectField("name");
    try write_stream.write(self.name);

    try write_stream.objectField("spec");
    try write_stream.beginObject();
    try self.spec.save(write_stream);
    try write_stream.endObject();

    try write_stream.objectField("value_default");
    try write_stream.write(self.value_default);

    try write_stream.endObject();
}

test "AudioParameter" {
    var param: @This() = .init("test", "Test", .initLinear(10.0, 20.0), 12.0, .init(2));
    try std.testing.expectApproxEqRel(12.0, param.getValue(), 1e-5);
    try std.testing.expectApproxEqRel(0.2, param.getValueNormalized(), 1e-5);

    param.setValue(100.0);
    try std.testing.expectApproxEqRel(20.0, param.getValue(), 1e-5);
    try std.testing.expectApproxEqRel(1.0, param.getValueNormalized(), 1e-5);

    param.setValue(0.0);
    try std.testing.expectApproxEqRel(10.0, param.getValue(), 1e-5);
    try std.testing.expectApproxEqRel(0.0, param.getValueNormalized(), 1e-5);

    param.setValue(15.0);
    try std.testing.expectApproxEqRel(15.0, param.getValue(), 1e-5);
    try std.testing.expectApproxEqRel(0.5, param.getValueNormalized(), 1e-5);
}
