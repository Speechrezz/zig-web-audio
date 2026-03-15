import { WasmContainer } from "../core/wasm";
import { AudioProcessor } from "./audio-processor";

export class Device extends AudioProcessor {
    /**
     * @param {WasmContainer} wasm 
     * @param {AudioProcessorSpec} spec 
     */
    constructor(wasm, spec) {
        super(wasm, spec);
    }
}