import { getContextTime, sendMidiMessageSeconds, packMidiEvent, MidiEventType } from "./midi.js"

export class Note {
    /**
     * 
     * @param {number} x 
     * @param {number} noteNumber 
     */
    constructor(x, noteNumber) {
        this.x = x;
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
    playbackCallbacks = [];

    constructor() {
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
    addCallback(callback) {
        this.playbackCallbacks.push(callback);
    }

    /**
     * 
     * @param {(PlayHead) => void} callback 
     */
    removeCallback(callback) {
        const index = this.playbackCallbacks.findIndex((c) => c === callback);
        this.playbackCallbacks.splice(index, 1);
    }

    notifyCallbacks() {
        for (const callback of this.playbackCallbacks) {
            callback(this.playHead);
        }
    }

    play() {
        const playHead = this.playHead;
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
        this.notifyCallbacks();
    }

    tick() {
        const playHead = this.playHead;
        
        const newBpm = 240; //this.getBpm(); // TODO
        if (Number.isFinite(newBpm) && newBpm !== playHead.bpm) {
            playHead.bpm = Math.min(Math.max(newBpm, 60), 600);
            this.tickIntervalSec = 60 / playHead.bpm;
            clearInterval(this.timer);
            this.timer = setInterval(() => this.tick(), this.tickIntervalSec * 1e3);
        }

        const notesAtBeat = this.getNotesAtBeat(playHead.currentBeat);

        for (const note of notesAtBeat) {
            this.playNote(note, playHead.timePassedSec);
        }

        this.notifyCallbacks();
        
        playHead.currentBeat = (playHead.currentBeat + 1) % playHead.lengthInBeats;
        playHead.timePassedSec += playHead.tickIntervalSec;
    }

    /**
     * 
     * @param {Note} note 
     * @param {Number} timePassedSec 
     */
    playNote(note, timePassedSec) {
        const noteOnEvent  = packMidiEvent(MidiEventType.NoteOn,  note.noteNumber, 100, 0);
        const noteOffEvent = packMidiEvent(MidiEventType.NoteOff, note.noteNumber, 100, 0);

        const lookAheadSec = 0.1;
        const noteOnTime = this.contextTimeStart + timePassedSec + lookAheadSec;

        sendMidiMessageSeconds(noteOnEvent,  noteOnTime);
        sendMidiMessageSeconds(noteOffEvent, noteOnTime + this.tickIntervalSec);
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
            if (note.x == beat) {
                notesAtBeat.push(note);
            }
        }

        return notesAtBeat;
    }
}