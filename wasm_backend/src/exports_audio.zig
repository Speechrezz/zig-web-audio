const framework = @import("framework");
const audio = framework.audio;
const logging = framework.logging;
const math = framework.math;
const std = @import("std");
const state = framework.state;
const web = framework.web;
const chordic = @import("chordic");
const ProcessorRegistry = chordic.ProcessorRegistry;
const trackFromInstrumentKindIndexLogging = ProcessorRegistry.trackFromInstrumentKindIndexLogging;

const wasm_allocator = @import("framework").wasm_allocator;

const enableDebugPrint = false;

var processor: chordic.ChordicProcessor = undefined;
var serialization_context: chordic.SerializationContext = undefined;

// Audio processing

export fn initAudio() void {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}()", .{@src().fn_name});
    }

    processor.init();
    serialization_context = .init(ProcessorRegistry.createInstance());
}

export fn deinitAudio() void {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}()", .{@src().fn_name});
    }

    processor.deinit(wasm_allocator);
}

export fn prepareAudio(sample_rate: f64, num_channels: usize, block_size: usize) bool {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}()", .{@src().fn_name});
    }

    return processor.prepare(wasm_allocator, .{
        .sample_rate = sample_rate,
        .num_channels = num_channels,
        .block_size = block_size,
    });
}

export fn processAudio(block_size: usize) bool {
    return processor.process(wasm_allocator, block_size);
}

export fn getOutputChannel(channel_index: usize) [*]f32 {
    return processor.audio_buffer.getChannel(channel_index).ptr;
}

// MIDI

export fn sendMidiEvent(track_index: usize, packed_event: u32, sample_position: i64) void {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}(idx={}, ev={}, pos={})", .{ @src().fn_name, track_index, packed_event, sample_position });
    }

    processor.sendMidiMessage(
        track_index,
        packed_event,
        sample_position,
    );
}

export fn stopAllNotes(allow_tail_off: bool) void {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}()", .{@src().fn_name});
    }

    processor.onStopMessage(allow_tail_off);
}

// Global

export fn saveState() u64 {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}()", .{@src().fn_name});
    }

    const web_string = web.string.saveStateToJsonLogging(
        wasm_allocator,
        &processor,
        &serialization_context,
        chordic.ChordicProcessor.save,
    );

    return @bitCast(web_string);
}

// Track

export fn addInstrument(track_index: usize, instrument_type: usize) bool {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}(idx={}, type={})", .{ @src().fn_name, track_index, instrument_type });
    }

    const track = trackFromInstrumentKindIndexLogging(wasm_allocator, instrument_type) orelse return false;
    return processor.insertTrack(wasm_allocator, track_index, track);
}

export fn removeTrack(track_index: usize) void {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}({})", .{ @src().fn_name, track_index });
    }

    processor.removeProcessor(wasm_allocator, track_index);
}

export fn clearTracks() void {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}()", .{@src().fn_name});
    }
    // TODO
}

export fn getTrackSpec(track_index: usize) u64 {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}({})", .{ @src().fn_name, track_index });
    }

    const track = processor.getTrack(track_index);

    const web_string = web.string.toJsonString(
        wasm_allocator,
        track,
        chordic.processors.TrackProcessor.toJsonSpec,
    );

    return @bitCast(web_string);
}

export fn saveTrackState(track_index: usize) u64 {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}({})", .{ @src().fn_name, track_index });
    }

    const track = processor.getTrack(track_index);
    const web_string = web.string.saveStateToJsonLogging(
        wasm_allocator,
        track,
        &serialization_context,
        chordic.processors.TrackProcessor.save,
    );

    return @bitCast(web_string);
}

export fn loadTrackState(track_index: usize, ptr: [*]u8, len: usize) bool {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}({}, {}, {})", .{ @src().fn_name, track_index, @intFromPtr(ptr), len });
    }

    const slice = ptr[0..len];
    const parsed = std.json.parseFromSlice(std.json.Value, wasm_allocator, slice, .{}) catch |err| {
        logging.logDebug("[WASM] {s} error: {}", .{ @src().fn_name, err });
        return false;
    };
    defer parsed.deinit();

    logging.logDebug("[WASM] {s}(): TODO", .{@src().fn_name});

    // const track = processor.getTrack(track_index);
    // track.load(
    //     wasm_allocator,
    //     &serialization_context,
    //     &parsed.value,
    // ) catch |err| {
    //     logging.logDebug("[WASM] {s} error: {}", .{ @src().fn_name, err });
    //     return false;
    // };

    return true;
}

// Parameter

export fn setParameterValueNormalized(audio_processor: *audio.AudioProcessor, parameter_index: usize, value: f32) bool {
    if (enableDebugPrint) {
        logging.logDebug(
            "[WASM] {s}({s}-{}, {}, {})",
            .{ @src().fn_name, audio_processor.kind, @intFromPtr(audio_processor.ptr), parameter_index, value },
        );
    }

    const param = audio_processor.parameters.list.items[parameter_index];
    param.setValueNormalized(value);

    return true;
}

// General

export fn freeString(ptr: [*]u8, len: usize) void {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}({}, {})", .{ @src().fn_name, @intFromPtr(ptr), len });
    }

    web.string.freeWebString(wasm_allocator, .{
        .ptr = ptr,
        .len = len,
    });
}
