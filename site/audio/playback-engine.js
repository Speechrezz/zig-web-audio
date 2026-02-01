import { Config } from "../app/config.js";
import { Instrument, InstrumentsContainer } from "./instrument.js";
import { sendMidiMessageSeconds, sendMidiMessageSamples, sendStopAllNotes, MidiEventType, MidiEvent } from "./midi.js"
import { getAudioContext, getContextTime, getBlockSize, isAudioContextRunning, toAudibleTime } from "./audio.js"
import { AudioEvent } from "./audio-constants.js";

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

export class PlayHead {
    /** @type {Config} */
    config;

    // ---Project info---
    bpm = 120;
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
     * @param {Config} config 
     */
    constructor(config) {
        this.config = config;
    }

    /**
     * @param {number} timePassedSec 
     * @returns 
     */
    getPositionInBeats(timePassedSec) {
        const deltaTimeSec = timePassedSec - this.anchorInSec;
        return (this.anchorInBeats + this.secondsToBeats(deltaTimeSec)) % this.config.lengthInBeats;
    }

    /**
     * @returns {number} Time since audio context started in seconds
     */
    getContextTimeSec() {
        return this.contextTimeStart + this.timePassedSec;
    }

    /**
     * @param {number} beats Number of beats
     * @returns {number} Time in seconds
     */
    beatsToSeconds(beats) {
        return beats * 60.0 / this.bpm;
    }

    /**
     * @param {number} seconds Time in seconds
     * @returns {number} Number of beats
     */
    secondsToBeats(seconds) {
        return seconds * this.bpm / 60.0;
    }

    getBeatsPerStep() {
        return this.secondsToBeats(this.timePerStepSec);
    }
}

export class PlaybackEngine {
    /** @type {Config} */
    config;

    /** @type {PlayHead} */
    playHead;

    /** @type {InstrumentsContainer} */
    instruments;

    /** @type {(() => void)[][]} */
    audioEventListeners = [];

    /**
     * Helps mitigate jitter
     */
    lookAheadSec = 0.1;


    /**
     * @param {Config} config 
     * @param {InstrumentsContainer} instruments 
     */
    constructor(config, instruments) {
        this.config = config;
        this.playHead = new PlayHead(config);
        this.instruments = instruments;

        // Initialize listeners list
        for (const key of Object.keys(AudioEvent)) {
            this.audioEventListeners.push([]);
        }
    }

    /**
     * @param {AudioEvent} eventType 
     * @param {() => void} callback 
     */
    addListener(eventType, callback) {
        this.audioEventListeners[eventType].push(callback);
    }

    /**
     * @param {AudioEvent} eventType 
     * @param {() => void} callback 
     */
    removeListener(eventType, callback) {
        const listeners = this.audioEventListeners[eventType];
        const index = listeners.indexOf(callback);
        listeners.splice(index, 1);
    }

    /**
     * @param {AudioEvent} eventType 
     */
    notifyListeners(eventType) {
        const listeners = this.audioEventListeners[eventType];
        for (const callback of listeners) {
            callback();
        }
    }

    /**
     * @param {number} newBpm 
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

        for (const instrument of this.instruments.getList()) {
            instrument.activeNotes.length = 0;
            instrument.queuedNoteEvents.length = 0;
        }

        sendStopAllNotes();

        playHead.isPlaying = false;
        clearInterval(this.timer);
        this.notifyListeners(AudioEvent.PlayHead);
    }

    step() {
        const playHead = this.playHead;
        
        const nextTimePassedSec = getContextTime() - playHead.contextTimeStart
        const nextPositionInBeats = playHead.getPositionInBeats(nextTimePassedSec);
        
        for (const instrument of this.instruments.getList()) {
            const noteStartEvents = this.getNoteStartInInterval(instrument, playHead.positionInBeats, nextPositionInBeats);
            const noteEvents = this.getNoteStopInInterval(instrument, playHead.positionInBeats, nextPositionInBeats);
            noteEvents.push(...noteStartEvents);
            noteEvents.sort((a, b) => a.timestampBeats - b.timestampBeats); // Ascending

            for (const noteEvent of noteEvents) {
                this.sendNoteEvent(instrument, noteEvent);
            }
        }

        this.notifyListeners(AudioEvent.PlayHead);
        
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

        sendMidiMessageSeconds(instrument.index, midiEvent, eventTimeSec);
    }

    /**
     * @param {Instrument} instrument 
     * @param {number} beatStart 
     * @param {number} beatEnd 
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
                    const adjustedNoteStart = note.beatStart + this.config.lengthInBeats;
                    noteEvents.push(new NoteEvent(adjustedNoteStart, true, note.noteNumber, note.velocity, note.channel));
                    queuedEvents.push(new NoteEvent(noteStop, false, note.noteNumber, note.velocity, note.channel));
                }
            }
        }

        return noteEvents;
    }

    /**
     * @param {Instrument} instrument 
     * @param {number} beatStart 
     * @param {number} beatEnd 
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
            const noteStop = noteEvent.timestampBeats % this.config.lengthInBeats;

            if (beatStart <= beatEnd) {
                if (noteStop >= beatStart && noteStop < beatEnd) {
                    noteEvent.timestampBeats = noteStop;
                    noteEvents.push(noteEvent);
                    queuedEvents.splice(i, 1);
                    continue;
                }
            } else {
                if (noteStop < beatEnd || noteStop >= beatStart) {
                    noteEvent.timestampBeats = noteStop + this.config.lengthInBeats;
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
     * @param {number | undefined} timestampMs MIDI event timestamp
     */
    sendMidiMessageFromDevice(midiEvent, timestampMs = undefined) {
        if (!isAudioContextRunning()) return;

        const instrument = this.instruments.getSelected();
        if (instrument === null) return;

        if (timestampMs !== undefined) {
            const sampleRate = getAudioContext().sampleRate;
            const audibleTimeSec = toAudibleTime(timestampMs);
            const blockSize = getBlockSize();
            const adjustedTimestamp = Math.max(0, blockSize + Math.floor(audibleTimeSec * sampleRate));
            sendMidiMessageSamples(instrument.index, midiEvent, adjustedTimestamp);
        }
        else {
            const adjustedTimestamp = getContextTime() + this.lookAheadSec;
            sendMidiMessageSeconds(instrument.index, midiEvent, adjustedTimestamp);
        }

        if (midiEvent.isNoteOn()) {
            instrument.noteStart(midiEvent.getNoteNumber(), midiEvent.getChannel());
        }
        else if (midiEvent.isNoteOff()) {
            instrument.noteStop(midiEvent.getNoteNumber(), midiEvent.getChannel());
        }
    }

    /**
     * Used to let user preview a note (i.e. when they are drawing a note in the piano roll).
     * @param {number} noteNumber MIDI note number
     */
    sendPreviewMidiNote(noteNumber) {
        if (!isAudioContextRunning() || this.playHead.isPlaying) return;

        const instrument = this.instruments.getSelected();

        const noteOnEvent  = MidiEvent.newNote(MidiEventType.NoteOn,  noteNumber, 60, 0);
        const noteOffEvent = MidiEvent.newNote(MidiEventType.NoteOff, noteNumber, 60, 0);

        const playHeadTimeSec = getContextTime() + this.lookAheadSec;

        const lengthInSec = 0.15;
        const noteOnTime = playHeadTimeSec;
        const noteOffTime = noteOnTime + lengthInSec;

        sendMidiMessageSeconds(instrument.index, noteOnEvent,  noteOnTime);
        sendMidiMessageSeconds(instrument.index, noteOffEvent, noteOffTime);
    }
}