const std = @import("std");
const audio = @import("framework").audio;
const MidiEvent = @import("framework").MidiEvent;
const NoteList = @import("note_list.zig").NoteList;
const SynthVoice = @import("SynthVoice.zig");

const max_voices = 16;

synth_voices: [max_voices]SynthVoice = undefined,
active_notes: NoteList(max_voices) = undefined,
inactive_voices: [max_voices]usize = undefined,

pub fn init(self: *@This()) void {
    self.* = .{};

    for (&self.synth_voices) |*voice| {
        voice.* = .init;
    }

    self.active_notes.init();

    for (0..self.inactive_voices.len) |i| {
        self.inactive_voices[i] = i;
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
    const channel: i32 = @intCast(midi_event.getChannel());
    const velocity = midi_event.getVelocityFloat();

    if (self.active_notes.isFull()) {
        const oldest_note = self.active_notes.popFront();
        self.active_notes.append(note_number, oldest_note.voice_index, channel);

        self.synth_voices[oldest_note.voice_index].stopNote(1.0, false);
        self.synth_voices[oldest_note.voice_index].startNote(1.0, velocity, 0);
    } else {
        const voice_index = self.inactive_voices.popBack();
        self.active_notes.append(note_number, voice_index, channel);
        self.synth_voices[voice_index].startNote(note_number, velocity, 0);
    }
}

pub fn noteOff(self: *@This(), midi_event: MidiEvent) void {
    _ = self;
    _ = midi_event;
}

fn reclaimVoices(self: *@This()) void {
    if (self.active_notes.isEmpty()) return;

    var i: usize = self.active_notes.getLength();
    while (i > 0) : (i -= 1) {
        const note = self.active_notes.get(i);
        if (!note.isOff() or self.synth_voices[note.voice_index].isCurrentlyPlaying()) continue;

        self.inactive_voices.append(note.voice_index);
        self.active_notes.remove(i);
    }
}
