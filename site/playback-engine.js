import { getContextTime, sendMidiMessageSeconds, packMidiEvent, MidiEventType } from "./midi.js"

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
    lengthInBeats = 32;
    isPlaying = false;

    // ---Position info---
    currentBeat = 0;
    timePassedSec = 0;
    contextTimeStart = 0;

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
     * @returns {Number} Seconds
     */
    beatsToSeconds(beats) {
        return beats * 60.0 / this.bpm;
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
     * TODO: Remove this, just needed temporarily
     * @type {Number};
     */
    newBpm = 120;

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
        this.newBpm = Math.min(Math.max(newBpm, 60), 600);
    }

    play() {
        const playHead = this.playHead;
        if (playHead.isPlaying) return;

        playHead.currentBeat = 0;
        playHead.timePassedSec = 0;
        playHead.contextTimeStart = getContextTime();
        playHead.isPlaying = true;

        this.tickIntervalSec = 60 / playHead.bpm;
        console.log("Play!", playHead.contextTimeStart, this.tickIntervalSec);

        this.timer = setInterval(() => this.tick(), this.tickIntervalSec * 1e3);
        this.tick();
    }

    stop() {
        const playHead = this.playHead;

        console.log("Stop.");
        playHead.isPlaying = false;
        clearInterval(this.timer);
        this.notifyListeners();
    }

    tick() {
        const playHead = this.playHead;
        
        if (this.newBpm !== playHead.bpm) {
            playHead.bpm = this.newBpm;
            this.tickIntervalSec = 60 / playHead.bpm;
            clearInterval(this.timer);
            this.timer = setInterval(() => this.tick(), this.tickIntervalSec * 1e3);
        }

        const notesAtBeat = this.getNotesAtBeat(playHead.currentBeat);

        for (const note of notesAtBeat) {
            this.playNote(note);
        }

        this.notifyListeners();
        
        playHead.currentBeat = (playHead.currentBeat + 1) % playHead.lengthInBeats;
        playHead.timePassedSec += this.tickIntervalSec;
    }

    /**
     * 
     * @param {Note} note 
     */
    playNote(note) {
        const noteOnEvent  = packMidiEvent(MidiEventType.NoteOn,  note.noteNumber, 100, 0);
        const noteOffEvent = packMidiEvent(MidiEventType.NoteOff, note.noteNumber, 100, 0);

        const lookAheadSec = 0.1; // Helps remove jitter
        const playHeadTimeSec = this.playHead.getContextTimeSec() + lookAheadSec;

        const noteOnBeatOffset = note.beatStart - this.playHead.currentBeat;
        const noteOnTime = playHeadTimeSec + this.playHead.beatsToSeconds(noteOnBeatOffset);
        const noteOffTime = noteOnTime + this.playHead.beatsToSeconds(note.beatLength);

        sendMidiMessageSeconds(noteOnEvent,  noteOnTime);
        sendMidiMessageSeconds(noteOffEvent, noteOffTime);
    }

    /**
     * 
     * @param {Number} beat current beat 
     * @returns {Note[]} array of notes
     */
    getNotesAtBeat(beat) {
        beat = Math.floor(beat);

        /**
         * @type {Note[]}
         */
        let notesAtBeat = [];

        const notes = this.instruments[0].notes; // TODO: don't hardcode like this lol

        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            if (note.beatStart === beat) {
                notesAtBeat.push(note);
            }
        }

        return notesAtBeat;
    }
}