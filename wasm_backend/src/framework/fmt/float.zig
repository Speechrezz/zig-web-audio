const std = @import("std");

pub fn formatFloatSurround(
    allocator: std.mem.Allocator,
    value: anytype,
    decimals: u8,
    prefix: []const u8,
    suffix: []const u8,
) ![]u8 {
    const TypeInfo = @typeInfo(@TypeOf(value));
    if (TypeInfo != .float) {
        @compileError("Expected a runtime float type");
    }

    return switch (decimals) {
        0 => try std.fmt.allocPrint(allocator, "{s}{d:.0}{s}", .{ prefix, value, suffix }),
        1 => try std.fmt.allocPrint(allocator, "{s}{d:.1}{s}", .{ prefix, value, suffix }),
        2 => try std.fmt.allocPrint(allocator, "{s}{d:.2}{s}", .{ prefix, value, suffix }),
        3 => try std.fmt.allocPrint(allocator, "{s}{d:.3}{s}", .{ prefix, value, suffix }),
        4 => try std.fmt.allocPrint(allocator, "{s}{d:.4}{s}", .{ prefix, value, suffix }),
        else => try std.fmt.allocPrint(allocator, "{s}{d:.2}{s}", .{ prefix, value, suffix }),
    };
}

pub fn parseFloat(comptime T: type, text: []const u8) !T {
    const end = std.mem.indexOfNone(u8, text, "0123456789.eE+-") orelse text.len;
    return std.fmt.parseFloat(T, text[0..end]);
}
