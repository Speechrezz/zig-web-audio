import { sendMidiMessageSeconds, sendMidiMessageSamples, packMidiEvent, MidiEventType } from "./midi.js"
import { getAudioContext, getContextTime, getBlockSize, isAudioContextRunning, toAudibleTime } from "./audio.js"

export class Note {
    /**
     * Position of the start of the note in beats 
     * @type {Number}
     */
    beatStart

    /**
     * Length of the note in beats
     * @type {Number}
     */
    beatLength

    /**
     * MIDI note number
     * @type {Number}
     */
    noteNumber

    /**
     * @param {Number} beatStart Position of note start in beats 
     * @param {Number} beatLength Length of note in beats
     * @param {Number} noteNumber MIDI note number
     */
    constructor(beatStart, beatLength, noteNumber) {
        this.beatStart = beatStart;
        this.beatLength = beatLength;
        this.noteNumber = noteNumber;
    }

    clone() {
        return {...this};
    }
}

export class Instrument {
    /**
     * @type {Note[]}
     */
    notes = [];

    /**
     * 
     * @param {BigInt} id 
     * @param {String} name 
     */
    constructor(id, name) {
        this.id = id;
        this.name = name;
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

        playHead.isPlaying = false;
        clearInterval(this.timer);
        this.notifyListeners();
    }

    step() {
        const playHead = this.playHead;
        
        const nextTimePassedSec = getContextTime() - playHead.contextTimeStart
        const nextPositionInBeats = playHead.getPositionInBeats(nextTimePassedSec);
        
        const notesAtBeat = this.getNotesInInterval(playHead.positionInBeats, nextPositionInBeats);
        for (const note of notesAtBeat) {
            this.playNote(note);
        }

        this.notifyListeners();
        
        playHead.positionInBeats = nextPositionInBeats;
        playHead.timePassedSec = nextTimePassedSec;
    }

    /**
     * 
     * @param {Note} note 
     */
    playNote(note) {
        const noteOnEvent  = packMidiEvent(MidiEventType.NoteOn,  note.noteNumber, 100, 0);
        const noteOffEvent = packMidiEvent(MidiEventType.NoteOff, note.noteNumber, 100, 0);

        const playHeadTimeSec = this.playHead.getContextTimeSec() + this.lookAheadSec;

        const noteOnBeatOffset = note.beatStart - this.playHead.positionInBeats;
        const noteOnTime = playHeadTimeSec + this.playHead.beatsToSeconds(noteOnBeatOffset);
        const noteOffTime = noteOnTime + this.playHead.beatsToSeconds(note.beatLength);

        sendMidiMessageSeconds(noteOnEvent,  noteOnTime);
        sendMidiMessageSeconds(noteOffEvent, noteOffTime);
    }

    /**
     * 
     * @param {Number} beatStart 
     * @param {Number} beatEnd 
     * @returns {Note[]}
     */
    getNotesInInterval(beatStart, beatEnd) {
        /**
         * @type {Note[]}
         */
        let notesAtBeat = [];

        const notes = this.instruments[0].notes; // TODO: don't hardcode like this lol

        for (const note of notes) {
            if (beatStart <= beatEnd) {
                if (note.beatStart >= beatStart && note.beatStart < beatEnd) {
                    notesAtBeat.push(note);
                }
            } else {
                if (note.beatStart < beatEnd || note.beatStart >= beatStart) {
                    let adjustedNote = {...note};
                    adjustedNote.beatStart += this.playHead.lengthInBeats;
                    notesAtBeat.push(adjustedNote);
                }
            }
        }

        return notesAtBeat;
    }

    /**
     * @param {Number} packedEvent Packed MIDI event
     * @param {Number} timestampMs MIDI event timestamp
     */
    sendMidiMessageFromDevice(packedEvent, timestampMs) {
        if (!isAudioContextRunning()) return;

        const sampleRate = getAudioContext().sampleRate;
        const audibleTimeSec = toAudibleTime(timestampMs);
        const blockSize = getBlockSize();
        const adjustedTimestamp = Math.max(0, blockSize + Math.floor(audibleTimeSec * sampleRate));

        sendMidiMessageSamples(packedEvent, adjustedTimestamp);
    }

    /**
     * Used to let user preview a note (i.e. when they are drawing a note in the piano roll).
     * @param {Number} noteNumber MIDI note number
     */
    sendPreviewMidiNote(noteNumber) {
        if (!isAudioContextRunning() || this.playHead.isPlaying) return;

        const noteOnEvent  = packMidiEvent(MidiEventType.NoteOn,  noteNumber, 60, 0);
        const noteOffEvent = packMidiEvent(MidiEventType.NoteOff, noteNumber, 60, 0);

        const playHeadTimeSec = getContextTime() + this.lookAheadSec;

        const lengthInSec = 0.15;
        const noteOnTime = playHeadTimeSec;
        const noteOffTime = noteOnTime + lengthInSec;

        sendMidiMessageSeconds(noteOnEvent,  noteOnTime);
        sendMidiMessageSeconds(noteOffEvent, noteOffTime);
    }
}