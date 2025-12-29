import { sendMidiMessageSeconds, sendMidiMessageSamples, sendStopAllNotes, MidiEventType, MidiEvent } from "./midi.js"
import { getAudioContext, getContextTime, getBlockSize, isAudioContextRunning, toAudibleTime } from "./audio.js"

export class Note {
    /**
     * Position of the start of the note in beats 
     * @type {Number}
     */
    beatStart;

    /**
     * Length of the note in beats
     * @type {Number}
     */
    beatLength;

    /**
     * MIDI note number
     * @type {Number}
     */
    noteNumber;

    /**
     * Velocity (normalized 0..1)
     * @type {Number}
     */
    velocity;

    /**
     * MIDI channel
     * @type {Number}
     */
    channel;

    /**
     * @param {Number} beatStart Position of note start in beats 
     * @param {Number} beatLength Length of note in beats
     * @param {Number} noteNumber MIDI note number
     * @param {Number} velocity MIDI velocity 0..127
     * @param {Number} channel MIDI channel
     */
    constructor(beatStart, beatLength, noteNumber, velocity = 100, channel = 0) {
        this.beatStart = beatStart;
        this.beatLength = beatLength;
        this.noteNumber = noteNumber;
        this.velocity = velocity / 127.0; // Normalize
        this.channel = channel;
    }

    clone() {
        return new Note(this.beatStart, this.beatLength, this.noteNumber, this.velocity, this.channel);
    }

    getMidiVelocity() {
        return this.velocity * 127.0;
    }

    getBeatStop() {
        return this.beatStart + this.beatLength;
    }
}

export class NoteNumberAndChannel {
    noteNumber = 0;
    channel = 0;

    constructor(noteNumber, channel = 0) {
        this.noteNumber = noteNumber;
        this.channel = channel;
    }

    /**
     * @param {NoteNumberAndChannel} other 
     */
    eql(noteNumber, channel = 0) {
        return this.noteNumber === noteNumber
            && this.channel === channel;
    }
}

class NoteEvent {
    noteNumber = 0;
    velocity = 0;
    channel = 0;
    timestampBeats = 0;
    isNoteOn = true;

    constructor(timestampBeats, isNoteOn, noteNumber, velocity, channel = 0) {
        this.noteNumber = noteNumber;
        this.velocity = velocity;
        this.channel = channel;
        this.timestampBeats = timestampBeats;
        this.isNoteOn = isNoteOn;
    }

    getMidiVelocity() {
        return this.velocity * 127.0;
    }

    clone() {
        return {...this};
    }
}

export class Instrument {
    /**
     * All the drawn/saved notes
     * @type {Note[]}
     */
    notes = [];

    /**
     * Currently playing notes
     * @type {NoteNumberAndChannel[]}
     */
    activeNotes = [];

    /**
     * Note stop events that need to be processed
     * @type {NoteEvent[]}
     */
    queuedNoteEvents = [];

    /**
     * 
     * @param {BigInt} id 
     * @param {String} name 
     */
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }

    noteStart(noteNumber, channel) {
        const index = this.activeNotes.findIndex((v) => v.eql(noteNumber, channel));
        if (index === -1) {
            this.activeNotes.push(new NoteNumberAndChannel(noteNumber, channel));
        }
    }

    noteStop(noteNumber, channel) {
        const index = this.activeNotes.findIndex((v) => v.eql(noteNumber, channel));
        if (index >= 0) {
            this.activeNotes.splice(index, 1);
        }
    }

    isNotePlaying(noteNumber, channel) {
        const index = this.activeNotes.findIndex((v) => v.eql(noteNumber, channel));
        return index >= 0;
    }
}

export class PlayHead {
    // ---Project info---
    bpm = 120;
    lengthInBeats = 64;
    isPlaying = false;

    // ---Position info---
    positionInBeats = 0;
    timePassedSec = 0; // Time since started playing
    contextTimeStart = 0; // Audio context time when started playing

    // ---Internal info used by PlaybackEngine---
    timePerStepSec = 1 / 60.0;
    anchorInSec = 0;
    anchorInBeats = 0;

    /**
     * 
     * @param {Number} timePassedSec 
     * @returns 
     */
    getPositionInBeats(timePassedSec) {
        const deltaTimeSec = timePassedSec - this.anchorInSec;
        return (this.anchorInBeats + this.secondsToBeats(deltaTimeSec)) % this.lengthInBeats;
    }

    /**
     * 
     * @returns {Number} Time since audio context started in seconds
     */
    getContextTimeSec() {
        return this.contextTimeStart + this.timePassedSec;
    }

    /**
     * 
     * @param {Number} beats Number of beats
     * @returns {Number} Time in seconds
     */
    beatsToSeconds(beats) {
        return beats * 60.0 / this.bpm;
    }

    /**
     * 
     * @param {Number} seconds Time in seconds
     * @returns {Number} Number of beats
     */
    secondsToBeats(seconds) {
        return seconds * this.bpm / 60.0;
    }

    getBeatsPerStep() {
        return this.secondsToBeats(this.timePerStepSec);
    }
}

export class PlaybackEngine {
    /**
     * @type {PlayHead}
     */
    playHead = new PlayHead();

    /**
     * @type {Instrument[]}
     */
    instruments = [];

    /**
     * @type {((PlayHead) => void)[]}
     */
    playbackListeners = [];

    /**
     * Helps mitigate jitter
     */
    lookAheadSec = 0.1;

    /**
     * Currently selected instrument index, used for 
     */
    selectedInstrumentIndex = 0;


    constructor() {
        // TEMP:
        this.addInstrument(0, "temp");

        // TODO
    }

    /**
     * 
     * @param {BigInt} id 
     * @param {String} name 
     */
    addInstrument(id, name) {
        this.instruments.push(new Instrument(id, name));
    }

    /**
     * 
     * @param {BigInt} id 
     */
    removeInstrument(id) {
        const index = this.instruments.findIndex((instrument) => instrument.id == id);
        this.instruments.splice(index, 1);
    }

    /**
     * 
     * @param {BigInt} id 
     * @return {Instrument} instrument
     */
    getInstrument(id) {
        return this.instruments.find((instrument) => instrument.id == id);
    }

    getSelectedInstrument() {
        return this.instruments[this.selectedInstrumentIndex];
    }

    /**
     * 
     * @param {(PlayHead) => void} callback 
     */
    addListener(callback) {
        this.playbackListeners.push(callback);
    }

    /**
     * 
     * @param {(PlayHead) => void} callback 
     */
    removeListener(callback) {
        const index = this.playbackListeners.findIndex((c) => c === callback);
        this.playbackListeners.splice(index, 1);
    }

    notifyListeners() {
        for (const callback of this.playbackListeners) {
            callback(this.playHead);
        }
    }

    /**
     * 
     * @param {Number} newBpm 
     */
    setTempo(newBpm) {
        if (!Number.isFinite(newBpm)) return;
        const newTempo = Math.min(Math.max(newBpm, 60), 600);
        if (newTempo === this.playHead.bpm) return;

        this.playHead.anchorInSec = this.playHead.timePassedSec;
        this.playHead.anchorInBeats = this.playHead.positionInBeats;

        this.playHead.bpm = newTempo;
    }

    play() {
        const playHead = this.playHead;
        if (playHead.isPlaying) return;

        playHead.positionInBeats = 0;
        playHead.timePassedSec   = 0;
        playHead.timePassedSteps = 0;
        playHead.anchorInBeats   = 0;
        playHead.anchorInSec     = 0;
        playHead.contextTimeStart = getContextTime();
        playHead.isPlaying = true;

        this.timer = setInterval(() => this.step(), playHead.timePerStepSec * 1e3);
        this.step();
    }

    stop() {
        const playHead = this.playHead;

        for (const instrument of this.instruments) {
            instrument.activeNotes.length = 0;
            instrument.queuedNoteEvents.length = 0;
        }

        sendStopAllNotes();

        playHead.isPlaying = false;
        clearInterval(this.timer);
        this.notifyListeners();
    }

    step() {
        const playHead = this.playHead;
        
        const nextTimePassedSec = getContextTime() - playHead.contextTimeStart
        const nextPositionInBeats = playHead.getPositionInBeats(nextTimePassedSec);
        
        const instrument = this.getSelectedInstrument();
        const noteEvents = this.getNoteStartInInterval(instrument, playHead.positionInBeats, nextPositionInBeats);
        noteEvents.push(...this.getNoteStopInInterval(instrument, playHead.positionInBeats, nextPositionInBeats));
        noteEvents.sort((a, b) => a.timestampBeats - b.timestampBeats); // Ascending

        for (const noteEvent of noteEvents) {
            this.sendNoteEvent(instrument, noteEvent);
        }

        this.notifyListeners();
        
        playHead.positionInBeats = nextPositionInBeats;
        playHead.timePassedSec = nextTimePassedSec;
    }

    /**
     * @param {Instrument} instrument 
     * @param {NoteEvent} noteEvent 
     */
    sendNoteEvent(instrument, noteEvent) {
        const playHeadTimeSec = this.playHead.getContextTimeSec() + this.lookAheadSec;

        const beatOffset = noteEvent.timestampBeats - this.playHead.positionInBeats;
        const eventTimeSec = playHeadTimeSec + this.playHead.beatsToSeconds(beatOffset);

        let midiEvent;
        if (noteEvent.isNoteOn) {
            midiEvent = MidiEvent.newNote(MidiEventType.NoteOn, noteEvent.noteNumber, noteEvent.getMidiVelocity(), noteEvent.channel);
            instrument.noteStart(noteEvent.noteNumber, noteEvent.channel);
        } 
        else {
            midiEvent = MidiEvent.newNote(MidiEventType.NoteOff, noteEvent.noteNumber, noteEvent.getMidiVelocity(), noteEvent.channel);
            instrument.noteStop(noteEvent.noteNumber, noteEvent.channel);
        }

        sendMidiMessageSeconds(midiEvent, eventTimeSec);
    }

    /**
     * @param {Instrument} instrument 
     * @param {Number} beatStart 
     * @param {Number} beatEnd 
     * @returns {NoteEvent[]}
     */
    getNoteStartInInterval(instrument, beatStart, beatEnd) {
        /**
         * @type {NoteEvent[]}
         */
        let noteEvents = [];

        const notes = instrument.notes;
        const queuedEvents = instrument.queuedNoteEvents;

        for (const note of notes) {
            const noteStop = note.getBeatStop();
            if (beatStart <= beatEnd) {
                if (note.beatStart >= beatStart && note.beatStart < beatEnd) {
                    noteEvents.push(new NoteEvent(note.beatStart, true, note.noteNumber, note.velocity, note.channel));
                    queuedEvents.push(new NoteEvent(noteStop, false, note.noteNumber, note.velocity, note.channel));
                }
            } else {
                if (note.beatStart < beatEnd || note.beatStart >= beatStart) {
                    const adjustedNoteStart = note.beatStart + this.playHead.lengthInBeats;
                    noteEvents.push(new NoteEvent(adjustedNoteStart, true, note.noteNumber, note.velocity, note.channel));
                    queuedEvents.push(new NoteEvent(noteStop, false, note.noteNumber, note.velocity, note.channel));
                }
            }
        }

        return noteEvents;
    }

    /**
     * @param {Instrument} instrument 
     * @param {Number} beatStart 
     * @param {Number} beatEnd 
     * @returns {NoteEvent[]}
     */
    getNoteStopInInterval(instrument, beatStart, beatEnd) {
        /**
         * @type {NoteEvent[]}
         */
        let noteEvents = [];

        const queuedEvents = instrument.queuedNoteEvents;

        let i = 0;
        while (i < queuedEvents.length) {
            const noteEvent = queuedEvents[i];
            const noteStop = noteEvent.timestampBeats % this.playHead.lengthInBeats;

            if (beatStart <= beatEnd) {
                if (noteStop >= beatStart && noteStop < beatEnd) {
                    noteEvents.push(noteEvent);
                    queuedEvents.splice(i, 1);
                    continue;
                }
            } else {
                if (noteStop < beatEnd || noteStop >= beatStart) {
                    noteEvent.timestampBeats += this.playHead.lengthInBeats;
                    noteEvents.push(noteEvent);
                    queuedEvents.splice(i, 1);
                    continue;
                }
            }

            i++;
        }

        return noteEvents;
    }

    /**
     * @param {MidiEvent} midiEvent MIDI event
     * @param {Number} timestampMs MIDI event timestamp
     */
    sendMidiMessageFromDevice(midiEvent, timestampMs) {
        if (!isAudioContextRunning()) return;

        const sampleRate = getAudioContext().sampleRate;
        const audibleTimeSec = toAudibleTime(timestampMs);
        const blockSize = getBlockSize();
        const adjustedTimestamp = Math.max(0, blockSize + Math.floor(audibleTimeSec * sampleRate));

        sendMidiMessageSamples(midiEvent, adjustedTimestamp);

        if (midiEvent.isNoteOn()) {
            const selectedInstrument = this.getSelectedInstrument();
            selectedInstrument.noteStart(midiEvent.getNoteNumber(), midiEvent.getChannel());
        }
        else if (midiEvent.isNoteOff()) {
            const selectedInstrument = this.getSelectedInstrument();
            selectedInstrument.noteStop(midiEvent.getNoteNumber(), midiEvent.getChannel());
        }
    }

    /**
     * Used to let user preview a note (i.e. when they are drawing a note in the piano roll).
     * @param {Number} noteNumber MIDI note number
     */
    sendPreviewMidiNote(noteNumber) {
        if (!isAudioContextRunning() || this.playHead.isPlaying) return;

        const noteOnEvent  = MidiEvent.newNote(MidiEventType.NoteOn,  noteNumber, 60, 0);
        const noteOffEvent = MidiEvent.newNote(MidiEventType.NoteOff, noteNumber, 60, 0);

        const playHeadTimeSec = getContextTime() + this.lookAheadSec;

        const lengthInSec = 0.15;
        const noteOnTime = playHeadTimeSec;
        const noteOffTime = noteOnTime + lengthInSec;

        sendMidiMessageSeconds(noteOnEvent,  noteOnTime);
        sendMidiMessageSeconds(noteOffEvent, noteOffTime);
    }
}