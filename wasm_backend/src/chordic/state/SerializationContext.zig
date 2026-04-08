const std = @import("std");
const ProcessorRegistry = @import("framework").audio.ProcessorRegistry;

registry: ProcessorRegistry,

pub fn init(registry: ProcessorRegistry) @This() {
    return .{
        .registry = registry,
    };
}

pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
    self.registry.destroy(allocator);
}
