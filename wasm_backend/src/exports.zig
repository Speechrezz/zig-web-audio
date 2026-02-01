const audio = @import("framework").audio;
const logging = @import("framework").logging;
const std = @import("std");
const state = @import("framework").state;
const web = @import("framework").web;
const ProcessorContainerWeb = @import("framework").ProcessorContainerWeb;
const instruments_registry = @import("processor/instrument_registry.zig");
const instrumentTypeToProcessorWeb = instruments_registry.instrumentTypeToProcessorWeb;

const wasm_allocator = @import("framework").wasm_allocator;

var processor_container_web: ProcessorContainerWeb = undefined;

// Audio processing

export fn initAudio() void {
    processor_container_web.init();
}

export fn deinitAudio() void {
    processor_container_web.deinit();
}

export fn prepareAudio(sample_rate: f64, num_channels: usize, block_size: usize) bool {
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

export fn sendMidiEvent(instrument_index: usize, packed_event: u32, sample_position: i64) void {
    processor_container_web.sendMidiMessage(
        instrument_index,
        packed_event,
        sample_position,
    );
}

export fn stopAllNotes(allow_tail_off: bool) void {
    processor_container_web.onStopMessage(allow_tail_off);
}

// Instrument

export fn addInstrument(instrument_index: usize, instrument_type: usize) bool {
    logging.logDebug("[WASM] Adding instrument {} at index {}...", .{ instrument_type, instrument_index });

    const instrument_optional = instrumentTypeToProcessorWeb(
        wasm_allocator,
        instrument_type,
    );

    if (instrument_optional) |instrument| {
        return processor_container_web.addProcessor(instrument_index, instrument);
    }

    return false;
}

export fn removeInstrument(instrument_index: usize) void {
    logging.logDebug("[WASM] Removing instrument at index {}...", .{instrument_index});
    processor_container_web.removeProcessor(instrument_index);
}

export fn clearInstruments() void {
    logging.logDebug("[WASM] Clearing all instruments...", .{});
    // TODO
}

export fn getInstrumentState(instrument_index: usize) u64 {
    const instrument = processor_container_web.getProcessor(instrument_index);
    const web_string = web.string.toJsonString(
        wasm_allocator,
        instrument,
        audio.AudioProcessorWrapper.toJson,
    );
    return @bitCast(web_string);
}

// Parameter

export fn setParameterValue(instrument_index: usize, parameter_index: usize, value: f32) bool {
    const instrument = processor_container_web.getProcessor(instrument_index);
    const param = &instrument.audio_processor.parameters.list.items[parameter_index];

    param.setValue(value);

    return true;
}

export fn setParameterValueNormalized(instrument_index: usize, parameter_index: usize, value: f32) bool {
    const instrument = processor_container_web.getProcessor(instrument_index);
    const param = &instrument.audio_processor.parameters.list.items[parameter_index];

    param.setValueNormalized(value);

    return true;
}

export fn getParameterValue(instrument_index: usize, parameter_index: usize) f32 {
    const instrument = processor_container_web.getProcessor(instrument_index);
    const param = &instrument.audio_processor.parameters.list.items[parameter_index];

    return param.getValue();
}

export fn getParameterValueNormalized(instrument_index: usize, parameter_index: usize) f32 {
    const instrument = processor_container_web.getProcessor(instrument_index);
    const param = &instrument.audio_processor.parameters.list.items[parameter_index];

    return param.getValueNormalized();
}

// General

export fn freeString(ptr: [*]u8, len: usize) void {
    web.string.freeWebString(wasm_allocator, .{
        .ptr = ptr,
        .len = len,
    });
}
