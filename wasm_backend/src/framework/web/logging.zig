const std = @import("std");
const wasm_allocator = @import("../mem/allocator.zig").wasm_allocator;
const externs = @import("externs.zig");

pub fn log(allocator: std.mem.Allocator, comptime fmt: []const u8, args: anytype) !void {
    const string = try std.fmt.allocPrint(allocator, fmt, args);
    defer allocator.free(string);

    externs.consoleLogBinding(string.ptr, string.len);
}

pub fn logDebug(comptime fmt: []const u8, args: anytype) void {
    const string = std.fmt.allocPrint(wasm_allocator, fmt, args) catch unreachable;
    defer wasm_allocator.free(string);

    externs.consoleLogBinding(string.ptr, string.len);
}
