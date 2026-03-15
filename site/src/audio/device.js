import { WasmContainer } from "../core/wasm.js";
import { AudioProcessor } from "./audio-processor.js";

export class Device extends AudioProcessor {
    /**
     * @param {WasmContainer} wasm 
     * @param {AudioProcessorSpec} spec 
     */
    constructor(wasm, spec) {
        super(wasm, spec);
    }
}