import { Note, NoteEvent } from "./note.js";
import { WasmContainer } from "../core/wasm.js";
import { AudioProcessor } from "./audio-processor.js";
import { Device } from "./device.js";

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

export class Track extends AudioProcessor {
    /** @type {number} */
    index;

    /** @type {string} */
    name;

    /** @type {null | Device} */
    generatorDevice = null;

    /** @type {Device[]} */
    effectDeviceList = [];

    /**
     * All the drawn/saved notes
     * @type {Note[]}
     */
    notes = [];

    /**
     * Counts note IDs to ensure unique IDs
     * @type {number}
     */
    nextNoteId = 0;

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
     * @param {string} name 
     * @param {AudioProcessorSpec} spec 
     */
    constructor(wasm, index, name, spec) {
        super(wasm, spec);
        this.index = index;
        this.name = name;

        if (spec.generator !== null) {
            this.generatorDevice = new Device(wasm, spec.generator);
        }
    }

    deinit() {
        this.params.deinit();
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
        this.nextNoteId++;
        return this.nextNoteId - 1;
    }

    /**
     * @param {any} serializationContext 
     */
    save(serializationContext) {
        /** @type {any} */
        const json = super.save(serializationContext);

        json.nextNoteId = this.nextNoteId;
        json.notes = this.notes.slice();

        return json;
    }

    /**
     * @param {any} serializationContext 
     * @param {any} mainState 
     * @param {any} audioState 
     */
    load(serializationContext, mainState, audioState) {
        super.load(serializationContext, mainState, audioState);

        this.nextNoteId = mainState.nextNodeId || 0;
        this.notes = mainState.notes?.slice() || [];
    }
}