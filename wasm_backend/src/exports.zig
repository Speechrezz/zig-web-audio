const std = @import("std");
const logging = @import("framework").logging;
const audio = @import("framework").audio;
const AudioProcessorWeb = @import("framework").AudioProcessorWeb;
const AudioProcessor = @import("AudioProcessor");

const wasm_allocator = @import("framework").wasm_allcator;

var audio_processor_web: AudioProcessorWeb(AudioProcessor) = undefined;

// Audio processing

export fn initAudio() void {
    audio_processor_web.init();
}

export fn deinitAudio() void {
    audio_processor_web.deinit();
}

export fn prepareAudio(sample_rate: f64, num_channels: usize, block_size: usize) bool {
    return audio_processor_web.prepare(.{
        .sample_rate = sample_rate,
        .num_channels = num_channels,
        .block_size = block_size,
    });
}

export fn processAudio(block_size: u32) bool {
    return audio_processor_web.process(block_size);
}

export fn getOutputChannel(channel_index: usize) [*]f32 {
    return audio_processor_web.audio_buffer.getChannel(channel_index).ptr;
}

// MIDI

export fn sendMidiEvent(instrument_index: usize, packed_event: u32, sample_position: i64) void {
    _ = instrument_index; // TODO
    return audio_processor_web.midi_buffer.appendPacked(packed_event, sample_position);
}

export fn stopAllNotes(allow_tail_off: bool) void {
    audio_processor_web.onStopAllNotesMessage(allow_tail_off);
}

// Instrument

export fn addInstrument(instrument_index: usize, instrument_type: usize) void {
    logging.logDebug("[WASM] Adding instrument {} at index {}...", .{ instrument_type, instrument_index });
    // TODO
}

export fn removeInstrument(instrument_index: usize) void {
    logging.logDebug("[WASM] Removing instrument at index {}...", .{instrument_index});
    // TODO
}

export fn clearInstruments() void {
    logging.logDebug("[WASM] Clearing all instruments...", .{});
    // TODO
}
