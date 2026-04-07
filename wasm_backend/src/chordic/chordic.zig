pub const ProcessorRegistry = @import("processors/ProcessorRegistry.zig");
pub const SerializationContext = @import("state/SerializationContext.zig");

test {
    _ = ProcessorRegistry;
}

test "Creating instrument test" {
    const std = @import("std");
    const audio = @import("framework").audio;
    const processors = @import("processors/processors.zig");

    const allocator = std.testing.allocator;

    var processor_list: std.ArrayList(audio.AudioProcessorWrapper) = .empty;
    defer {
        for (processor_list.items) |*processor| {
            processor.deinit(allocator);
        }
        processor_list.deinit(allocator);
    }

    const instrument1 = audio.AudioProcessorWrapper.init(
        try processors.generators.SineSynth.create(allocator),
    );

    try processor_list.append(allocator, instrument1);

    try processor_list.items[0].prepare(allocator, .{
        .sample_rate = 48000.0,
        .num_channels = 2,
        .block_size = 128,
    });

    processor_list.items[0].stop(true);
}
