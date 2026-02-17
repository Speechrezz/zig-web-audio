import { getAudioWorkletNode } from "./audio.js";
import { Instrument } from "./instrument.js";
import { WorkletMessageType } from "./worklet-message.js";

/**
 * AudioParameter state
 * @typedef {object} ParameterState
 * @property {number} index
 * @property {string} id
 * @property {string} name
 * @property {number} value_min
 * @property {number} value_max
 * @property {number} value_default
 * @property {number} value_normalized
 * @property {number} value
 */

export class AudioParameter {
    /** @type {ParameterState} */
    state;

    /** @type {Instrument} */
    instrument;

    /** @type {((stateCount: number) => void)[]} */
    listeners = [];

    /**
     * Increments each time the state changes, useful for syncing threads.
     * @type {number}
     */
    stateCount = 0;

    /**
     * @param {ParameterState} state 
     * @param {Instrument} instrument 
     */
    constructor(state, instrument) {
        this.state = state;
        this.instrument = instrument;
        console.log("[AudioParameter.constructor()] state:", this.state);
    }

    get() {
        return this.state.value;
    }

    getNormalized() {
        return this.state.value_normalized;
    }

    set(newValue, isNormalized) {
        getAudioWorkletNode().port.postMessage({
            type: WorkletMessageType.setParameterValue,
            context: {
                instrumentIndex: this.instrument.index,
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