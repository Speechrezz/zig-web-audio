pub const SineSynth = @import("SineSynth/SineSynthInstrument.zig");
pub const TriangleSynth = @import("TriangleSynth/TriangleSynthInstrument.zig");
pub const WavetableSynth = @import("WavetableSynth/WavetableSynthInstrument.zig");

test {
    _ = SineSynth;
    _ = TriangleSynth;
    _ = WavetableSynth;
}
