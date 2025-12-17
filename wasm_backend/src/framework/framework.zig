pub const audio = @import("audio/audio.zig");
pub const logging = @import("web/logging.zig");
pub const wasm_allocator = @import("mem/allocator.zig").wasm_allcator;
pub const MidiEvent = @import("midi/MidiEvent.zig");

pub const AudioProcessorWeb = @import("web/audio_processor_web.zig").AudioProcessorWeb;

test {
    _ = @import("web/WebMidi.zig");
    _ = @import("audio/audio.zig");
}
