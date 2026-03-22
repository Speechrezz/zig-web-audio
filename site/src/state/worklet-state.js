import { postWorkletMessage } from "../audio/audio.js";
import { PlaybackEngine } from "../audio/playback-engine.js";
import { WorkletMessageType } from "../audio/worklet-message.js";

export class WorkletState {
    latestSaveId = 0;
    latestLoadId = 0;

    /** @type {Map<number, StorageSaveEntry>} */
    saveCallbacks = new Map;
    /** @type {Map<number, StorageLoadEntry>} */
    loadCallbacks = new Map;


    /**
     * Call right after the AudioWorkletNode has been initialized
     * @param {AudioWorkletNode} node 
     */
    workletInitialized(node) {
        node.port.addEventListener("message", (ev) => this.workletEventCallback(ev));
    }

    /**
     * @param {MessageEvent} ev 
     */
    workletEventCallback(ev) {
        switch (ev.data.type) {
            case WorkletMessageType.saveState:
            case WorkletMessageType.saveTrackState: {
                const entry = this.saveCallbacks.get(ev.data.callbackId);
                if (entry) {
                    this.saveCallbacks.delete(ev.data.callbackId);
                    const state = JSON.parse(ev.data.stateString);
                    entry.callback(state, entry.ctx);
                }
                else {
                    console.error(`[StorageController] Could not find save callback! (id=${ev.data.callbackId})`);
                }
                break;
            }

            case WorkletMessageType.loadState:
            case WorkletMessageType.loadTrackState: {
                const entry = this.loadCallbacks.get(ev.data.callbackId);
                if (entry) {
                    this.loadCallbacks.delete(ev.data.callbackId);
                    entry.callback(ev.data.success, entry.ctx);
                }
                else {
                    console.error(`[StorageController] Could not find load callback! (id=${ev.data.callbackId})`);
                }
                break;
            }
        }
    }

    // ---Global---

    /**
     * @param {StorageSaveCallback} callback 
     * @param {any} ctx 
     */
    saveState(callback, ctx = {}) {
        const saveId = this.latestSaveId++;

        if (postWorkletMessage({
            type: WorkletMessageType.saveState,
            callbackId: saveId,
        })) {
            this.saveCallbacks.set(saveId, {callback, ctx});
        }
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
     * @param {number} index Track index
     * @param {any} ctx 
     */
    saveTrackState(callback, index, ctx = {}) {
        ctx.trackIndex = index;
        const saveId = this.latestSaveId++;

        if (postWorkletMessage({
            type: WorkletMessageType.saveTrackState,
            callbackId: saveId,
            trackIndex: index,
        })) {
            this.saveCallbacks.set(saveId, {callback, ctx});
        }
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