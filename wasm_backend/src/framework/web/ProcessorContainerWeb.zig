const std = @import("std");
const audio = @import("../audio/audio.zig");
const AudioProcessorWrapper = @import("../audio/AudioProcessorWrapper.zig");
const AudioProcessor = @import("../audio/AudioProcessor.zig");
const logging = @import("../web/logging.zig");
const state = @import("../state/state.zig");
const wasm_allocator = @import("../mem/allocator.zig").wasm_allocator;

const LoadError = state.json.LoadError;

pub const StopAllFlag = enum { none, stopWithTail, stopImmediately };

processor_list: std.ArrayList(AudioProcessorWrapper) = .empty,
audio_buffer: audio.AudioBuffer = undefined,
process_spec: ?audio.ProcessSpec = null,
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

    self.process_spec = spec;

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

pub fn process(self: *@This(), block_size: usize) bool {
    if (self.stop_all_notes_flag != .none) {
        self.stop(self.stop_all_notes_flag == .stopWithTail);
        self.stop_all_notes_flag = .none;
    }

    self.audio_buffer.clear();
    var output_view = self.audio_buffer.createViewWithLength(block_size);

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

        output_view.addFrom(processor.audio_buffer.createViewWithLength(block_size));
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

pub fn addProcessor(self: *@This(), index: usize, audio_processor: *AudioProcessor) bool {
    var wrapper = AudioProcessorWrapper.init(audio_processor);
    if (self.process_spec) |spec| {
        wrapper.prepare(wasm_allocator, spec) catch |err| {
            logging.logDebug(
                "[ProcessorContainerWeb.addProcessor()] ERROR preparing AudioProcessor '{s}': {}",
                .{ audio_processor.name, err },
            );
            return false;
        };
    }

    self.processor_list.insert(wasm_allocator, index, wrapper) catch |err| {
        logging.logDebug(
            "[ProcessorContainerWeb.addProcessor()] ERROR processing AudioProcessor '{s}': {}",
            .{ audio_processor.name, err },
        );
        return false;
    };

    return true;
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

pub fn getProcessor(self: *@This(), index: usize) *AudioProcessorWrapper {
    return &self.processor_list.items[index];
}

pub fn save(self: *@This(), write_stream: *std.json.Stringify) !void {
    try write_stream.beginObject();

    try write_stream.objectField("processors");
    try write_stream.beginArray();
    for (self.processor_list.items) |*proc| {
        try proc.save(write_stream);
    }
    try write_stream.endArray();

    try write_stream.endObject();
}

pub fn load(self: *@This(), allocator: std.mem.Allocator, parsed: *const std.json.Value) !void {
    if (parsed.* != .object) return LoadError.IncorrectFieldType;
    const object = parsed.object;

    for (self.processor_list.items) |*proc| {
        proc.deinit(allocator);
    }
    self.processor_list.clearRetainingCapacity();

    const processors = try state.json.getFieldArray(object, "processors");
    for (processors.items) |*value| {
        _ = value;
        // TODO: Dynamically add correct effect device and load.
    }
}
