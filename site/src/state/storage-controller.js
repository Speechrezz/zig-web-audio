import { postWorkletMessage } from "../audio/audio.js";
import { PlaybackEngine } from "../audio/playback-engine.js";
import { WorkletMessageType } from "../audio/worklet-message.js";

export class StorageController {
    /** @type {PlaybackEngine} */
    playbackEngine;

    latestSaveId = 0;
    latestLoadId = 0;

    /** @type {Map<number, StorageSaveCallback>} */
    saveCallbacks = new Map;

    /**
     * @param {PlaybackEngine} playbackEngine 
     */
    constructor(playbackEngine) {
        this.playbackEngine = playbackEngine;
    }

    // ---Global---

    /**
     * @param {StorageSaveCallback} callback 
     */
    saveState(callback) {
        const saveId = this.latestSaveId++;
        this.saveCallbacks.set(saveId, callback);

        postWorkletMessage({
            type: WorkletMessageType.saveState,
            callbackId: saveId,
        });
    }

    /**
     * @param {StorageLoadCallback} callback
     * @param {any} state 
     */
    loadState(callback, state) {
        // TODO
    }

    // ---Track---

    /**
     * @param {StorageSaveCallback} callback 
     * @param {number} index 
     */
    saveTrackState(callback, index) {
        const saveId = this.latestSaveId++;
        this.saveCallbacks.set(saveId, callback);

        postWorkletMessage({
            type: WorkletMessageType.saveTrackState,
            callbackId: saveId,
            trackIndex: index,
        });
    }

    /**
     * @param {StorageLoadCallback} callback
     * @param {number} index 
     * @param {any} state 
     */
    loadTrackState(callback, index, state) {
        // TODO
    }
}