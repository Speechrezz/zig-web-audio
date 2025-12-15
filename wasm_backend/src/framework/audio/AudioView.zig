const std = @import("std");

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
