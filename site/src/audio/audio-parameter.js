import { ParameterProxy } from "../canvas/framework/parameter-proxy.js";
import { NormalizableRange } from "../core/normalizable-range.js";
import { WasmContainer } from "../core/wasm.js";
import { getAudioWorkletNode } from "./audio.js";
import { Track } from "./track.js";
import { WorkletMessageType } from "./worklet-message.js";

/**
 * AudioParameter spec
 * @typedef {object} ParameterSpec
 * @property {number} processor_ptr
 * @property {number} index
 * @property {string} id
 * @property {string} name
 * @property {any} range
 * @property {number} value_default
 */

export class AudioParameter {
    /** @type {ParameterSpec} */
    spec;

    /** @type {NormalizableRange} */
    range;

    /** @type {number} */
    value;

    /** @type {number} */
    valueNormalized;

    /** @type {(() => void)[]} */
    listeners = [];

    /**
     * @param {WasmContainer} wasm 
     * @param {ParameterSpec} spec 
     * @param {undefined | number} valueNormalized 
     */
    constructor(wasm, spec, valueNormalized = undefined) {
        this.spec = spec;
        this.range = NormalizableRange.createFromSpec(wasm, spec.range);

        if (valueNormalized === undefined) {
            this.value = this.spec.value_default;
            this.valueNormalized = this.convertToNormalized(this.spec.value_default);
        }
        else {
            this.value = this.convertFromNormalized(valueNormalized);
            this.valueNormalized = valueNormalized;
        }

        console.log("[AudioParameter.constructor()] state:", this);
    }

    deinit() {
        this.range.deinit();
    }

    getId() {
        return this.spec.id;
    }

    getName() {
        return this.spec.name;
    }

    getValue() {
        return this.value;
    }

    getNormalizedValue() {
        return this.valueNormalized;
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
            this.value = this.convertFromNormalized(newValue);
            this.valueNormalized = this.range.clampNormalized(newValue);
        }
        else {
            this.value = this.range.clampValue(newValue);
            this.valueNormalized = this.convertToNormalized(newValue);
        }

        for (const listener of this.listeners)
            listener();

        getAudioWorkletNode().port.postMessage({
            type: WorkletMessageType.setParameterValueNormalized,
            context: {
                processorPtr: this.spec.processor_ptr,
                parameterIndex: this.spec.index,
                value: this.valueNormalized,
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

    updateAudioState() {
        this.set(this.valueNormalized, true);
    }

    createProxy() {
        const proxy = new ParameterProxy;
        
        proxy.ctx.audioParameter = (this);

        proxy.value = this.value;
        proxy.valueNormalized = this.valueNormalized;
        proxy.valueMin = this.range.start;
        proxy.valueMax = this.range.end;
        proxy.valueDefault = this.spec.value_default;

        proxy.ctx.parameterListener = () => {
            proxy.value = this.value;
            proxy.valueNormalized = this.valueNormalized;
            proxy.onValueChange();
        }

        this.addListener(proxy.ctx.parameterListener);
        proxy.deinit = () => this.removeListener(proxy.ctx.parameterListener);

        proxy.toNormalizedValue = (value) => this.convertToNormalized(value);
        proxy.fromNormalizedValue = (value) => this.convertFromNormalized(value);

        proxy.setValue = (value) => this.set(value, false);
        proxy.setNormalizedValue = (value) => this.set(value, true);

        return proxy;
    }
}

export class ParameterContainer {
    /** @type {AudioParameter[]} */
    list = [];

    /** @type {Map<string, AudioParameter>} */
    map = new Map();

    /**
     * @param {WasmContainer} wasm 
     * @param {number} processorPtr 
     * @param {ParameterSpec[]} paramsSpec 
     */
    static initFromSpec(wasm, processorPtr, paramsSpec) {
        const params = new ParameterContainer;

        for (const paramSpec of paramsSpec) {
            paramSpec.processor_ptr = processorPtr;
            const param = new AudioParameter(wasm, paramSpec);
            params.list.push(param);
            params.map.set(paramSpec.id, param);
        }

        return params;
    }

    deinit() {
        for (const param of this.list) {
            param.deinit();
        }
    }

    /**
     * @param {number} index 
     */
    getIndex(index) {
        return this.list[index];
    }

    /**
     * @param {string} id 
     */
    getId(id) {
        return this.map.get(id);
    }
}