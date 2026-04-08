const std = @import("std");
const audio = @import("framework").audio;
const logging = @import("framework").logging;
const processors = @import("processors.zig");

pub const Error = audio.ProcessorRegistry.Error;

fn keyValueFromProcessor(comptime Processor: type) struct { []const u8, @TypeOf(Processor.create) } {
    return .{ Processor.kind, Processor.create };
}

const create_fn_type = @TypeOf(&processors.generators.WavetableSynth.create);
const kindProcessorMap: std.StaticStringMap(create_fn_type) = .initComptime(
    .{
        keyValueFromProcessor(processors.generators.SineSynth),
        keyValueFromProcessor(processors.generators.TriangleSynth),
        keyValueFromProcessor(processors.generators.WavetableSynth),
    },
);

/// Create and populate VTable for `framework.audio.ProcessorRegistry`.
pub fn createInstance() audio.ProcessorRegistry {
    return .{
        .ptr = undefined,
        .vtable = &.{
            .createProcessorFromKind = createProcessorFromKindVTable,
        },
    };
}

pub fn createProcessorFromKind(allocator: std.mem.Allocator, kind: []const u8) !*audio.AudioProcessor {
    const create_fn = kindProcessorMap.get(kind) orelse return Error.ProcessorKindDoesNotExist;
    return create_fn(allocator);
}

fn createProcessorFromKindVTable(_: *anyopaque, allocator: std.mem.Allocator, kind: []const u8) !*audio.AudioProcessor {
    return createProcessorFromKind(allocator, kind);
}

pub fn createProcessorFromKindLogging(allocator: std.mem.Allocator, kind: []const u8) ?*audio.AudioProcessor {
    return createProcessorFromKind(allocator, kind) catch |err| {
        logging.logDebug("[WASM] ERROR in {s}({s}): {}", .{ @src().fn_name, kind, err });
        return null;
    };
}

pub fn processorFromKindIndex(allocator: std.mem.Allocator, index: usize) !*audio.AudioProcessor {
    switch (index) {
        0 => return processors.generators.SineSynth.create(allocator),
        1 => return processors.generators.TriangleSynth.create(allocator),
        2 => return processors.generators.WavetableSynth.create(allocator),

        else => return Error.ProcessorKindDoesNotExist,
    }
}

pub fn processorFromKindIndexLogging(allocator: std.mem.Allocator, index: usize) ?*audio.AudioProcessor {
    return processorFromKindIndex(allocator, index) catch |err| {
        logging.logDebug(
            "[WASM.addInstrument()] Failed to create audio processor '{}': {}",
            .{ index, err },
        );
        return null;
    };
}

pub fn trackFromInstrumentKindIndex(allocator: std.mem.Allocator, index: usize) !*processors.TrackProcessor {
    const instrument = try processorFromKindIndex(allocator, index);
    const track = try processors.TrackProcessor.create(allocator);

    track.generator_device = processors.TrackProcessor.Device.init(instrument);
    return track;
}

pub fn trackFromInstrumentKindIndexLogging(
    allocator: std.mem.Allocator,
    index: usize,
) ?*processors.TrackProcessor {
    return trackFromInstrumentKindIndex(allocator, index) catch |err| {
        logging.logDebug(
            "[WASM.instrumentTypeToTrack()] Failed to create instrument track '{}': {}",
            .{ index, err },
        );
        return null;
    };
}

test {
    const allocator = std.testing.allocator;

    var proc = try createProcessorFromKind(allocator, processors.generators.WavetableSynth.kind);
    defer proc.destroy(allocator);
}
