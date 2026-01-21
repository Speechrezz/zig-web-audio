const std = @import("std");
const audio = @import("framework").audio;
const SineSynthInstrument = @import("instruments/SineSynth/SineSynthInstrument.zig");
const TriangleSynthInstrument = @import("instruments/TriangleSynth/TriangleSynthInstrument.zig");

pub fn instrumentTypeToProcessor(allocator: std.mem.Allocator, instrument_type: usize) !audio.AudioProcessor {
    switch (instrument_type) {
        0 => return try SineSynthInstrument.create(allocator),
        1 => return try TriangleSynthInstrument.create(allocator),

        else => {},
    }

    return try SineSynthInstrument.create(allocator);
}

test "Registering instrument test" {
    const allocator = std.testing.allocator;

    var processor_list: std.ArrayList(audio.AudioProcessorWrapper) = .empty;
    defer {
        for (processor_list.items) |*processor| {
            processor.deinit(allocator);
        }
        processor_list.deinit(allocator);
    }

    const instrument1 = audio.AudioProcessorWrapper.init(
        try SineSynthInstrument.create(allocator),
    );

    try processor_list.append(allocator, instrument1);

    try processor_list.items[0].prepare(allocator, .{
        .sample_rate = 48000.0,
        .num_channels = 2,
        .block_size = 128,
    });

    processor_list.items[0].stop(true);
}
