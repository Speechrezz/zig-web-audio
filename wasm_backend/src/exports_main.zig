const std = @import("std");
const audio = @import("framework").audio;
const fmt = @import("framework").fmt;
const logging = @import("framework").logging;
const math = @import("framework").math;
const web = @import("framework").web;
const wasm_allocator = @import("framework").wasm_allocator;

const enableDebugPrint = false;

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

    range.load(wasm_allocator, &parsed.value) catch |err| {
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

// ValueFormatter

const ValueFormatter = fmt.ValueFormatter(f32);

fn createValueFormatter() ?*ValueFormatter {
    return wasm_allocator.create(ValueFormatter) catch |err| {
        logging.logDebug("[WASM] {s} error: {}", .{ @src().fn_name, err });
        return null;
    };
}

export fn createValueFormatterFromJson(ptr: [*]u8, len: usize) ?*ValueFormatter {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}({}, {})", .{ @src().fn_name, @intFromPtr(ptr), len });
    }

    const formatter = createValueFormatter() orelse return null;

    const slice = ptr[0..len];
    const parsed = std.json.parseFromSlice(std.json.Value, wasm_allocator, slice, .{}) catch |err| {
        logging.logDebug("[WASM] {s} error: {}", .{ @src().fn_name, err });
        return null;
    };
    defer parsed.deinit();

    formatter.load(wasm_allocator, &parsed.value) catch |err| {
        logging.logDebug("[WASM] {s} error: {}", .{ @src().fn_name, err });
        return null;
    };

    return formatter;
}

export fn destroyValueFormatter(ptr: *ValueFormatter) void {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}({})", .{ @src().fn_name, @intFromPtr(ptr) });
    }

    wasm_allocator.destroy(ptr);
}

export fn textFromValue(formatter: *const ValueFormatter, value: f32) u64 {
    const text = formatter.textFromValue(wasm_allocator, value) catch |err| {
        logging.logDebug("[WASM] {s} error: {}", .{ @src().fn_name, err });
        return 0;
    };

    return @bitCast(web.string.WebString{ .ptr = text.ptr, .len = text.len });
}

export fn valueFromText(formatter: *const ValueFormatter, ptr: [*]const u8, len: usize) f32 {
    const slice = ptr[0..len];
    return formatter.valueFromText(slice) catch |err| {
        logging.logDebug("[WASM] {s}({s}) error: {}", .{ @src().fn_name, slice, err });
        return std.math.nan(f32);
    };
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
