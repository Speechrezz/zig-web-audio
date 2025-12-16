const std = @import("std");

channels: [][*]f32,
start_sample: usize = 0,
num_samples: usize,

pub fn getChannel(self: @This(), channel_index: usize) []f32 {
    std.debug.assert(channel_index < self.channels.len);
    return self.channels[channel_index][0..self.num_samples];
}

pub fn getNumChannels(self: @This()) usize {
    return self.channels.len;
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

pub fn clear(self: @This()) void {
    self.fill(0.0);
}

pub fn fill(self: @This(), value: f32) void {
    for (0..self.getNumChannels()) |channel_index| {
        const channel = self.getChannel(channel_index);
        for (channel) |*sample| {
            sample.* = value;
        }
    }
}

pub fn multiplyBy(self: @This(), value: f32) void {
    for (0..self.getNumChannels()) |channel_index| {
        const channel = self.getChannel(channel_index);
        for (channel) |*sample| {
            sample.* *= value;
        }
    }
}

pub fn addFrom(self: @This(), other: @This()) void {
    std.debug.assert(self.getNumSamples() == other.getNumSamples());
    std.debug.assert(self.getNumChannels() == other.getNumChannels());

    for (0..self.getNumChannels()) |channel_index| {
        const channel_self = self.getChannel(channel_index);
        const channel_other = self.getChannel(channel_index);

        for (0..self.getNumSamples()) |i| {
            channel_self[i] += channel_other[i];
        }
    }
}
