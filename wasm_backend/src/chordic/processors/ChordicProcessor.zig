const std = @import("std");
const framework = @import("framework");
const audio = framework.audio;
const config = @import("../core/core.zig").config;
const TrackProcessor = @import("TrackProcessor.zig");
const LoadError = framework.state.json.LoadError;
const SerializationContext = @import("../state/SerializationContext.zig");

pub const StopAllFlag = enum { none, stopWithTail, stopImmediately };

track_list: std.ArrayList(*TrackProcessor),
audio_buffer: audio.AudioBuffer,
process_spec: ?audio.ProcessSpec,
stop_all_notes_flag: StopAllFlag,

pub fn init(self: *@This()) void {
    self.track_list = .empty;
    self.audio_buffer.init();

    self.process_spec = null;
    self.stop_all_notes_flag = .none;
}

pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
    for (self.track_list.items) |track| {
        track.destroy(allocator);
    }
    self.track_list.deinit(allocator);

    self.audio_buffer.deinit(allocator);
}

pub fn prepare(self: *@This(), allocator: std.mem.Allocator, spec: audio.ProcessSpec) bool {
    self.process_spec = spec;

    self.audio_buffer.resize(
        allocator,
        spec.num_channels,
        spec.block_size,
    ) catch |err| {
        framework.logging.logDebug(
            "[WASM] Error in {s}(): Unable to allocate audio buffer, {}",
            .{ @src().fn_name, err },
        );
        return false;
    };

    for (self.track_list.items) |track| {
        track.prepare(allocator, spec) catch |err| {
            framework.logging.logDebug(
                "[WASM] Error in {s}(): Unable to prepare track, {}",
                .{ @src().fn_name, err },
            );
            return false;
        };
    }

    return true;
}

pub fn process(self: *@This(), allocator: std.mem.Allocator, block_size: usize) bool {
    if (self.stop_all_notes_flag != .none) {
        self.stop(self.stop_all_notes_flag == .stopWithTail);
        self.stop_all_notes_flag = .none;
    }

    self.audio_buffer.clear();
    var output_view = self.audio_buffer.createViewWithLength(block_size);

    for (self.track_list.items) |track| {
        track.process(allocator, block_size) catch |err| {
            framework.logging.logDebug(
                "[WASM] Error in {s}(): Unable to process track, {}",
                .{ @src().fn_name, err },
            );
            return false;
        };
        output_view.addFrom(track.audio_buffer.createViewWithLength(block_size));
    }

    return true;
}

pub fn sendMidiMessage(self: *@This(), track_index: usize, packed_event: u32, sample_position: i64) void {
    const track = self.track_list.items[track_index];
    track.midi_buffer.appendPacked(packed_event, sample_position);
}

pub fn stop(self: *@This(), allow_tail_off: bool) void {
    for (self.track_list.items) |track| {
        track.stop(allow_tail_off);
    }
}

pub fn onStopMessage(self: *@This(), allow_tail_off: bool) void {
    self.stop_all_notes_flag = if (allow_tail_off) .stopWithTail else .stopImmediately;
}

pub fn insertTrack(self: *@This(), allocator: std.mem.Allocator, index: usize, track: *TrackProcessor) bool {
    if (self.process_spec) |spec| {
        track.prepare(allocator, spec) catch |err| {
            framework.logging.logDebug(
                "[WASM] Error in {s}(): Unable to prepare track, {}",
                .{ @src().fn_name, err },
            );
            return false;
        };
    }

    self.track_list.insert(allocator, index, track) catch |err| {
        framework.logging.logDebug(
            "[WASM] Error in {s}(): Unable to insert track, {}",
            .{ @src().fn_name, err },
        );
        return false;
    };

    return true;
}

pub fn removeProcessor(self: *@This(), allocator: std.mem.Allocator, index: usize) void {
    var removed = self.track_list.orderedRemove(index);
    removed.destroy(allocator);
}

pub fn clearProcessors(self: *@This(), allocator: std.mem.Allocator) void {
    for (self.track_list.items) |track| {
        track.destroy(allocator);
    }
    self.track_list.clearRetainingCapacity();
}

pub fn getTrack(self: *@This(), index: usize) *TrackProcessor {
    return self.track_list.items[index];
}

pub fn toJsonSpec(self: *@This(), write_stream: *std.json.Stringify) !void {
    try write_stream.beginObject();

    try write_stream.objectField("tracks");
    try write_stream.beginArray();
    for (self.track_list.items) |track| {
        try track.toJsonSpec(write_stream);
    }
    try write_stream.endArray();

    try write_stream.endObject();
}

pub fn save(self: *@This(), ctx: *const anyopaque, write_stream: *std.json.Stringify) !void {
    const context: *const SerializationContext = @ptrCast(@alignCast(ctx));

    try write_stream.beginObject();

    try write_stream.objectField("version");
    try write_stream.write(config.version_str);

    try write_stream.objectField("next_id");
    try write_stream.write(context.next_id);

    try write_stream.objectField("tracks");
    try write_stream.beginArray();
    for (self.track_list.items) |track| {
        try track.save(ctx, write_stream);
    }
    try write_stream.endArray();

    try write_stream.endObject();
}

pub fn load(self: *@This(), allocator: std.mem.Allocator, ctx: *anyopaque, parsed: *const std.json.Value) !void {
    const context: *SerializationContext = @ptrCast(@alignCast(ctx));

    if (parsed.* != .object) return LoadError.IncorrectFieldType;
    const object = parsed.object;

    // --Global state--

    const version_string = try framework.state.json.getFieldString(object, "version");
    context.version = .parseString(version_string);
    context.next_id = try framework.state.json.getFieldInt(u64, object, "next_id");

    // --Track state--

    for (self.track_list.items) |proc| {
        proc.destroy(allocator);
    }
    self.track_list.clearRetainingCapacity();

    const tracks = try framework.state.json.getFieldArray(object, "tracks");
    for (tracks.items) |*track_json| {
        const track = try TrackProcessor.create(allocator);
        errdefer track.destroy(allocator);

        if (context.assign_ids) {
            track.processor.id = context.getNextId();
        }
        try track.load(allocator, ctx, track_json);
        try self.track_list.append(allocator, track);
    }
}

test "toJsonSpec" {
    const TestingAudioProcessor = framework.testing.TestingAudioProcessor;

    const allocator = std.testing.allocator;

    var track = try TrackProcessor.create(allocator);
    const generator = try TestingAudioProcessor.create(allocator);
    track.generator_device = TrackProcessor.Device.init(generator);

    var processor: @This() = undefined;
    processor.init();
    defer processor.deinit(allocator);
    try std.testing.expect(processor.insertTrack(allocator, 0, track));

    // Stringify
    var out: std.io.Writer.Allocating = .init(allocator);
    defer out.deinit();
    var write_stream: std.json.Stringify = .{
        .writer = &out.writer,
        .options = .{ .whitespace = .indent_2 },
    };

    try processor.toJsonSpec(&write_stream);
    // std.debug.print("{s}\n", .{out.written()});

    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"tracks\":") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"kind\": \"track\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"kind\": \"testProcessor\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"parameters\":") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"generator\": {") != null);
    try std.testing.expect(std.mem.indexOf(u8, out.written(), "\"effects\": []") != null);
}

test "save/load" {
    const TestingAudioProcessor = framework.testing.TestingAudioProcessor;
    const TestingProcessorRegistry = framework.testing.TestingProcessorRegistry;

    const allocator = std.testing.allocator;
    var context = SerializationContext.init(TestingProcessorRegistry.createInstance());
    defer context.deinit(allocator);

    // --Saving--

    var track1 = try TrackProcessor.create(allocator);
    const generator_dummy = try TestingAudioProcessor.create(allocator);
    track1.generator_device = TrackProcessor.Device.init(generator_dummy);

    var processor1: @This() = undefined;
    processor1.init();
    defer processor1.deinit(allocator);
    try std.testing.expect(processor1.insertTrack(allocator, 0, track1));

    // Stringify
    var out1: std.io.Writer.Allocating = .init(allocator);
    defer out1.deinit();
    var write_stream1: std.json.Stringify = .{
        .writer = &out1.writer,
        .options = .{ .whitespace = .indent_2 },
    };

    try processor1.save(&context, &write_stream1);
    // std.debug.print("out1:\n{s}\n", .{out1.written()});

    try std.testing.expect(std.mem.indexOf(u8, out1.written(), "\"kind\": \"testProcessor\"") != null);

    // --Loading--

    var processor2: @This() = undefined;
    processor2.init();
    defer processor2.deinit(allocator);

    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, out1.written(), .{});
    defer parsed.deinit();

    try processor2.load(allocator, &context, &parsed.value);

    // Stringify
    var out2: std.io.Writer.Allocating = .init(allocator);
    defer out2.deinit();
    var write_stream2: std.json.Stringify = .{
        .writer = &out2.writer,
        .options = .{ .whitespace = .indent_2 },
    };

    try processor2.save(&context, &write_stream2);
    // std.debug.print("\nout2:\n{s}\n", .{out2.written()});

    try std.testing.expectEqualSlices(u8, out1.written(), out2.written());
}
