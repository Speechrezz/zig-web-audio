const std = @import("std");

pub fn toDecibels(gain: anytype) @TypeOf(gain) {
    if (@typeInfo(@TypeOf(gain)) != .float) {
        @compileError("Expected a runtime float type");
    }

    return 20.0 * std.math.log10(gain);
}

pub fn fromDecibels(dB: anytype) @TypeOf(dB) {
    if (@typeInfo(@TypeOf(dB)) != .float) {
        @compileError("Expected a runtime float type");
    }

    return std.math.pow(@TypeOf(dB), 10.0, dB / 20.0);
}

test "Audio math" {
    var gain: f32 = 1.0;
    var dB = toDecibels(gain);
    gain = fromDecibels(dB);

    try std.testing.expectApproxEqAbs(0.0, dB, 1e-5);
    try std.testing.expectApproxEqRel(1.0, gain, 1e-5);

    dB = -6.0;
    gain = fromDecibels(dB);
    dB = toDecibels(gain);

    try std.testing.expectApproxEqAbs(-6.0, dB, 1e-5);
    try std.testing.expectApproxEqRel(0.5011872, gain, 1e-5);
}
