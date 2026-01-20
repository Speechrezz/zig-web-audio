import { getAudioWorkletNode } from "./audio.js";
import { InstrumentDetailsList, InstrumentType, InstrumentEvent } from "./audio-constants.js";
import { WorkletMessageType } from "./worklet-message.js";
import { AppTransaction, UndoManager } from "../app/undo-manager.js";

const UNDO_ID = "instrument";
const UndoType = Object.freeze({
    addInstrument: "add", 
    removeInstrument: "remove", 
});

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
    /** @type {number} */
    index;

    /** @type {InstrumentType} */
    type;

    /** @type {string} */
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
    constructor(type, name) {
        this.type = type;
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

    serialize() {
        return {
            index: this.index,
            type: this.type,
            name: this.name,
            notes: this.notes,
            noteIdCounter: this.noteIdCounter,
        };
    }

    static deserialize(json) {
        const newInstrument = new Instrument(json.type, json.name);

        newInstrument.index = json.index;
        newInstrument.notes = json.notes;
        newInstrument.noteIdCounter = json.noteIdCounter;

        return newInstrument;
    }
}

export class InstrumentsContainer {
    /** @type {UndoManager} */
    undoManager;    

    /** @type {Instrument[]} */
    instruments = [];

    /** @type {number} */
    selectedIndex = 0;

    /**
     * @type {(() => void)[][]}
     */
    instrumentEventListeners = [];

    /**
     * @param {UndoManager} undoManager 
     */
    constructor(undoManager) {
        this.undoManager = undoManager;
        this.undoManager.addListener(UNDO_ID, this);

        // Initialize listeners list
        for (const key of Object.keys(InstrumentEvent)) {
            this.instrumentEventListeners.push([]);
        }

        // TEMP:
        this.addInstrument(-1, InstrumentType.SineSynth, false);
    }

    /**
     * @param {number} instrumentIndex 
     * @param {InstrumentType} instrumentType
     * @param {boolean} addToUndo
     */
    addInstrument(instrumentIndex, instrumentType, addToUndo = true) {
        if (instrumentIndex < 0) {
            instrumentIndex = this.instruments.length;
        }

        const instrumentDetails = InstrumentDetailsList[instrumentType];
        const newInstrument = new Instrument(instrumentType, instrumentDetails.name);

        return this.addInstrumentInternal(newInstrument, newInstrument, addToUndo);
    }

    /**
     * @param {number} instrumentIndex 
     * @param {Instrument} newInstrument 
     * @param {boolean} addToUndo 
     */
    addInstrumentInternal(instrumentIndex, newInstrument, addToUndo = true) {
        this.instruments.push(newInstrument);
        this.updateInstrumentIndices();
        this.selectedIndex = newInstrument.index;

        getAudioWorkletNode().port.postMessage({
            type: WorkletMessageType.addInstrument,
            instrumentIndex: newInstrument.index,
            instrumentType: newInstrument.type,
        });

        if (addToUndo) {
            this.undoManager.push(new AppTransaction(
                UNDO_ID,
                UndoType.addInstrument,
                newInstrument.serialize(),
            ));
        }

        this.notifyListeners(InstrumentEvent.InstrumentsChanged);
        this.notifyListeners(InstrumentEvent.InstrumentSelected);

        return newInstrument;
    }

    /**
     * @param {number} instrumentIndex
     * @param {boolean} addToUndo
     */
    removeInstrument(instrumentIndex, addToUndo = true) {
        const removedInstrument = this.instruments.splice(instrumentIndex, 1)[0];
        this.updateInstrumentIndices();

        getAudioWorkletNode().port.postMessage({
            type: WorkletMessageType.removeInstrument,
            instrumentIndex: instrumentIndex,
        });

        if (this.selectedIndex >= instrumentIndex) {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        }

        if (addToUndo) {
            this.undoManager.push(new AppTransaction(
                UNDO_ID,
                UndoType.removeInstrument,
                removedInstrument.serialize(),
            ));
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

    /**
     * Override to handle undo events.
     * @param {AppTransaction} transaction 
     */
    undo(transaction) {
        switch (transaction.type) {
            case UndoType.addInstrument:
                this.removeInstrument(transaction.diff.index, false);
                break;
            case UndoType.removeInstrument: {
                const newInstrument = Instrument.deserialize(transaction.diff);
                this.addInstrumentInternal(newInstrument.index, newInstrument, false);
                break;
            }
        }        
    }

    /**
     * Override to handle redo events.
     * @param {AppTransaction} transaction 
     */
    redo(transaction) {
        switch (transaction.type) {
            case UndoType.addInstrument: {
                const newInstrument = Instrument.deserialize(transaction.diff);
                this.addInstrumentInternal(newInstrument.index, newInstrument, false);
                break;
            }
            case UndoType.removeInstrument:
                this.removeInstrument(transaction.diff.index, false);
                break;
        }        
    }
}