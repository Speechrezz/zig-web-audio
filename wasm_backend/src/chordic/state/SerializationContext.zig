const std = @import("std");
const framework = @import("framework");
const ProcessorRegistry = @import("framework").audio.ProcessorRegistry;
const Version = @import("../core/core.zig").Version;

version: Version = .zero,
registry: ProcessorRegistry,
next_id: u64 = 1,
assign_ids: bool = false,

pub fn init(registry: ProcessorRegistry) @This() {
    return .{
        .registry = registry,
    };
}

pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
    self.registry.destroy(allocator);
}

pub fn getNextId(self: *@This()) u64 {
    self.next_id += 1;
    return self.next_id - 1;
}

pub fn createProcessorFromKind(
    self: *@This(),
    allocator: std.mem.Allocator,
    kind: []const u8,
) !*framework.audio.AudioProcessor {
    const proc = try self.registry.createProcessorFromKind(allocator, kind);

    if (self.assign_ids) {
        proc.id = self.getNextId();
    }

    return proc;
}

pub fn shouldLoadId(self: *const @This()) bool {
    return !self.assign_ids;
}
