pub const ProcessSpec = struct {
    sample_rate: f64,
    num_channels: usize,
    block_size: usize,
};

pub const AudioBuffer = @import("AudioBuffer.zig");
pub const AudioProcessor = @import("AudioProcessor.zig");
pub const AudioView = @import("AudioView.zig");
pub const ProcessorRegistry = @import("ProcessorRegistry.zig");

test {
    _ = AudioView;
}
