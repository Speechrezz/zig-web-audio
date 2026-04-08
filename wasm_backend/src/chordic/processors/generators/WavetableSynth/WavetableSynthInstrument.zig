const std = @import("std");
const audio = @import("framework").audio;
const dsp = @import("framework").dsp;
const logging = @import("framework").logging;
const MidiEvent = @import("framework").MidiEvent;
const state = @import("framework").state;
const SynthProcessor = @import("../../../synth/synth_processor.zig").SynthProcessor;
const SynthVoice = @import("WavetableSynthVoice.zig");

pub const kind = "wavetableSynth";
pub const name = "Wavetable Synth";

processor: audio.AudioProcessor,
synth_processor: SynthProcessor(SynthVoice),
gain_processor: dsp.GainProcessor,

gain_param: *state.AudioParameter,
adsr_params: struct {
    attack: *state.AudioParameter,
    decay: *state.AudioParameter,
    sustain: *state.AudioParameter,
    release: *state.AudioParameter,
},

pub fn init(self: *@This(), allocator: std.mem.Allocator) !void {
    self.processor.init(
        kind,
        name,
        self,
        &.{
            .destroy = destroy,
            .prepare = prepare,
            .process = process,
            .stop = stop,
        },
    );

    self.gain_processor = .init;

    self.adsr_params.attack = try self.processor.parameters.add(allocator, try .create(
        allocator,
        "attack",
        "Attack",
        .initSkewedCenter(0.0, 1.0, 0.2),
        0.01,
        .initSeconds(2, 1),
    ));
    self.adsr_params.decay = try self.processor.parameters.add(allocator, try .create(
        allocator,
        "decay",
        "Decay",
        .initSkewedCenter(0.0, 1.0, 0.2),
        0.1,
        .initSeconds(2, 1),
    ));
    self.adsr_params.sustain = try self.processor.parameters.add(allocator, try .create(
        allocator,
        "sustain",
        "Sustain",
        .initSkewedCenter(0.0, 1.0, 0.4),
        0.4,
        .init(2),
    ));
    self.adsr_params.release = try self.processor.parameters.add(allocator, try .create(
        allocator,
        "release",
        "Release",
        .initSkewedCenter(0.0, 1.0, 0.2),
        0.1,
        .initSeconds(2, 1),
    ));

    self.gain_param = try self.processor.parameters.add(allocator, try .create(
        allocator,
        "gain",
        "Gain",
        .initSkewedCenter(0.0, 1.0, 0.2),
        1.0,
        .initBasic(1, .{ .scale = 100.0, .suffix = "%" }),
    ));

    self.synth_processor.init();
}

pub fn create(allocator: std.mem.Allocator) !*audio.AudioProcessor {
    const self = try allocator.create(@This());
    try self.init(allocator);
    return &self.processor;
}

fn destroy(ctx: *anyopaque, allocator: std.mem.Allocator) void {
    const self: *@This() = @ptrCast(@alignCast(ctx));

    self.synth_processor.deinit(allocator);
    self.gain_processor.deinit(allocator);

    allocator.destroy(self);
}

fn prepare(ctx: *anyopaque, allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
    const self: *@This() = @ptrCast(@alignCast(ctx));
    try self.synth_processor.prepare(allocator, spec);
    try self.gain_processor.prepare(allocator, spec);
}

fn process(ctx: *anyopaque, allocator: std.mem.Allocator, audio_view: audio.AudioView, midi_events: []MidiEvent) !void {
    const self: *@This() = @ptrCast(@alignCast(ctx));
    _ = allocator;

    for (&self.synth_processor.synth_voices) |*voice| {
        voice.adsr.updateParameters(.{
            .attack_time = self.adsr_params.attack.getValue(),
            .decay_time = self.adsr_params.decay.getValue(),
            .sustain_gain = self.adsr_params.sustain.getValue(),
            .release_time = self.adsr_params.release.getValue(),
        });
    }

    self.synth_processor.process(audio_view, midi_events);
    self.gain_processor.setGain(self.gain_param.getValue());
    self.gain_processor.process(audio_view);
}

fn stop(ctx: *anyopaque, allow_tail_off: bool) void {
    const self: *@This() = @ptrCast(@alignCast(ctx));
    self.synth_processor.stopAllNotes(allow_tail_off);
}
