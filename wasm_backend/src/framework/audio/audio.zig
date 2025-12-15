pub const ProcessSpec = struct {
    sample_rate: f64,
    num_channels: u32,
    block_size: u32,
};

pub const AudioBuffer = @import("AudioBuffer.zig");
pub const AudioView = @import("AudioView.zig");
