pub const generators = @import("generators/generators.zig");
pub const effects = @import("effects/effects.zig");
pub const TrackProcessor = @import("TrackProcessor.zig");

test {
    _ = generators;
    _ = effects;
    _ = TrackProcessor;
}
