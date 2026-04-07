const std = @import("std");
const audio = @import("framework").audio;
const logging = @import("framework").logging;
const SineSynthInstrument = @import("instruments/SineSynth/SineSynthInstrument.zig");
const TriangleSynthInstrument = @import("instruments/TriangleSynth/TriangleSynthInstrument.zig");
const WavetableSynthInstrument = @import("instruments/WavetableSynth/WavetableSynthInstrument.zig");

pub const Error = std.mem.Allocator.Error || error{InstrumentTypeDoesNotExist};

pub fn processorFromKindIndex(
    allocator: std.mem.Allocator,
    index: usize,
) !*audio.AudioProcessor {
    switch (index) {
        0 => return SineSynthInstrument.create(allocator),
        1 => return TriangleSynthInstrument.create(allocator),
        2 => return WavetableSynthInstrument.create(allocator),

        else => return Error.InstrumentTypeDoesNotExist,
    }
}

pub fn processorFromKindIndexWeb(
    allocator: std.mem.Allocator,
    index: usize,
) ?*audio.AudioProcessor {
    return processorFromKindIndex(allocator, index) catch |err| {
        logging.logDebug(
            "[WASM.addInstrument()] Failed to create audio processor '{}': {}",
            .{ index, err },
        );
        return null;
    };
}

pub fn trackFromInstrumentKindIndex(
    allocator: std.mem.Allocator,
    index: usize,
) !*audio.AudioProcessor {
    const instrument = try processorFromKindIndex(allocator, index);
    const track = try audio.TrackProcessor.create(allocator);

    track.generator_device = audio.TrackProcessor.Device.init(instrument);
    return &track.processor;
}

pub fn trackFromInstrumentKindIndexWeb(
    allocator: std.mem.Allocator,
    index: usize,
) ?*audio.AudioProcessor {
    return trackFromInstrumentKindIndex(allocator, index) catch |err| {
        logging.logDebug(
            "[WASM.instrumentTypeToTrack()] Failed to create instrument track '{}': {}",
            .{ index, err },
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
