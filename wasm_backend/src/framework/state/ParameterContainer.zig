const std = @import("std");
const AudioParameter = @import("AudioParameter.zig");

list: std.ArrayList(AudioParameter) = .empty,
map: std.StringHashMapUnmanaged(usize) = .empty,

pub fn init(self: *@This()) void {
    self.* = .{};
}

pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
    self.list.deinit(allocator);
    self.map.deinit(allocator);
}

pub fn add(self: *@This(), allocator: std.mem.Allocator, parameter: AudioParameter) !void {
    try self.list.append(allocator, parameter);
    try self.map.put(allocator, parameter.id, self.list.items.len - 1);
}

pub fn getWithId(self: *const @This(), parameter_id: []const u8) ?*AudioParameter {
    const index = self.map.get(parameter_id) orelse return null;
    return self.getWithIndex(index);
}

pub fn getWithIndex(self: *const @This(), index: usize) *AudioParameter {
    return &self.list.items[index];
}

pub fn idToIndex(self: *const @This(), parameter_id: []const u8) ?usize {
    return self.map.get(parameter_id);
}

pub fn toJson(self: *const @This(), write_stream: *std.json.Stringify) !void {
    try write_stream.beginObject();
    for (self.list.items) |param| {
        try write_stream.objectField(param.id);
        try write_stream.write(param);
    }
    try write_stream.endObject();
}

test "ParameterContainer" {
    const allocator = std.testing.allocator;

    var container: @This() = undefined;
    container.init();
    defer container.deinit(allocator);

    try container.add(allocator, AudioParameter.create(
        "test1",
        "Test 1",
        0.0,
        2.0,
        1.0,
    ));

    try container.add(allocator, AudioParameter.create(
        "test2",
        "Test 2",
        10.0,
        20.0,
        12.0,
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

    try container.toJson(&write_stream);
    //std.debug.print("{s}\n", .{out.written()});

    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"name\": \"Test 1\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"name\": \"Test 2\"") != null);
}
