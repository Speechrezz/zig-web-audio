const std = @import("std");
const math = @import("../math/math.zig");

id: []const u8,
name: []const u8,

value_min: f32,
value_max: f32,
value_default: f32,

value_normalized: f32, // Normalized 0..1

pub fn init(
    self: *@This(),
    id: []const u8,
    name: []const u8,
    value_min: f32,
    value_max: f32,
    value_default: f32,
) void {
    self.id = id;
    self.name = name;
    self.value_min = value_min;
    self.value_max = value_max;
    self.value_default = value_default;
    self.value_normalized = self.convertToNormalized(value_default);
}

pub fn create(
    id: []const u8,
    name: []const u8,
    value_min: f32,
    value_max: f32,
    value_default: f32,
) @This() {
    var container: @This() = undefined;
    container.init(
        id,
        name,
        value_min,
        value_max,
        value_default,
    );
    return container;
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

pub fn convertToNormalized(self: *const @This(), value: f32) f32 {
    // TODO: Make more flexible

    const clamped = std.math.clamp(value, self.value_min, self.value_max);
    return math.interpolation.invLerp(self.value_min, self.value_max, clamped);
}

pub fn convertFromNormalized(self: *const @This(), normalized: f32) f32 {
    // TODO: Make more flexible

    const value = math.interpolation.lerp(self.value_min, self.value_max, normalized);
    return std.math.clamp(value, self.value_min, self.value_max);
}

pub fn toJson(self: *const @This(), write_stream: *std.json.Stringify, index: usize) !void {
    try write_stream.beginObject();

    try write_stream.objectField("index");
    try write_stream.write(index);

    try write_stream.objectField("id");
    try write_stream.write(self.id);

    try write_stream.objectField("name");
    try write_stream.write(self.name);

    try write_stream.objectField("value_min");
    try write_stream.write(self.value_min);

    try write_stream.objectField("value_max");
    try write_stream.write(self.value_max);

    try write_stream.objectField("value_default");
    try write_stream.write(self.value_default);

    try write_stream.objectField("value_normalized");
    try write_stream.write(self.value_normalized);

    try write_stream.objectField("value");
    try write_stream.write(self.getValue());

    try write_stream.endObject();
}

test "AudioParameter" {
    var param: @This() = undefined;
    param.init("test", "Test", 10.0, 20.0, 12.0);
    try std.testing.expectApproxEqRel(12.0, param.getValue(), 1e-5);

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
