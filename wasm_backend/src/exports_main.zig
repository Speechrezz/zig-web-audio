const std = @import("std");
const audio = @import("framework").audio;
const logging = @import("framework").logging;
const math = @import("framework").math;
const web = @import("framework").web;
const wasm_allocator = @import("framework").wasm_allocator;

const enableDebugPrint = true;

// NormalizableRange

const NormalizableRange = math.NormalizableRange(f32);

fn createNormalizableRange() ?*NormalizableRange {
    return wasm_allocator.create(NormalizableRange) catch |err| {
        logging.logDebug("[WASM] createNormalizableRange error: {}", .{err});
        return null;
    };
}

export fn createNormalizableRangeFromJson(ptr: [*]u8, len: usize) ?*NormalizableRange {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] createNormalizableRangeFromJson({}, {})", .{ @intFromPtr(ptr), len });
    }

    const range = createNormalizableRange() orelse return null;

    const slice = ptr[0..len];
    const parsed = std.json.parseFromSlice(std.json.Value, wasm_allocator, slice, .{}) catch |err| {
        logging.logDebug("[WASM] createNormalizableRange error: {}", .{err});
        return null;
    };
    defer parsed.deinit();

    range.load(&parsed.value) catch |err| {
        logging.logDebug("[WASM] createNormalizableRange error: {}", .{err});
        return null;
    };

    return range;
}

export fn createNormalizableRangeLinear(start: f32, end: f32) ?*NormalizableRange {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] createNormalizableRangeLinear({}, {})", .{ start, end });
    }

    const range = createNormalizableRange() orelse return null;
    range.* = NormalizableRange.initLinear(start, end);
    return range;
}

export fn createNormalizableRangeSkewedCenter(start: f32, end: f32, center: f32) ?*NormalizableRange {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] createNormalizableRangeSkewedCenter({}, {}, {})", .{ start, end, center });
    }

    const range = createNormalizableRange() orelse return null;
    range.* = NormalizableRange.initSkewedCenter(start, end, center);
    return range;
}

export fn destroyNormalizableRange(ptr: *NormalizableRange) void {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] destroyNormalizableRange({})", .{@intFromPtr(ptr)});
    }

    wasm_allocator.destroy(ptr);
}

export fn toNormalizedValue(range: *const NormalizableRange, v: f32) f32 {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] toNormalizedValue({}, {})", .{ @intFromPtr(range), v });
    }

    return range.toNormalized(v);
}

export fn fromNormalizedValue(range: *const NormalizableRange, v: f32) f32 {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] fromNormalizedValue({}, {})", .{ @intFromPtr(range), v });
    }

    return range.fromNormalized(v);
}

// General

export fn allocString(len: usize) ?[*]u8 {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] allocString({})", .{len});
    }

    const slice = wasm_allocator.alloc(u8, len) catch |err| {
        logging.logDebug("[WASM] allocString error: {}", .{err});
        return null;
    };

    return slice.ptr;
}

export fn freeString(ptr: [*]u8, len: usize) void {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] freeString({}, {})", .{ @intFromPtr(ptr), len });
    }

    web.string.freeWebString(wasm_allocator, .{
        .ptr = ptr,
        .len = len,
    });
}
