const audio = @import("framework").audio;
const logging = @import("framework").logging;
const math = @import("framework").math;
const std = @import("std");
const state = @import("framework").state;
const web = @import("framework").web;
const ProcessorContainerWeb = @import("framework").ProcessorContainerWeb;
const processor_registry = @import("processor/processor_registry.zig");
const trackFromInstrumentKindIndexWeb = processor_registry.trackFromInstrumentKindIndexWeb;

const wasm_allocator = @import("framework").wasm_allocator;

const enableDebugPrint = false;

var processor_container_web: ProcessorContainerWeb = undefined;
var processor_context: audio.ProcessorContext = undefined;

// Audio processing

export fn initAudio() void {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}()", .{@src().fn_name});
    }

    processor_container_web.init(&processor_context);
}

export fn deinitAudio() void {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}()", .{@src().fn_name});
    }

    processor_container_web.deinit();
}

export fn prepareAudio(sample_rate: f64, num_channels: usize, block_size: usize) bool {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}()", .{@src().fn_name});
    }

    return processor_container_web.prepare(.{
        .sample_rate = sample_rate,
        .num_channels = num_channels,
        .block_size = block_size,
    });
}

export fn processAudio(block_size: usize) bool {
    return processor_container_web.process(block_size);
}

export fn getOutputChannel(channel_index: usize) [*]f32 {
    return processor_container_web.audio_buffer.getChannel(channel_index).ptr;
}

// MIDI

export fn sendMidiEvent(track_index: usize, packed_event: u32, sample_position: i64) void {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}(idx={}, ev={}, pos={})", .{ @src().fn_name, track_index, packed_event, sample_position });
    }

    processor_container_web.sendMidiMessage(
        track_index,
        packed_event,
        sample_position,
    );
}

export fn stopAllNotes(allow_tail_off: bool) void {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}()", .{@src().fn_name});
    }

    processor_container_web.onStopMessage(allow_tail_off);
}

// Global

export fn saveState() u64 {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}()", .{@src().fn_name});
    }

    const web_string = web.string.toJsonString(
        wasm_allocator,
        &processor_container_web,
        ProcessorContainerWeb.save,
    );

    return @bitCast(web_string);
}

// Track

export fn addInstrument(track_index: usize, instrument_type: usize) bool {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}(idx={}, type={})", .{ @src().fn_name, track_index, instrument_type });
    }

    const track = trackFromInstrumentKindIndexWeb(
        wasm_allocator,
        &processor_context,
        instrument_type,
    );

    if (track == null) return false;
    return processor_container_web.addProcessor(track_index, track.?);
}

export fn removeTrack(track_index: usize) void {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}({})", .{ @src().fn_name, track_index });
    }

    processor_container_web.removeProcessor(track_index);
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

    const track = processor_container_web.getProcessor(track_index).audio_processor;

    const web_string = web.string.toJsonString(
        wasm_allocator,
        track,
        audio.AudioProcessor.toJsonSpec,
    );

    return @bitCast(web_string);
}

export fn saveTrackState(track_index: usize) u64 {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}({})", .{ @src().fn_name, track_index });
    }

    const track = processor_container_web.getProcessor(track_index);
    const web_string = web.string.toJsonString(
        wasm_allocator,
        track,
        audio.AudioProcessorWrapper.save,
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

    const track = processor_container_web.getProcessor(track_index);
    track.load(wasm_allocator, &parsed.value) catch |err| {
        logging.logDebug("[WASM] {s} error: {}", .{ @src().fn_name, err });
        return false;
    };

    return true;
}

// Parameter

export fn setParameterValueNormalized(audio_processor: *audio.AudioProcessor, parameter_index: usize, value: f32) bool {
    if (enableDebugPrint) {
        logging.logDebug("[WASM] {s}({s}-{}, {}, {})", .{ @src().fn_name, audio_processor.id, @intFromPtr(audio_processor.ptr), parameter_index, value });
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
