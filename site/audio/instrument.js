import { getAudioWorkletNode } from "./audio.js";
import { InstrumentDetailsList, InstrumentType, InstrumentEvent } from "./audio-constants.js";
import { WorkletMessageType } from "./worklet-message.js";
import { AppTransaction, UndoManager } from "../app/undo-manager.js";
import { Note } from "./note.js";
import { AudioParameter } from "./audio-parameter.js"

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

    /** @type {{params: any}} */
    state;

    /** @type {AudioParameter[]} */
    params = [];

    /** @type {Map<string, AudioParameter>} */
    paramMap = new Map();

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
     * @param {InstrumentType} type 
     * @param {string} name 
     * @param {any} state 
     */
    constructor(type, name, state) {
        this.type = type;
        this.name = name;
        this.state = state;

        // Initialize parameters
        for (const paramState of Object.values(this.state.params)) {
            const param = new AudioParameter(paramState, this);
            this.params.push(param);
            this.paramMap.set(paramState.id, param);
        }
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
            state: this.state,
            notes: this.notes,
            noteIdCounter: this.noteIdCounter,
        };
    }

    static deserialize(json) {
        const newInstrument = new Instrument(json.type, json.name, json.state);

        newInstrument.index = json.index;
        newInstrument.noteIdCounter = json.noteIdCounter;

        for (const note of json.notes) {
            newInstrument.notes.push(Note.deserialize(note));
        }

        return newInstrument;
    }
}

export class InstrumentsContainer {
    /** @type {UndoManager} */
    undoManager;    

    /** @type {Instrument[]} */
    instruments = [];

    /** @type {null | number} */
    selectedIndex = null;

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

        // Listen to audio worklet
        getAudioWorkletNode().port.addEventListener("message", (ev) => this.audioWorkletCallback(ev));
    }

    /**
     * @param {MessageEvent} ev 
     */
    audioWorkletCallback(ev) {
        switch (ev.data.type) {
            case WorkletMessageType.addInstrument:
                this.addInstrumentCallback(ev);
                break;
            case WorkletMessageType.setParameterValue:
                this.setParameterValueCallback(ev);
                break;
        }
    }

    /**
     * @param {number} instrumentIndex 
     * @param {InstrumentType} instrumentType
     * @param {boolean} addToUndo
     * @param {null | any} serialized
     */
    addInstrument(instrumentIndex, instrumentType, addToUndo = true, serialized = null) {
        if (instrumentIndex < 0) {
            instrumentIndex = this.instruments.length;
        }

        getAudioWorkletNode().port.postMessage({
            type: WorkletMessageType.addInstrument,
            context: {
                instrumentIndex,
                instrumentType,
                addToUndo,
                serialized,
            }
        });
    }

    /**
     * @param {MessageEvent} ev 
     */
    addInstrumentCallback(ev) {
        if (ev.data.type !== WorkletMessageType.addInstrument) return;

        if (ev.data.success !== true) {
            console.error("Failed to add instrument.", ev);
            return;
        }

        console.log("instrument data:", ev.data.data);
        const data = ev.data.data;
        const instrumentState = data.state;
        const instrumentType = data.context.instrumentType;
        const instrumentIndex = data.context.instrumentIndex;
        const addToUndo = data.context.addToUndo;
        const serialized = data.context.serialized;

        /** @type {Instrument} */
        let newInstrument;
        if (serialized === null) {
            const instrumentDetails = InstrumentDetailsList[instrumentType];
            newInstrument = new Instrument(instrumentType, instrumentDetails.name, instrumentState);
        }
        else { // Load existing instrument with existing state
            newInstrument = Instrument.deserialize(serialized);
        }

        this.instruments.splice(instrumentIndex, 0, newInstrument);
        this.updateInstrumentIndices();
        this.selectedIndex = newInstrument.index;

        if (addToUndo) {
            this.undoManager.push(new AppTransaction(
                UNDO_ID,
                UndoType.addInstrument,
                newInstrument.serialize(),
            ));
        }

        this.notifyListeners(InstrumentEvent.InstrumentsChanged);
        this.notifyListeners(InstrumentEvent.InstrumentSelected);
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
            if (this.instruments.length === 0)
                this.selectedIndex = null;
            else
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
        if (this.selectedIndex === null)
            return null;
        return this.instruments[this.selectedIndex];
    }

    getList() {
        return this.instruments;
    }

    /**
     * @param {MessageEvent} ev 
     */
    setParameterValueCallback(ev) {
        const data = ev.data.data;
        const instrumentIndex = data.context.instrumentIndex;
        const parameterIndex = data.context.parameterIndex;

        const { value, normalized: valueNormalized } = data.state;

        const param = this.instruments[instrumentIndex].params[parameterIndex];
        param.updateInternalValue(value, valueNormalized);
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
                this.addInstrument(transaction.diff.index, transaction.diff.type, false, transaction.diff);
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
                this.addInstrument(transaction.diff.index, transaction.diff.type, false, transaction.diff);
                break;
            }
            case UndoType.removeInstrument:
                this.removeInstrument(transaction.diff.index, false);
                break;
        }        
    }
}