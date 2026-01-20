const std = @import("std");
const audio = @import("../audio/audio.zig");
const AudioProcessorWrapper = @import("../audio/AudioProcessorWrapper.zig");
const AudioProcessor = @import("../audio/AudioProcessor.zig");
const logging = @import("../web/logging.zig");
const wasm_allocator = @import("../mem/allocator.zig").wasm_allocator;

pub const StopAllFlag = enum { none, stopWithTail, stopImmediately };

processor_list: std.ArrayList(AudioProcessorWrapper) = .empty,
audio_buffer: audio.AudioBuffer = undefined,
stop_all_notes_flag: StopAllFlag = .none,

pub fn init(self: *@This()) void {
    self.* = .{};
    self.audio_buffer.init();
}

pub fn deinit(self: *@This()) void {
    for (self.processor_list.items) |*processor| {
        processor.deinit(wasm_allocator);
    }
    self.processor_list.deinit(wasm_allocator);

    self.audio_buffer.deinit(wasm_allocator);
}

pub fn prepare(self: *@This(), spec: audio.ProcessSpec) bool {
    logging.logDebug("[ProcessorContainerWeb.prepare()] spec: {}", .{spec});

    self.audio_buffer.resize(
        wasm_allocator,
        spec.num_channels,
        spec.block_size,
    ) catch |err| {
        logging.logDebug("[ProcessorContainerWeb.prepare()] ERROR allocating audio buffer: {}", .{err});
        return false;
    };

    for (self.processor_list.items) |*processor| {
        processor.prepare(wasm_allocator, spec) catch |err| {
            logging.logDebug(
                "[ProcessorContainerWeb.prepare()] ERROR preparing AudioProcessor '{s}': {}",
                .{ processor.audio_processor.name, err },
            );
            return false;
        };
    }

    return true;
}

pub fn process(self: *@This(), block_size: u32) bool {
    if (self.stop_all_notes_flag != .none) {
        self.stop(self.stop_all_notes_flag == .stopWithTail);
        self.stop_all_notes_flag = .none;
    }

    self.audio_buffer.clear();

    for (self.processor_list.items) |*processor| {
        processor.process(
            wasm_allocator,
            block_size,
        ) catch |err| {
            logging.logDebug(
                "[ProcessorContainerWeb.process()] ERROR processing AudioProcessor '{s}': {}",
                .{ processor.audio_processor.name, err },
            );
            return false;
        };
    }

    return true;
}

pub fn sendMidiMessage(self: *@This(), instrument_index: usize, packed_event: u32, sample_position: i64) void {
    const processor = &self.processor_list.items[instrument_index];
    processor.midi_buffer.appendPacked(packed_event, sample_position);
}

pub fn stop(self: *@This(), allow_tail_off: bool) void {
    for (self.processor_list.items) |*processor| {
        processor.stop(allow_tail_off);
    }
}

pub fn onStopMessage(self: *@This(), allow_tail_off: bool) void {
    self.stop_all_notes_flag = if (allow_tail_off) .stopWithTail else .stopImmediately;
}

pub fn addProcessor(self: *@This(), index: usize, audio_processor: AudioProcessor) void {
    self.processor_list.insert(
        wasm_allocator,
        index,
        AudioProcessorWrapper.init(audio_processor),
    ) catch |err| {
        logging.logDebug(
            "[ProcessorContainerWeb.addProcessor()] ERROR processing AudioProcessor '{s}': {}",
            .{ audio_processor.name, err },
        );
        return;
    };
}

pub fn removeProcessor(self: *@This(), index: usize) void {
    var removed = self.processor_list.orderedRemove(index);
    removed.deinit(wasm_allocator);
}

pub fn clearProcessors(self: *@This()) void {
    for (self.processor_list.items) |*processor| {
        processor.deinit(wasm_allocator);
    }
    self.processor_list.clearRetainingCapacity();
}
