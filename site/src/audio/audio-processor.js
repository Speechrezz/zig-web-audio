import { WasmContainer } from "../core/wasm.js";
import { ParameterContainer } from "./audio-parameter.js";

export class AudioProcessor {
    /** @type {WasmContainer} */
    wasm;

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

        this.id = spec.id;
        this.kind = spec.kind;
        this.name = spec.name;

        this.params = ParameterContainer.initFromSpec(wasm, spec.parameters);
    }
}