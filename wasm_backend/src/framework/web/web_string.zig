const std = @import("std");
const logging = @import("logging.zig");

pub const WebString = packed struct {
    ptr: [*]u8,
    len: usize,
};

const JsonWriteError = std.json.Stringify.Error;

pub fn returnJsonString(
    allocator: std.mem.Allocator,
    context: anytype,
    comptime toJsonFn: fn (@TypeOf(context), *std.json.Stringify) JsonWriteError!void,
) WebString {
    return returnJsonStringImpl(allocator, context, toJsonFn) catch |err| {
        logging.logDebug("[web_string.returnJsonString] Error creating string: {}", .{err});
        return .{ .ptr = undefined, .len = 0 };
    };
}

fn returnJsonStringImpl(
    allocator: std.mem.Allocator,
    context: anytype,
    comptime toJsonFn: fn (@TypeOf(context), *std.json.Stringify) JsonWriteError!void,
) !WebString {
    var out: std.io.Writer.Allocating = .init(allocator);
    defer out.deinit();
    var write_stream: std.json.Stringify = .{
        .writer = &out.writer,
        .options = .{ .whitespace = .indent_2 },
    };

    try toJsonFn(context, &write_stream);
    const owned_slice = try out.toOwnedSlice();

    return .{
        .ptr = owned_slice.ptr,
        .len = owned_slice.len,
    };
}

pub fn freeWebString(allocator: std.mem.Allocator, web_string: WebString) void {
    const slice = web_string.ptr[0..web_string.len];
    allocator.free(slice);
}

test "returnJsonString" {
    const AudioParameter = @import("../state/AudioParameter.zig");
    const ParameterContainer = @import("../state/ParameterContainer.zig");

    const allocator = std.testing.allocator;

    var container: ParameterContainer = .empty;
    defer container.deinit(allocator);

    _ = try container.add(allocator, AudioParameter.create(
        "test1",
        "Test 1",
        0.0,
        2.0,
        1.0,
    ));

    _ = try container.add(allocator, AudioParameter.create(
        "test2",
        "Test 2",
        10.0,
        20.0,
        12.0,
    ));

    const web_string = try returnJsonStringImpl(
        allocator,
        &container,
        ParameterContainer.toJson,
    );
    defer freeWebString(allocator, web_string);

    const slice = web_string.ptr[0..web_string.len];
    // std.debug.print("{s}\n", .{slice});
    try std.testing.expect(std.mem.indexOf(u8, slice, "\"name\": \"Test 1\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, slice, "\"name\": \"Test 2\"") != null);
}
