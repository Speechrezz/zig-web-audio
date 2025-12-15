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

export fn processAudio(block_size: u32) bool {
    return audio_processor_web.process(block_size);
}

export fn getOutputChannel(channel_index: usize) [*]f32 {
    return audio_processor_web.audio_buffer.getChannel(channel_index).ptr;
}

const ProcessSpec = struct {
    sample_rate: f64,
    num_channels: u32,
    block_size: u32,
};

const AudioView = struct {
    channels: [][*]f32,
    start_sample: usize = 0,
    num_samples: usize,

    pub fn getChannel(self: @This(), channel_index: usize) []f32 {
        std.debug.assert(channel_index < self.channels.len);
        return self.channels[channel_index][0..self.num_samples];
    }

    pub fn getNumSamples(self: @This()) usize {
        return self.num_samples;
    }

    pub fn createSubView(self: @This(), start_sample: usize, num_samples: usize) @This() {
        return .{
            .channels = self.channels,
            .start_sample = start_sample,
            .num_samples = num_samples,
        };
    }
};

const AudioBuffer = struct {
    buffer: std.ArrayList(f32) = .empty,
    channels: std.ArrayList([*]f32) = .empty,
    num_samples: usize = 0,

    pub fn init(self: *@This()) void {
        self.* = .{};
    }

    pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
        self.buffer.deinit(allocator);
        self.channels.deinit(allocator);
    }

    pub fn resize(self: *@This(), allocator: std.mem.Allocator, num_channels: usize, num_samples: usize) !void {
        self.num_samples = num_samples;
        try self.buffer.resize(allocator, num_channels * num_samples);
        try self.channels.resize(allocator, num_channels);

        for (0..num_channels) |channel_index| {
            const index_start = channel_index * num_samples;
            self.channels.items[channel_index] = self.buffer.items[index_start..].ptr;
        }
    }

    pub fn getChannel(self: @This(), channel_index: usize) []f32 {
        return self.channels.items[channel_index][0..self.num_samples];
    }

    pub fn getNumSamples(self: @This()) usize {
        return self.num_samples;
    }

    pub fn getNumChannels(self: @This()) usize {
        return self.channels.items.len;
    }

    pub fn createViewWithLength(self: @This(), num_samples: usize) AudioView {
        std.debug.assert(num_samples <= self.num_samples);

        return .{
            .channels = self.channels.items,
            .num_samples = num_samples,
        };
    }

    pub fn fill(self: *@This(), value: f32) void {
        for (self.buffer.items) |*sample| {
            sample.* = value;
        }
    }

    pub fn clear(self: *@This()) void {
        self.fill(0.0);
    }
};

const AudioProcessor = struct {
    phase: f32 = 0.0,
    phase_delta: f32 = 0.0,

    pub fn init(self: *@This()) void {
        self.* = .{};
    }

    pub fn deinit(self: *@This()) void {
        _ = self; // TODO
    }

    pub fn prepare(self: *@This(), allocator: std.mem.Allocator, spec: ProcessSpec) !void {
        _ = allocator;

        self.phase = 0.0;

        const frequency = 220.0;
        const sample_rate: f32 = @floatCast(spec.sample_rate);
        self.phase_delta = frequency * 2.0 * std.math.pi / sample_rate;
    }

    pub fn process(self: *@This(), allocator: std.mem.Allocator, audio_view: AudioView) !void {
        _ = allocator;

        const gain = 0.2;
        consoleLogDebug("phase={}", .{self.phase});

        for (0..audio_view.getNumSamples()) |i| {
            const sample = @sin(self.phase) * gain;
            self.phase += self.phase_delta;

            audio_view.getChannel(0)[i] = sample;
            audio_view.getChannel(1)[i] = sample;
        }

        self.phase = @mod(self.phase, 2.0 * std.math.pi);
    }
};

const AudioProcessorWeb = struct {
    processor: AudioProcessor = undefined,
    audio_buffer: AudioBuffer = undefined,

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

        self.audio_buffer.resize(
            wasm_allcator,
            @intCast(spec.num_channels),
            @intCast(spec.block_size),
        ) catch |err| {
            consoleLogDebug("[AudioProcessorWeb.prepare()] ERROR allocating buffer: {}", .{err});
            return false;
        };

        self.processor.prepare(wasm_allcator, spec) catch |err| {
            consoleLogDebug("[AudioProcessorWeb.prepare()] ERROR preparing AudioProcessor: {}", .{err});
            return false;
        };

        return true;
    }

    pub fn process(self: *@This(), block_size: u32) bool {
        self.audio_buffer.clear();
        self.processor.process(
            wasm_allcator,
            self.audio_buffer.createViewWithLength(@intCast(block_size)),
        ) catch |err| {
            consoleLogDebug("[AudioProcessorWeb.process()] ERROR processing AudioProcessor: {}", .{err});
            return false;
        };

        return true;
    }
};

var audio_processor_web: AudioProcessorWeb = undefined;
