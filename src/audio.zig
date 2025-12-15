const std = @import("std");

var wasm_allcator = std.heap.wasm_allocator;

extern "env" fn consoleLogImpl(ptr: [*]const u8, len: usize) void;

pub fn consoleLog(allocator: std.mem.Allocator, comptime fmt: []const u8, args: anytype) !void {
    const string = try std.fmt.allocPrint(allocator, fmt, args);
    defer allocator.free(string);

    consoleLogImpl(string.ptr, string.len);
}

pub fn consoleLogDebug(comptime fmt: []const u8, args: anytype) void {
    const string = std.fmt.allocPrint(wasm_allcator, fmt, args) catch unreachable;
    defer wasm_allcator.free(string);

    consoleLogImpl(string.ptr, string.len);
}

export fn initAudio() void {
    audio_processor_web.init();
}

export fn deinitAudio() void {
    audio_processor_web.deinit();
}

export fn prepareAudio(sample_rate: f64, num_channels: u32, block_size: u32) bool {
    return audio_processor_web.prepare(.{
        .sample_rate = sample_rate,
        .num_channels = num_channels,
        .block_size = block_size,
    });
}

const ProcessSpec = struct {
    sample_rate: f64,
    num_channels: u32,
    block_size: u32,
};

const AudioView = struct {
    // TODO
};

const AudioBuffer = struct {
    buffer: std.ArrayList(f32),
    channels: std.ArrayList([]f32),

    pub fn init(self: *@This()) void {
        self.* = .{};
    }

    pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
        for (self.data.items) |*channel| {
            channel.deinit(allocator);
        }

        self.data.deinit(allocator);
    }

    pub fn resize(self: *@This(), allocator: std.mem.Allocator, num_channels: usize, num_samples: usize) !void {
        try self.buffer.resize(allocator, num_channels * num_samples);
        try self.channels.resize(allocator, num_channels);

        for (0..num_channels) |channel_index| {
            const index_start = channel_index * num_samples;
            const index_end = index_start + num_samples;
            self.channels.items[channel_index] = self.buffer.items[index_start..index_end];
        }
    }

    pub fn getChannel(self: *@This(), channel_index: usize) []f32 {
        return self.channels.items[channel_index];
    }

    pub fn getNumSamples(self: @This()) usize {
        return self.channels.items[0].len;
    }

    pub fn getNumChannels(self: @This()) usize {
        return self.channels.items.len;
    }
};

const AudioBufferWebWrapper = struct {
    buffer: AudioBuffer = undefined,
    channels: std.ArrayList([*]f32) = .empty,

    pub fn init(self: *@This()) void {
        self.* = .{};
    }

    pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
        self.buffer.deinit(allocator);
        self.channels.deinit(allocator);
    }

    pub fn resize(self: *@This(), allocator: std.mem.Allocator, num_channels: usize, num_samples: usize) !void {
        try self.buffer.resize(allocator, num_channels, num_samples);
        try self.channels.resize(allocator, num_channels);

        for (0..num_channels) |channel_index| {
            self.channels.items[channel_index] = self.buffer.channels.items[channel_index].ptr;
        }
    }
};

const AudioProcessor = struct {
    pub fn init(self: *@This()) void {
        self.* = .{};
    }

    pub fn deinit(self: *@This()) void {
        _ = self; // TODO
    }

    pub fn prepare(self: *@This(), allocator: std.mem.Allocator, spec: ProcessSpec) !void {
        _ = self; // TODO
        _ = allocator;
        _ = spec;
    }

    pub fn process(self: *@This()) !void {
        _ = self; // TODO
    }
};

const AudioProcessorWeb = struct {
    processor: AudioProcessor = undefined,
    audio_buffer: AudioBufferWebWrapper = undefined,

    pub fn init(self: *@This()) void {
        self.* = .{};

        self.processor.init();
        self.audio_buffer.init();
    }

    pub fn deinit(self: *@This()) void {
        self.processor.init();
    }

    pub fn prepare(self: *@This(), spec: ProcessSpec) bool {
        consoleLogDebug("[AudioProcessorWeb.prepare()] spec: {}", .{spec});

        self.audio_buffer.resize(wasm_allcator, spec.num_channels, spec.block_size) catch |err| {
            consoleLogDebug("ERROR in AudioProcessorWeb.prepare(): {}", .{err});
            return false;
        };

        self.processor.prepare(wasm_allcator, spec) catch |err| {
            consoleLogDebug("ERROR in AudioProcessorWeb.prepare(): {}", .{err});
            return false;
        };

        return true;
    }

    pub fn process(self: *@This()) bool {
        self.processor.process();
    }
};

var audio_processor_web: AudioProcessorWeb = undefined;
