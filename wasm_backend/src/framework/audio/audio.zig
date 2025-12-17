pub const ProcessSpec = struct {
    sample_rate: f64,
    num_channels: usize,
    block_size: usize,
};

pub const AudioBuffer = @import("AudioBuffer.zig");
pub const AudioView = @import("AudioView.zig");

test {
    _ = @import("AudioView.zig");
}
