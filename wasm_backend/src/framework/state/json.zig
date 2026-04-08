const std = @import("std");

const LoadErrorOnly = error{ MissingField, IncorrectFieldType };
pub const LoadError = LoadErrorOnly || std.mem.Allocator.Error;

pub fn getField(object: std.json.ObjectMap, name: []const u8) LoadErrorOnly!*std.json.Value {
    return object.getPtr(name) orelse LoadErrorOnly.MissingField;
}

pub fn getFieldString(object: std.json.ObjectMap, name: []const u8) LoadErrorOnly![]const u8 {
    const value = try getField(object, name);

    return switch (value.*) {
        .string => |s| s,
        else => LoadErrorOnly.IncorrectFieldType,
    };
}

pub fn getFieldInt(comptime IntType: type, object: std.json.ObjectMap, name: []const u8) LoadErrorOnly!IntType {
    if (@typeInfo(IntType) != .int) {
        @compileError("Expected a runtime integer type");
    }

    const value = try getField(object, name);

    return switch (value.*) {
        .float => |x| @intFromFloat(x),
        .integer => |x| @intCast(x),
        .number_string => |s| std.fmt.parseInt(IntType, s, 10) catch return LoadErrorOnly.IncorrectFieldType,
        else => LoadErrorOnly.IncorrectFieldType,
    };
}

pub fn toFloat(comptime FloatType: type, value: *const std.json.Value) LoadErrorOnly!FloatType {
    return switch (value.*) {
        .float => |x| @floatCast(x),
        .integer => |x| @floatFromInt(x),
        .number_string => |s| std.fmt.parseFloat(FloatType, s) catch return LoadErrorOnly.IncorrectFieldType,
        else => LoadErrorOnly.IncorrectFieldType,
    };
}

pub fn getFieldFloat(comptime FloatType: type, object: std.json.ObjectMap, name: []const u8) LoadErrorOnly!FloatType {
    if (@typeInfo(FloatType) != .float) {
        @compileError("Expected a runtime float type");
    }

    const value = try getField(object, name);
    return toFloat(FloatType, value);
}

pub fn getFieldObject(object: std.json.ObjectMap, name: []const u8) LoadErrorOnly!std.json.ObjectMap {
    const value = try getField(object, name);

    return switch (value.*) {
        .object => |o| o,
        else => LoadErrorOnly.IncorrectFieldType,
    };
}

pub fn getFieldArray(object: std.json.ObjectMap, name: []const u8) LoadErrorOnly!std.json.Array {
    const value = try getField(object, name);

    return switch (value.*) {
        .array => |a| a,
        else => LoadErrorOnly.IncorrectFieldType,
    };
}
