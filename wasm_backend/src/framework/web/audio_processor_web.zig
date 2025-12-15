const std = @import("std");
const audio = @import("../audio/audio.zig");
const logging = @import("../web/logging.zig");
const wasm_allocator = @import("../mem/allocator.zig").wasm_allocator;

pub fn AudioProcessorWeb(comptime AudioProcessor: type) type {
    return struct {
        processor: AudioProcessor = undefined,
        audio_buffer: audio.AudioBuffer = undefined,

        pub fn init(self: *@This()) void {
            self.* = .{};

            self.processor.init();
            self.audio_buffer.init();
        }

        pub fn deinit(self: *@This()) void {
            self.processor.init();
        }

        pub fn prepare(self: *@This(), spec: audio.ProcessSpec) bool {
            logging.logDebug("[AudioProcessorWeb.prepare()] spec: {}", .{spec});

            self.audio_buffer.resize(
                wasm_allocator,
                @intCast(spec.num_channels),
                @intCast(spec.block_size),
            ) catch |err| {
                logging.logDebug("[AudioProcessorWeb.prepare()] ERROR allocating buffer: {}", .{err});
                return false;
            };

            self.processor.prepare(wasm_allocator, spec) catch |err| {
                logging.logDebug("[AudioProcessorWeb.prepare()] ERROR preparing AudioProcessor: {}", .{err});
                return false;
            };

            return true;
        }

        pub fn process(self: *@This(), block_size: u32) bool {
            self.audio_buffer.clear();
            self.processor.process(
                wasm_allocator,
                self.audio_buffer.createViewWithLength(@intCast(block_size)),
            ) catch |err| {
                logging.logDebug("[AudioProcessorWeb.process()] ERROR processing AudioProcessor: {}", .{err});
                return false;
            };

            return true;
        }
    };
}
