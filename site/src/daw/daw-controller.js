import { AppTransaction, UndoManager } from "../app/undo-manager.js";
import { processorDetails, ProcessorKind } from "../audio/audio-constants.js";
import { getAudioWorkletNode, postWorkletMessage } from "../audio/audio.js";
import { Track } from "../audio/track.js";
import { WorkletMessageType } from "../audio/worklet-message.js";
import { WasmContainer } from "../core/wasm.js";
import { DawEvent } from "./daw-constants.js";
import { DawStorage } from "./daw-storage.js";

export class DawController {
    /** @type {WasmContainer} */
    wasm;

    /** @type {UndoManager} */
    undoManager;    

    /** @type {Track[]} */
    tracks = [];

    /** @type {null | number} */
    selectedTrackIndex = null;

    /** @type {DawEventListener[]} */
    dawEventListeners = [];

    /** @type {DawStorage} */
    storage = new DawStorage;

    /**
     * @param {WasmContainer} wasm 
     * @param {UndoManager} undoManager 
     */
    constructor(wasm, undoManager) {
        this.wasm = wasm;
        this.undoManager = undoManager;
    }

    // --AudioWorklet--

    /**
     * @param {AudioWorkletNode} node 
     */
    initializeAudio(node) {
        node.port.addEventListener("message", (ev) => this.audioWorkletCallback(ev));
    }

    /**
     * @param {MessageEvent} ev 
     */
    audioWorkletCallback(ev) {
        switch (ev.data.type) {
            case WorkletMessageType.saveState:
                this.saveStateCallback(ev);
                break;
            case WorkletMessageType.loadState:
                this.loadStateCallback(ev);
                break;
            case WorkletMessageType.insertTrack:
                this.insertTrackCallback(ev);
                break;
            case WorkletMessageType.removeTrack:
                this.removeTrackCallback(ev);
                break;
        }
    }

    // --Global--

    /**
     * @param {StorageSaveCallback} callback 
     * @param {any} ctx 
     */
    saveState(callback, ctx = {}) {
        this.storage.pushRequest({storageFn: () => this.saveStateImpl(), entry: {callback, ctx}})
    }
    saveStateImpl() {
        postWorkletMessage({type: WorkletMessageType.saveState});
    }
    /**
     * @param {MessageEvent} ev 
     */
    saveStateCallback(ev) {
        const state = JSON.parse(ev.data.stateString);
        this.storage.finishedSave(state);
    }

    /**
     * @param {StorageLoadCallback} callback 
     * @param {any} ctx 
     * @param {any} state 
     */
    loadState(callback, ctx = {}, state) {
        console.log("[loadState]");
        this.storage.pushRequest({storageFn: () => this.loadStateImpl(state), entry: {callback, ctx}})
    }
    /**
     * @param {any} state 
     */
    loadStateImpl(state) {
        console.log("[loadStateImpl]");
        postWorkletMessage({
            type: WorkletMessageType.loadState,
            state,
        });
    }
    /**
     * @param {MessageEvent} ev 
     */
    loadStateCallback(ev) {
        console.log("[loadStateCallback]");
        this.storage.finishedLoad(ev.data.success);
    }

    // --Track--

    updateTrackIndices() {
        for (let i = 0; i < this.tracks.length; i++) {
            this.tracks[i].index = i;
        }
    }

    /**
     * @param {number} trackIndex 
     * @param {ProcessorKind} processorKind
     */
    addInstrument(trackIndex, processorKind) {
        if (trackIndex < 0) {
            trackIndex = this.tracks.length;
        }

        const trackName = processorDetails[processorKind].name;

        const node = /** @type {AudioWorkletNode} */ (getAudioWorkletNode());
        node.port.postMessage({
            type: WorkletMessageType.addInstrument,
            ctx: {
                trackIndex,
                processorKind,
                name: trackName,
            },
        });
    }

    /**
     * @param {MessageEvent} ev 
     */
    insertTrackCallback(ev) {
        if (ev.data.success !== true) {
            console.error("Failed to add track.", ev);
            return;
        }

        const trackSpec = JSON.parse(ev.data.spec);
        const trackName = ev.data.ctx.name;
        const trackIndex = ev.data.ctx.trackIndex;
        console.log("[insertTrackCallback] spec:", trackSpec);

        const track = new Track(this.wasm, trackIndex, trackName, trackSpec);

        this.tracks.splice(trackIndex, 0, track);
        this.updateTrackIndices();
        this.selectedTrackIndex = track.index;

        console.log("[insertTrackCallback] Added track:", track);

        // TODO: Add to UndoManager
        // this.undoManager.push(new AppTransaction(
        //     UNDO_ID,
        //     UndoType.addInstrument,
        //     track.serialize(),
        // ));

        this.notifyListeners(DawEvent.TrackInserted, {idx: track.index});
        this.notifyListeners(DawEvent.TrackSelected, {idx: track.index});
    }

    /**
     * @param {number} trackIndex
     * @param {boolean} addToUndo
     */
    removeTrack(trackIndex, addToUndo = true) {
        const removedTrack = this.tracks.splice(trackIndex, 1)[0];
        removedTrack.deinit();
        this.updateTrackIndices();

        const node = /** @type {AudioWorkletNode} */ (getAudioWorkletNode());
        node.port.postMessage({
            type: WorkletMessageType.removeTrack,
            ctx: {
                trackIndex,
            },
        });

        if (this.selectedTrackIndex !== null && this.selectedTrackIndex >= trackIndex) {
            if (this.tracks.length === 0)
                this.selectedTrackIndex = null;
            else
                this.selectedTrackIndex = Math.max(0, this.selectedTrackIndex - 1);
        }

        // if (addToUndo) {
        //     this.undoManager.push(new AppTransaction(
        //         UNDO_ID,
        //         UndoType.removeInstrument,
        //         removedTrack.serialize(),
        //     ));
        // }

        this.notifyListeners(DawEvent.TrackSelected, {idx: trackIndex});
        this.notifyListeners(DawEvent.TrackRemoved, {idx: trackIndex});
    }

    /**
     * @param {MessageEvent} ev 
     */
    removeTrackCallback(ev) {
        if (ev.data.success !== true) {
            console.error("Failed to remove track.", ev);
            return;
        }
    }

    /**
     * @param {number} index 
     * @return {Track}
     */
    trackAt(index) {
        return this.tracks[index];
    }

    /**
     * @param {number} index 
     */
    selectTrack(index) {
        if (this.selectedTrackIndex === index) return;

        this.selectedTrackIndex = index;
        this.notifyListeners(DawEvent.TrackSelected, {idx: index});
    }

    getSelectedTrack() {
        if (this.selectedTrackIndex === null)
            return null;
        return this.tracks[this.selectedTrackIndex];
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