import { NormalizableRange } from "../core/normalizable-range.js";
import { WasmContainer } from "../core/wasm.js";
import { getAudioWorkletNode } from "./audio.js";
import { Track } from "./track.js";
import { WorkletMessageType } from "./worklet-message.js";

/**
 * AudioParameter state
 * @typedef {object} ParameterState
 * @property {number} index
 * @property {string} id
 * @property {string} name
 * @property {any} range
 * @property {number} value_default
 * @property {number} value_normalized
 * @property {number} value
 */

export class AudioParameter {
    /** @type {ParameterState} */
    state;

    /** @type {NormalizableRange} */
    range;

    /** @type {Track} */
    track;

    /** @type {((stateCount: number) => void)[]} */
    listeners = [];

    /**
     * Increments each time the state changes, useful for syncing threads.
     * @type {number}
     */
    stateCount = 0;

    /**
     * @param {WasmContainer} wasm 
     * @param {ParameterState} state 
     * @param {Track} track 
     */
    constructor(wasm, state, track) {
        this.state = state;
        this.track = track;

        this.range = NormalizableRange.createFromSpec(wasm, state.range);

        console.log("[AudioParameter.constructor()] state:", this.state, this.range);
    }

    deinit() {
        this.range.deinit();
    }

    get() {
        return this.state.value;
    }

    getNormalized() {
        return this.state.value_normalized;
    }

    /**
     * @param {number} newValue 
     * @param {boolean} isNormalized 
     */
    set(newValue, isNormalized) {
        getAudioWorkletNode().port.postMessage({
            type: WorkletMessageType.setParameterValue,
            context: {
                trackIndex: this.track.index,
                parameterIndex: this.state.index,
                value: newValue,
                isNormalized,
                stateCount: this.stateCount++,
            }
        });
    }

    /**
     * @param {(stateCount: number) => void} listener 
     */
    addListener(listener) {
        this.listeners.push(listener);
    }

    /**
     * @param {(stateCount: number) => void} listener 
     */
    removeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index !== -1)
            this.listeners.splice(index, 1);
    }

    /**
     * @param {number} value 
     * @param {number} valueNormalized 
     * @param {number} stateCount 
     */
    updateFromAudioThread(value, valueNormalized, stateCount) {
        this.state.value = value;
        this.state.value_normalized = valueNormalized;

        for (const listener of this.listeners)
            listener(stateCount);
    }

    updateBackendState() {
        this.set(this.state.value_normalized, true);
    }
}