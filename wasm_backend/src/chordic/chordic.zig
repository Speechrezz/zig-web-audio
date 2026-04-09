pub const ChordicProcessor = @import("processors/ChordicProcessor.zig");
pub const core = @import("core/core.zig");
pub const processors = @import("processors/processors.zig");
pub const ProcessorRegistry = @import("processors/ProcessorRegistry.zig");
pub const SerializationContext = @import("state/SerializationContext.zig");

test {
    _ = ChordicProcessor;
    _ = core;
    _ = ProcessorRegistry;
}

test "Creating instrument test" {
    const std = @import("std");
    const audio = @import("framework").audio;

    const allocator = std.testing.allocator;

    var processor_list: std.ArrayList(*audio.AudioProcessor) = .empty;
    defer {
        for (processor_list.items) |processor| {
            processor.destroy(allocator);
        }
        processor_list.deinit(allocator);
    }

    const processor1 = try processors.generators.SineSynth.create(allocator);

    try processor_list.append(allocator, processor1);

    try processor_list.items[0].prepare(allocator, .{
        .sample_rate = 48000.0,
        .num_channels = 2,
        .block_size = 128,
    });

    processor_list.items[0].stop(true);
}
