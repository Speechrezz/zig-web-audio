const std = @import("std");
const audio = @import("framework").audio;
const logging = @import("framework").logging;
const SineSynthInstrument = @import("instruments/SineSynth/SineSynthInstrument.zig");
const TriangleSynthInstrument = @import("instruments/TriangleSynth/TriangleSynthInstrument.zig");
const WavetableSynthInstrument = @import("instruments/WavetableSynth/WavetableSynthInstrument.zig");

pub const Error = std.mem.Allocator.Error || error{InstrumentTypeDoesNotExist};

pub fn instrumentTypeToProcessor(allocator: std.mem.Allocator, instrument_type: usize) !audio.AudioProcessor {
    switch (instrument_type) {
        0 => return try SineSynthInstrument.create(allocator),
        1 => return try TriangleSynthInstrument.create(allocator),
        2 => return try WavetableSynthInstrument.create(allocator),

        else => return Error.InstrumentTypeDoesNotExist,
    }
}

pub fn instrumentTypeToProcessorWeb(allocator: std.mem.Allocator, instrument_type: usize) ?audio.AudioProcessor {
    return instrumentTypeToProcessor(
        allocator,
        instrument_type,
    ) catch |err| {
        logging.logDebug(
            "[WASM.addInstrument()] Failed to create instrument '{}': {}",
            .{ instrument_type, err },
        );
        return null;
    };
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
