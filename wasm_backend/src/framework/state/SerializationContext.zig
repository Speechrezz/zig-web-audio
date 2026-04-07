const std = @import("std");
const audio = @import("../audio/audio.zig");

processor_registry: audio.ProcessorRegistry,

pub fn init(processor_registry: audio.ProcessorRegistry) @This() {
    return .{
        .processor_registry = processor_registry,
    };
}
