import { ParameterProxy } from "../canvas/framework/parameter-proxy.js";
import { ParameterSpec } from "../core/parameter-spec.js";
import { WasmContainer } from "../core/wasm.js";
import { getAudioWorkletNode } from "./audio.js";
import { WorkletMessageType } from "./worklet-message.js";

export class AudioParameter {
    /** @type {ParameterSpecFull} */
    specJson;

    /** @type {ParameterSpec} */
    spec;

    /** @type {number} */
    value;

    /** @type {number} */
    valueNormalized;

    /** @type {(() => void)[]} */
    listeners = [];

    /**
     * @param {WasmContainer} wasm 
     * @param {ParameterSpecFull} specJson 
     * @param {undefined | number} valueNormalized 
     */
    constructor(wasm, specJson, valueNormalized = undefined) {
        this.specJson = specJson;
        this.spec = ParameterSpec.createFromSpec(wasm, specJson.spec);

        if (valueNormalized === undefined) {
            this.value = this.specJson.value_default;
            this.valueNormalized = this.convertToNormalized(this.specJson.value_default);
        }
        else {
            this.value = this.convertFromNormalized(valueNormalized);
            this.valueNormalized = valueNormalized;
        }

        // console.log("[AudioParameter.constructor()] state:", this);
    }

    deinit() {
        this.spec.deinit();
    }

    getId() {
        return this.specJson.id;
    }

    getName() {
        return this.specJson.name;
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
        return this.spec.range.toNormalized(value);
    }

    /**
     * @param {number} value 
     */
    convertFromNormalized(value) {
        return this.spec.range.fromNormalized(value);
    }

    /**
     * @param {number} newValue 
     * @param {boolean} isNormalized 
     */
    set(newValue, isNormalized) {
        if (isNormalized) {
            this.value = this.convertFromNormalized(newValue);
            this.valueNormalized = this.spec.range.clampNormalized(newValue);
        }
        else {
            this.value = this.spec.range.clampValue(newValue);
            this.valueNormalized = this.convertToNormalized(newValue);
        }

        for (const listener of this.listeners)
            listener();

        const node = /** @type {AudioWorkletNode} */ (getAudioWorkletNode());
        node.port.postMessage({
            type: WorkletMessageType.setParameterValueNormalized,
            context: {
                containerPtr: this.specJson.container_ptr,
                parameterIndex: this.specJson.index,
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
        proxy.valueMin = this.spec.range.start;
        proxy.valueMax = this.spec.range.end;
        proxy.valueDefault = this.specJson.value_default;

        proxy.name = this.specJson.name;

        proxy.ctx.parameterListener = () => {
            proxy.value = this.value;
            proxy.valueNormalized = this.valueNormalized;
            proxy.onValueChange();
        }

        this.addListener(proxy.ctx.parameterListener);
        proxy.deinit = () => this.removeListener(proxy.ctx.parameterListener);

        proxy.toNormalizedValue = (value) => this.convertToNormalized(value);
        proxy.fromNormalizedValue = (value) => this.convertFromNormalized(value);

        proxy.textFromValue = (value) => this.spec.formatter.textFromValue(value);
        proxy.valueFromText = (text) => this.spec.formatter.valueFromText(text);

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
     * @param {ParameterContainerSpecFull} containerSpec 
     */
    static initFromSpec(wasm, containerSpec) {
        const params = new ParameterContainer;

        for (const paramSpec of containerSpec.list) {
            paramSpec.container_ptr = containerSpec.ptr;
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