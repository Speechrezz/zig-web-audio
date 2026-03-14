import { ParameterProxy } from "../canvas/framework/parameter-proxy.js";
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

    /** @type {(() => void)[]} */
    listeners = [];

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

    getValue() {
        return this.convertFromNormalized(this.state.value_normalized);
    }

    getNormalizedValue() {
        return this.state.value_normalized;
    }

    /**
     * @param {number} value 
     */
    convertToNormalized(value) {
        return this.range.toNormalized(value);
    }

    /**
     * @param {number} value 
     */
    convertFromNormalized(value) {
        return this.range.fromNormalized(value);
    }

    /**
     * @param {number} newValue 
     * @param {boolean} isNormalized 
     */
    set(newValue, isNormalized) {
        if (isNormalized) {
            this.state.value_normalized = newValue;
            this.state.value = this.convertFromNormalized(newValue);
        }
        else {
            this.state.value = newValue;
            this.state.value_normalized = this.convertToNormalized(newValue);
        }

        for (const listener of this.listeners)
            listener();

        getAudioWorkletNode().port.postMessage({
            type: WorkletMessageType.setParameterValue,
            context: {
                trackIndex: this.track.index,
                parameterIndex: this.state.index,
                value: newValue,
                isNormalized,
            }
        });
    }

    /**
     * @param {() => void} listener 
     */
    addListener(listener) {
        this.listeners.push(listener);
    }

    /**
     * @param {() => void} listener 
     */
    removeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index !== -1)
            this.listeners.splice(index, 1);
    }

    /**
     * @param {number} value 
     * @param {number} valueNormalized 
     */
    updateFromAudioThread(value, valueNormalized) {
        this.state.value = value;
        this.state.value_normalized = valueNormalized;

        for (const listener of this.listeners)
            listener();
    }

    updateBackendState() {
        this.set(this.state.value_normalized, true);
    }

    /**
     * @param {undefined | (() => void)} listener 
     */
    createProxy(listener) {
        const proxy = new ParameterProxy;
        
        proxy.ctx.audioParameter = (this);

        proxy.value = this.state.value;
        proxy.valueNormalized = this.state.value_normalized;
        proxy.valueMin = this.range.start;
        proxy.valueMax = this.range.end;
        proxy.valueDefault = this.state.value_default;

        if (listener !== undefined) {
            proxy.ctx.parameterListener = () => {
                proxy.value = this.state.value;
                proxy.valueNormalized = this.state.value_normalized;
                listener();
            }

            this.addListener(proxy.ctx.parameterListener);
            proxy.deinit = () => this.removeListener(proxy.ctx.parameterListener);
        }

        proxy.toNormalizedValue = (value) => this.convertToNormalized(value);
        proxy.fromNormalizedValue = (value) => this.convertFromNormalized(value);

        proxy.setValue = (value) => this.set(value, false);
        proxy.setNormalizedValue = (value) => this.set(value, true);

        return proxy;
    }
}