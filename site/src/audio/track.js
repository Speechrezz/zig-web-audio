import { getAudioWorkletNode } from "./audio.js";
import { InstrumentDetailsList, InstrumentType, TrackEvent } from "./audio-constants.js";
import { WorkletMessageType } from "./worklet-message.js";
import { AppTransaction, UndoManager } from "../app/undo-manager.js";
import { Note, NoteEvent } from "./note.js";
import { AudioParameter } from "./audio-parameter.js"
import { WasmContainer } from "../core/wasm.js";

const UNDO_ID = "track";
const UndoType = Object.freeze({
    addInstrument: "add", 
    removeInstrument: "remove", 
});

class NoteNumberAndChannel {
    noteNumber = 0;
    channel = 0;

    /**
     * @param {number} noteNumber 
     * @param {number} channel 
     */
    constructor(noteNumber, channel = 0) {
        this.noteNumber = noteNumber;
        this.channel = channel;
    }

    /**
     * @param {number} noteNumber 
     * @param {number} channel 
     */
    eql(noteNumber, channel = 0) {
        return this.noteNumber === noteNumber
            && this.channel === channel;
    }
}

export class Track {
    /** @type {WasmContainer} */
    wasm;

    /** @type {number} */
    index;

    /** @type {InstrumentType} */
    type;

    /** @type {string} */
    name;

    /** @type {{parameters: any}} */
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
     * @param {WasmContainer} wasm 
     * @param {number} index 
     * @param {InstrumentType} type 
     * @param {string} name 
     * @param {any} state 
     */
    constructor(wasm, index, type, name, state) {
        this.wasm = wasm;
        this.index = index;
        this.type = type;
        this.name = name;
        this.state = state;

        // Initialize parameters
        for (const paramState of Object.values(this.state.parameters)) {
            const param = new AudioParameter(wasm, paramState, this);
            this.params.push(param);
            this.paramMap.set(paramState.id, param);
        }
    }

    deinit() {
        for (const param of this.params) {
            param.deinit();
        }
    }

    /**
     * @param {number} noteNumber 
     * @param {number} channel 
     */
    noteStart(noteNumber, channel) {
        const index = this.activeNotes.findIndex((v) => v.eql(noteNumber, channel));
        if (index === -1) {
            this.activeNotes.push(new NoteNumberAndChannel(noteNumber, channel));
        }
    }

    /**
     * @param {number} noteNumber 
     * @param {number} channel 
     */
    noteStop(noteNumber, channel) {
        const index = this.activeNotes.findIndex((v) => v.eql(noteNumber, channel));
        if (index >= 0) {
            this.activeNotes.splice(index, 1);
        }
    }

    /**
     * @param {number} noteNumber 
     * @param {number} channel 
     */
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

    /**
     * @param {WasmContainer} wasm 
     * @param {any} json 
     */
    static deserialize(wasm, json) {
        const track = new Track(wasm, json.index, json.type, json.name, json.state);
        track.noteIdCounter = json.noteIdCounter;

        for (const note of json.notes) {
            track.notes.push(Note.deserialize(note));
        }

        for (const param of track.params) {
            param.updateBackendState();
        }

        return track;
    }
}

export class TracksContainer {
    /** @type {WasmContainer} */
    wasm;

    /** @type {UndoManager} */
    undoManager;    

    /** @type {Track[]} */
    tracks = [];

    /** @type {null | number} */
    selectedIndex = null;

    /**
     * @type {(() => void)[][]}
     */
    instrumentEventListeners = [];

    /**
     * @param {WasmContainer} wasm 
     * @param {UndoManager} undoManager 
     */
    constructor(wasm, undoManager) {
        this.wasm = wasm;
        this.undoManager = undoManager;
        this.undoManager.addListener(UNDO_ID, this);

        // Initialize listeners list
        for (const key of Object.keys(TrackEvent)) {
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
            instrumentIndex = this.tracks.length;
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

        console.log("Track data:", ev.data.data);
        const data = ev.data.data;
        const trackSpec = data.spec;
        const instrumentType = data.context.instrumentType;
        const trackIndex = data.context.instrumentIndex;
        const addToUndo = data.context.addToUndo;
        const serialized = data.context.serialized;

        /** @type {Track} */
        let newInstrument;
        if (serialized === null) {
            const instrumentDetails = InstrumentDetailsList[instrumentType];
            newInstrument = new Track(this.wasm, trackIndex, instrumentType, instrumentDetails.name, trackSpec);
        }
        else { // Load existing instrument with existing state
            newInstrument = Track.deserialize(this.wasm, serialized);
        }

        this.tracks.splice(trackIndex, 0, newInstrument);
        this.updateTrackIndices();
        this.selectedIndex = newInstrument.index;

        if (addToUndo) {
            this.undoManager.push(new AppTransaction(
                UNDO_ID,
                UndoType.addInstrument,
                newInstrument.serialize(),
            ));
        }

        this.notifyListeners(TrackEvent.TracksChanged);
        this.notifyListeners(TrackEvent.TrackSelected);
    }

    /**
     * @param {number} trackIndex
     * @param {boolean} addToUndo
     */
    removeTrack(trackIndex, addToUndo = true) {
        const removedTrack = this.tracks.splice(trackIndex, 1)[0];
        removedTrack.deinit();
        this.updateTrackIndices();

        getAudioWorkletNode().port.postMessage({
            type: WorkletMessageType.removeTrack,
            instrumentIndex: trackIndex,
        });

        if (this.selectedIndex !== null && this.selectedIndex >= trackIndex) {
            if (this.tracks.length === 0)
                this.selectedIndex = null;
            else
                this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        }

        if (addToUndo) {
            this.undoManager.push(new AppTransaction(
                UNDO_ID,
                UndoType.removeInstrument,
                removedTrack.serialize(),
            ));
        }

        this.notifyListeners(TrackEvent.TrackSelected);
        this.notifyListeners(TrackEvent.TracksChanged);
    }

    updateTrackIndices() {
        for (let i = 0; i < this.tracks.length; i++) {
            this.tracks[i].index = i;
        }
    }

    /**
     * @param {number} index 
     * @return {Track} instrument
     */
    get(index) {
        return this.tracks[index];
    }

    /**
     * @param {number} index 
     */
    selectTrack(index) {
        if (this.selectedIndex === index) return;

        this.selectedIndex = index;
        this.notifyListeners(TrackEvent.TrackSelected);
    }

    getSelected() {
        if (this.selectedIndex === null)
            return null;
        return this.tracks[this.selectedIndex];
    }

    getList() {
        return this.tracks;
    }

    /**
     * @param {MessageEvent} ev 
     */
    setParameterValueCallback(ev) {
        const data = ev.data.data;
        const trackIndex = data.context.trackIndex;
        const parameterIndex = data.context.parameterIndex;

        const { value, normalized: valueNormalized } = data.state;

        const param = this.tracks[trackIndex].params[parameterIndex];
        param.updateFromAudioThread(value, valueNormalized);
    }

    /**
     * @param {TrackEvent} eventType 
     * @param {() => void} callback 
     */
    addListener(eventType, callback) {
        this.instrumentEventListeners[eventType].push(callback);
    }

    /**
     * @param {TrackEvent} eventType 
     * @param {() => void} callback 
     */
    removeListener(eventType, callback) {
        const listeners = this.instrumentEventListeners[eventType];
        const index = listeners.indexOf(callback);
        listeners.splice(index, 1);
    }

    /**
     * @param {TrackEvent} eventType 
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
                this.removeTrack(transaction.diff.index, false);
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
                this.removeTrack(transaction.diff.index, false);
                break;
        }        
    }
}