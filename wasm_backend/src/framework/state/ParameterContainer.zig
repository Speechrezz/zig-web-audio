const std = @import("std");
const AudioParameter = @import("AudioParameter.zig");

list: std.ArrayList(*AudioParameter) = .empty,
map: std.StringHashMapUnmanaged(usize) = .empty,

pub const empty: @This() = .{};

pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
    for (self.list.items) |param| {
        allocator.destroy(param);
    }

    self.list.deinit(allocator);
    self.map.deinit(allocator);
}

pub fn add(self: *@This(), allocator: std.mem.Allocator, parameter: *AudioParameter) !*AudioParameter {
    const index = self.list.items.len;
    try self.list.append(allocator, parameter);
    try self.map.put(allocator, parameter.id, index);
    return self.list.items[index];
}

pub fn getWithId(self: *const @This(), parameter_id: []const u8) ?*AudioParameter {
    const index = self.map.get(parameter_id) orelse return null;
    return self.getWithIndex(index);
}

pub fn getWithIndex(self: *const @This(), index: usize) *AudioParameter {
    return self.list.items[index];
}

pub fn idToIndex(self: *const @This(), parameter_id: []const u8) ?usize {
    return self.map.get(parameter_id);
}

pub fn toJsonSpec(self: *const @This(), write_stream: *std.json.Stringify) !void {
    try write_stream.beginArray();
    for (self.list.items, 0..) |param, i| {
        try param.toJsonSpec(write_stream, i);
    }
    try write_stream.endArray();
}

pub fn save(self: *const @This(), write_stream: *std.json.Stringify) !void {
    try write_stream.beginObject();
    for (self.list.items, 0..) |param, i| {
        try write_stream.objectField(param.id);
        try param.save(write_stream, i);
    }
    try write_stream.endObject();
}

test "ParameterContainer" {
    const allocator = std.testing.allocator;

    var container: @This() = .empty;
    defer container.deinit(allocator);

    _ = try container.add(allocator, try .create(
        allocator,
        "test1",
        "Test 1",
        .initLinear(0.0, 2.0),
        1.0,
        .init(2),
    ));

    _ = try container.add(allocator, try .create(
        allocator,
        "test2",
        "Test 2",
        .initLinear(10.0, 20.0),
        12.0,
        .init(2),
    ));

    const param1 = container.getWithId("test1") orelse unreachable;
    try std.testing.expectEqualStrings("Test 1", param1.name);

    const param2_index = container.idToIndex("test2") orelse unreachable;
    try std.testing.expectEqual(1, param2_index);
    const param2 = container.getWithIndex(param2_index);
    try std.testing.expectEqualStrings("Test 2", param2.name);

    // Stringify
    var out: std.io.Writer.Allocating = .init(allocator);
    defer out.deinit();
    var write_stream: std.json.Stringify = .{
        .writer = &out.writer,
        .options = .{ .whitespace = .indent_2 },
    };

    try container.save(&write_stream);
    // std.debug.print("{s}\n", .{out.written()});

    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"id\": \"test1\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"id\": \"test2\"") != null);
}
