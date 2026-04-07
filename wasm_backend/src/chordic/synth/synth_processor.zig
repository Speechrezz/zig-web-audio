const std = @import("std");
const audio = @import("framework").audio;
const logging = @import("framework").logging;
const MidiEvent = @import("framework").MidiEvent;
const NoteList = @import("note_list.zig").NoteList;

const max_voices = 16;

pub fn SynthProcessor(comptime SynthVoice: type) type {
    return struct {
        synth_voices: [max_voices]SynthVoice = undefined,
        active_notes: NoteList(max_voices) = undefined,
        inactive_voices_buffer: [max_voices]usize = undefined,
        inactive_voices: std.ArrayList(usize) = .empty,

        pub fn init(self: *@This()) void {
            self.* = .{};

            for (&self.synth_voices) |*voice| {
                voice.init();
            }

            self.active_notes.init();
            self.inactive_voices = .initBuffer(&self.inactive_voices_buffer);

            var i = self.inactive_voices_buffer.len;
            while (i > 0) : (i -= 1) {
                self.inactive_voices.appendAssumeCapacity(i - 1);
            }
        }

        pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
            for (&self.synth_voices) |*voice| {
                voice.deinit(allocator);
            }
        }

        pub fn prepare(self: *@This(), allocator: std.mem.Allocator, spec: audio.ProcessSpec) !void {
            for (&self.synth_voices) |*voice| {
                try voice.prepare(allocator, spec);
            }
        }

        pub fn process(self: *@This(), audio_view: audio.AudioView, midi_events: []MidiEvent) void {
            audio_view.clear();
            var prev_sample_pos: i64 = 0;

            for (midi_events) |midi_event| {
                const samples_between_events = midi_event.getSamplePosition() - prev_sample_pos;
                self.renderSynthVoices(
                    audio_view,
                    @intCast(prev_sample_pos),
                    @intCast(samples_between_events),
                );

                prev_sample_pos = midi_event.getSamplePosition();
                self.handleMidiEvent(midi_event);
            }

            // Finishes rendering the block of audio
            const samples_between_events = @as(i64, @intCast(audio_view.getNumSamples())) - prev_sample_pos;
            self.renderSynthVoices(
                audio_view,
                @intCast(prev_sample_pos),
                @intCast(samples_between_events),
            );
        }

        pub fn renderSynthVoices(
            self: *@This(),
            audio_view: audio.AudioView,
            prev_sample_pos: usize,
            samples_between_events: usize,
        ) void {
            const subview = audio_view.createSubView(prev_sample_pos, samples_between_events);
            for (&self.synth_voices) |*voice| {
                voice.renderNextBlock(subview);
            }
        }

        pub fn handleMidiEvent(self: *@This(), midi_event: MidiEvent) void {
            if (midi_event.isNoteOn()) {
                self.noteOn(midi_event);
            } else if (midi_event.isNoteOff()) {
                self.noteOff(midi_event);
            }
        }

        pub fn noteOn(self: *@This(), midi_event: MidiEvent) void {
            self.reclaimVoices();

            const note_number = midi_event.getNoteNumber();
            const frequency = midi_event.getNoteFreqeuncy();
            const channel: i32 = @intCast(midi_event.getChannel());
            const velocity = midi_event.getVelocityFloat();

            if (self.active_notes.isFull()) {
                const oldest_note = self.active_notes.popFront();
                self.active_notes.append(note_number, oldest_note.voice_index, channel);

                self.synth_voices[oldest_note.voice_index].stopNote(1.0, false);
                self.synth_voices[oldest_note.voice_index].startNote(frequency, velocity, 0);
            } else {
                const voice_index = self.inactive_voices.pop().?;
                self.active_notes.append(note_number, voice_index, channel);
                self.synth_voices[voice_index].startNote(frequency, velocity, 0);
            }
        }

        pub fn noteOff(self: *@This(), midi_event: MidiEvent) void {
            const note_number = midi_event.getNoteNumber();
            const velocity = midi_event.getVelocityFloat();
            const is_sustain_pedal_on = false; // TODO

            for (self.active_notes.notes.items) |*note| {
                const is_correct_note = note_number == note.note_number;

                if (note.isOn() and is_correct_note) {
                    if (is_sustain_pedal_on) {
                        note.state = .sustain;
                    } else {
                        note.state = .off;
                        self.synth_voices[note.voice_index].stopNote(velocity, true);
                    }
                }
            }
        }

        pub fn stopAllNotes(self: *@This(), allow_tail_off: bool) void {
            for (self.active_notes.notes.items) |*note| {
                if (note.isOn()) {
                    self.synth_voices[note.voice_index].stopNote(1.0, allow_tail_off);
                }
            }
        }

        fn reclaimVoices(self: *@This()) void {
            var i = self.active_notes.getLength();
            while (i > 0) : (i -= 1) {
                const note = self.active_notes.get(i - 1);
                if (!note.isOff() or self.synth_voices[note.voice_index].isCurrentlyPlaying()) continue;

                self.inactive_voices.appendAssumeCapacity(note.voice_index);
                self.active_notes.remove(i - 1);
            }
        }
    };
}

test "SynthProcessor tests" {
    const SynthVoice = @import("../instruments/SineSynth/SineSynthVoice.zig");
    const dsp = @import("framework").dsp;
    const allocator = std.testing.allocator;

    const sample_rate = 48000.0;
    const num_channels = 2;
    const block_size = 128;

    var processor: SynthProcessor(SynthVoice) = undefined;
    processor.init();
    defer processor.deinit(allocator);
    try processor.prepare(allocator, .{
        .sample_rate = sample_rate,
        .num_channels = num_channels,
        .block_size = block_size,
    });

    // Ensure notes stop instantly
    const adsr_parameters: dsp.AdsrProcessor.Parameters = .{
        .attack_time = 0.0,
        .decay_time = 0.0,
        .sustain_gain = 1.0,
        .release_time = 0.0,
    };
    for (&processor.synth_voices) |*synth_voice| {
        synth_voice.updateAdsr(adsr_parameters);
    }

    var audio_buffer: audio.AudioBuffer = .empty;
    defer audio_buffer.deinit(allocator);
    try audio_buffer.resize(allocator, num_channels, block_size);

    const packed_note_on = 6043280;
    var midi_slice = [_]MidiEvent{.initFromPacked(packed_note_on, 10)};

    try std.testing.expect(processor.active_notes.isEmpty());
    try std.testing.expect(processor.inactive_voices.items.len == max_voices);

    processor.process(audio_buffer.createView(), &midi_slice);

    try std.testing.expect(processor.active_notes.getLength() == 1);
    try std.testing.expect(processor.inactive_voices.items.len == max_voices - 1);

    const packed_note_off = 7157376;
    midi_slice[0] = MidiEvent.initFromPacked(packed_note_off, 10);

    processor.process(audio_buffer.createView(), &midi_slice);
    processor.reclaimVoices();

    try std.testing.expect(processor.active_notes.getLength() == 0);
    try std.testing.expect(processor.inactive_voices.items.len == max_voices);
}
