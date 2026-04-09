const std = @import("std");

major: u16 = 0,
minor: u16 = 0,
patch: u16 = 0,
revision: u16 = 0,

pub fn init(major: u16, minor: u16, patch: u16, revision: u16) @This() {
    return .{
        .major = major,
        .minor = minor,
        .patch = patch,
        .revision = revision,
    };
}

pub fn toString(self: @This(), allocator: std.mem.Allocator) std.mem.Allocator.Error![]u8 {
    return std.fmt.allocPrint(
        allocator,
        "{}.{}.{}.{}",
        .{ self.major, self.minor, self.patch, self.revision },
    );
}

pub fn comptimeString(self: @This()) []const u8 {
    return std.fmt.comptimePrint(
        "{}.{}.{}.{}",
        .{ self.major, self.minor, self.patch, self.revision },
    );
}

pub fn parseString(str: []const u8) @This() {
    var version: @This() = .{};
    var it = std.mem.splitScalar(u8, str, '.');

    version.major = parseNext(&it) orelse return version;
    version.minor = parseNext(&it) orelse return version;
    version.patch = parseNext(&it) orelse return version;
    version.revision = parseNext(&it) orelse return version;

    return version;
}

fn parseNext(it: *std.mem.SplitIterator(u8, .scalar)) ?u16 {
    if (it.next()) |str| {
        return std.fmt.parseUnsigned(u16, str, 10) catch return null;
    }
    return null;
}

pub fn order(left: @This(), right: @This()) std.math.Order {
    if (left.major != right.major) return std.math.order(left.major, right.major);
    if (left.minor != right.minor) return std.math.order(left.minor, right.minor);
    if (left.patch != right.patch) return std.math.order(left.patch, right.patch);
    return std.math.order(left.revision, right.revision);
}

pub fn eql(left: @This(), right: @This()) bool {
    return left.order(right) == .eq;
}

pub fn gt(left: @This(), right: @This()) bool {
    return left.order(right) == .gt;
}

pub fn lt(left: @This(), right: @This()) bool {
    return left.order(right) == .lt;
}

pub fn gte(left: @This(), right: @This()) bool {
    const o = left.order(right);
    return o == .gt or o == .eq;
}

pub fn lte(left: @This(), right: @This()) bool {
    const o = left.order(right);
    return o == .lt or o == .eq;
}

test "Comparison" {
    const v1: @This() = .init(1, 2, 3, 4);
    const v2: @This() = .init(2, 1, 3, 4);
    const v3: @This() = .init(1, 2, 2, 4);

    try std.testing.expect(v1.eql(v1) == true);
    try std.testing.expect(v1.gte(v1) == true);
    try std.testing.expect(v1.eql(v2) == false);
    try std.testing.expect(v1.gt(v3) == true);
    try std.testing.expect(v3.lt(v2) == true);
}

test "Parsing" {
    const allocator = std.testing.allocator;

    const v1: @This() = .init(1, 3, 3, 7);
    const str = try v1.toString(allocator);
    defer allocator.free(str);
    try std.testing.expectEqualStrings("1.3.3.7", str);

    const v2: @This() = .parseString(str);
    try std.testing.expect(v1.eql(v2));
}
