import { UndoManager } from "../app/undo-manager.js";
import { getAudioWorkletNode } from "../audio/audio.js";
import { Track } from "../audio/track.js";
import { WorkletMessageType } from "../audio/worklet-message.js";
import { WasmContainer } from "../core/wasm.js";
import { DawEvent } from "./daw-constants.js";

export class TrackWrapper {
    /** @type {Track} */
    track;

    /**
     * @param {Track} track 
     */
    constructor(track) {
        this.track = track;
    }
}

export class DawController {
    /** @type {WasmContainer} */
    wasm;

    /** @type {UndoManager} */
    undoManager;    

    /** @type {TrackWrapper[]} */
    tracks = [];

    /** @type {null | number} */
    selectedTrackIndex = null;

    /** @type {DawEventListener[]} */
    dawEventListeners = [];

    /**
     * @param {WasmContainer} wasm 
     * @param {UndoManager} undoManager 
     */
    constructor(wasm, undoManager) {
        this.wasm = wasm;
        this.undoManager = undoManager;
    }

    // --AudioWorklet--

    initializeAudio() {
        // Listen to audio worklet
        const node = /** @type {AudioWorkletNode} */ (getAudioWorkletNode());
        node.port.addEventListener("message", (ev) => this.audioWorkletCallback(ev));
    }

    /**
     * @param {MessageEvent} ev 
     */
    audioWorkletCallback(ev) {
        switch (ev.data.type) {
            case WorkletMessageType.insertTrack:
                this.insertTrackCallback(ev);
                break;
        }
    }

    /**
     * @param {MessageEvent} ev 
     */
    insertTrackCallback(ev) {
        console.log("[DawController.insertTrackCallback]: TODO", ev);
    }

    // --Listeners--

    /**
     * @param {DawEventListener} callback 
     */
    addListener(callback) {
        this.dawEventListeners.push(callback);
    }

    /**
     * @param {DawEventListener} callback 
     */
    removeListener(callback) {
        const index = this.dawEventListeners.indexOf(callback);
        this.dawEventListeners.splice(index, 1);
    }

    /**
     * @param {DawEvent} ev 
     * @param {any} ctx
     */
    notifyListeners(ev, ctx) {
        for (const callback of this.dawEventListeners) {
            callback(ev, ctx);
        }
    }
}