const std = @import("std");
const AudioProcessor = @import("AudioProcessor.zig");

pub const Error = std.mem.Allocator.Error || error{ProcessorKindDoesNotExist};

ptr: *anyopaque,
vtable: *const VTable,

pub const VTable = struct {
    destroy: *const fn (*anyopaque, std.mem.Allocator) void = destroyFallback,
    createProcessorFromKind: *const fn (*anyopaque, std.mem.Allocator, []const u8) Error!*AudioProcessor,

    fn destroyFallback(_: *anyopaque, _: std.mem.Allocator) void {}
};

pub fn destroy(self: *const @This(), allocator: std.mem.Allocator) void {
    self.vtable.destroy(self.ptr, allocator);
}

pub fn createProcessorFromKind(self: *const @This(), allocator: std.mem.Allocator, kind: []const u8) !*AudioProcessor {
    return self.vtable.createProcessorFromKind(self.ptr, allocator, kind);
}
