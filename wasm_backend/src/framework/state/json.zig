const std = @import("std");

pub const LoadError = error{ MissingField, IncorrectFieldType };

pub fn getField(object: std.json.ObjectMap, name: []const u8) LoadError!*std.json.Value {
    return object.getPtr(name) orelse LoadError.MissingField;
}

pub fn getFieldString(object: std.json.ObjectMap, name: []const u8) LoadError![]const u8 {
    const value = try getField(object, name);

    return switch (value.*) {
        .string => |s| s,
        else => LoadError.IncorrectFieldType,
    };
}

pub fn getFieldFloat(comptime FloatType: type, object: std.json.ObjectMap, name: []const u8) LoadError!FloatType {
    if (@typeInfo(FloatType) != .float) {
        @compileError("Expected a runtime float type");
    }

    const value = try getField(object, name);

    return switch (value.*) {
        .float => |x| @floatCast(x),
        .integer => |x| @floatFromInt(x),
        .number_string => |s| std.fmt.parseFloat(FloatType, s) catch return LoadError.IncorrectFieldType,
        else => LoadError.IncorrectFieldType,
    };
}

pub fn getFieldObject(object: std.json.ObjectMap, name: []const u8) LoadError!std.json.ObjectMap {
    const value = try getField(object, name);

    return switch (value.*) {
        .object => |o| o,
        else => LoadError.IncorrectFieldType,
    };
}
