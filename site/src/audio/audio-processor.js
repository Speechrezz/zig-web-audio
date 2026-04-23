import { WasmContainer } from "../core/wasm.js";
import { ParameterContainer } from "./audio-parameter.js";

export class AudioProcessor {
    /** @type {WasmContainer} */
    wasm;

    /** @type {number} */
    ptr;

    /** @type {ParameterContainer} */
    params;

    /** @type {number} */
    id;

    /** @type {string} */
    kind;

    /** @type {string} */
    name;

    /**
     * @param {WasmContainer} wasm 
     * @param {AudioProcessorSpec} spec 
     */
    constructor(wasm, spec) {
        this.wasm = wasm;

        this.ptr = spec.ptr;
        this.id = spec.id;
        this.kind = spec.kind;
        this.name = spec.name;

        this.params = ParameterContainer.initFromSpec(wasm, spec.parameters);
    }

    /**
     * @param {any} serializationContext 
     */
    save(serializationContext) {
        return {
            name: this.name,
        };
    }

    /**
     * @param {any} serializationContext 
     * @param {any} mainState 
     * @param {any} audioState 
     */
    load(serializationContext, mainState, audioState) {
        this.name = mainState.name;
    }
}