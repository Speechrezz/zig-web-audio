import { getAudioWorkletNode } from "./audio.js";
import { InstrumentDetailsList, InstrumentType, InstrumentEvent } from "./audio-constants.js";
import { WorkletMessageType } from "./worklet-message.js";

class NoteNumberAndChannel {
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

export class Instrument {
    /**
     * @type {number}
     */
    index;

    /**
     * @type {string}
     */
    name;

    /**
     * All the drawn/saved notes
     * @type {Note[]}
     */
    notes = [];

    /**
     * Counts note IDs to ensure unique IDs
     * @type {number}
     */
    noteIdCounter = 0;

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
     * @param {string} name 
     */
    constructor(name) {
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

    getNextNoteId() {
        this.noteIdCounter++;
        return this.noteIdCounter - 1;
    }
}

export class InstrumentsContainer {
    /** @type {Instrument[]} */
    instruments = [];

    /** @type {number} */
    selectedIndex = 0;

    /**
     * @type {(() => void)[][]}
     */
    instrumentEventListeners = [];

    constructor() {
        // Initialize listeners list
        for (const key of Object.keys(InstrumentEvent)) {
            this.instrumentEventListeners.push([]);
        }

        // TEMP:
        this.addInstrument(InstrumentType.SineSynth);
    }

    /**
     * @param {InstrumentType} instrumentType
     */
    addInstrument(instrumentType) {
        const instrumentDetails = InstrumentDetailsList[instrumentType];
        const newInstrument = new Instrument(instrumentDetails.name);
        this.instruments.push(newInstrument);
        this.updateInstrumentIndices();
        this.selectedIndex = newInstrument.index;

        getAudioWorkletNode().port.postMessage({
            type: WorkletMessageType.addInstrument,
            instrumentIndex: newInstrument.index,
            instrumentType: instrumentType,
        });

        this.notifyListeners(InstrumentEvent.InstrumentsChanged);
        this.notifyListeners(InstrumentEvent.InstrumentSelected);
    }

    /**
     * @param {number} instrumentIndex
     */
    removeInstrument(instrumentIndex) {
        this.instruments.splice(instrumentIndex, 1);
        this.updateInstrumentIndices();

        getAudioWorkletNode().port.postMessage({
            type: WorkletMessageType.removeInstrument,
            instrumentIndex: instrumentIndex,
        });

        if (this.selectedIndex >= instrumentIndex) {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        }

        this.notifyListeners(InstrumentEvent.InstrumentSelected);
        this.notifyListeners(InstrumentEvent.InstrumentsChanged);
    }

    updateInstrumentIndices() {
        for (let i = 0; i < this.instruments.length; i++) {
            this.instruments[i].index = i;
        }
    }

    /**
     * @param {number} index 
     * @return {Instrument} instrument
     */
    get(index) {
        return this.instruments[index];
    }

    /**
     * @param {number} index 
     */
    selectInstrument(index) {
        if (this.selectedIndex === index) return;

        this.selectedIndex = index;
        this.notifyListeners(InstrumentEvent.InstrumentSelected);
    }

    getSelected() {
        return this.instruments[this.selectedIndex];
    }

    getList() {
        return this.instruments;
    }

    /**
     * @param {InstrumentEvent} eventType 
     * @param {() => void} callback 
     */
    addListener(eventType, callback) {
        this.instrumentEventListeners[eventType].push(callback);
    }

    /**
     * @param {InstrumentEvent} eventType 
     * @param {() => void} callback 
     */
    removeListener(eventType, callback) {
        const listeners = this.instrumentEventListeners[eventType];
        const index = listeners.indexOf(callback);
        listeners.splice(index, 1);
    }

    /**
     * @param {InstrumentEvent} eventType 
     */
    notifyListeners(eventType) {
        const listeners = this.instrumentEventListeners[eventType];
        for (const callback of listeners) {
            callback();
        }
    }
}