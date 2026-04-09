const std = @import("std");
const ProcessorRegistry = @import("framework").audio.ProcessorRegistry;
const Version = @import("../core/core.zig").Version;

version: Version = .zero,
registry: ProcessorRegistry,
next_id: u64 = 0,

pub fn init(registry: ProcessorRegistry) @This() {
    return .{
        .registry = registry,
    };
}

pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
    self.registry.destroy(allocator);
}
