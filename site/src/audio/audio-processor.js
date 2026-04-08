import { WasmContainer } from "../core/wasm.js";
import { ParameterContainer } from "./audio-parameter.js";

export class AudioProcessor {
    /** @type {WasmContainer} */
    wasm;

    /** @type {AudioProcessorSpec} */
    spec;

    /** @type {ParameterContainer} */
    params;

    /**
     * @param {WasmContainer} wasm 
     * @param {AudioProcessorSpec} spec 
     */
    constructor(wasm, spec) {
        this.wasm = wasm;
        this.spec = spec;

        this.params = ParameterContainer.initFromSpec(wasm, this.spec.parameters);
    }
}