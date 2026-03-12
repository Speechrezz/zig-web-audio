const audio = @import("framework").audio;
const logging = @import("framework").logging;
const math = @import("framework").math;
const web = @import("framework").web;
const wasm_allocator = @import("framework").wasm_allocator;

// Range

const NormalizableRange = math.NormalizableRange(f32);

export fn createNormalizableRange(ptr: [*]u8, len: usize) ?*NormalizableRange {
    const range = wasm_allocator.create(NormalizableRange) catch |err| {
        logging.logDebug("[WASM] createNormalizableRange error: {}", .{err});
        return null;
    };

    // TODO: Initialize the range by parsing JSON
    _ = ptr;
    _ = len;

    return range;
}

export fn destroyNormalizableRange(ptr: *NormalizableRange) void {
    wasm_allocator.destroy(ptr);
}

export fn toNormalizedValue(range: *const NormalizableRange, v: f32) f32 {
    return range.toNormalized(v);
}

export fn fromNormalizedValue(range: *const NormalizableRange, v: f32) f32 {
    return range.fromNormalized(v);
}

// General

export fn allocString(len: usize) ?[*]u8 {
    const slice = wasm_allocator.alloc(u8, len) catch |err| {
        logging.logDebug("[WASM] allocString error: {}", .{err});
        return null;
    };

    return slice.ptr;
}

export fn freeString(ptr: [*]u8, len: usize) void {
    web.string.freeWebString(wasm_allocator, .{
        .ptr = ptr,
        .len = len,
    });
}
