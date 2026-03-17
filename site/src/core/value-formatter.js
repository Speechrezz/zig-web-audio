import { WasmContainer } from "./wasm.js";

export class ValueFormatter {
    /** @type {WasmContainer} */
    wasm;
    /** @type {number} */
    wasmPtr;

    /**
     * 
     * @param {WasmContainer} wasm 
     * @param {number} wasmPtr 
     */
    constructor(wasm, wasmPtr) {
        this.wasm = wasm;
        this.wasmPtr = wasmPtr;
    }

    /**
     * @param {WasmContainer} wasm 
     * @param {FormatterSpec} spec 
     */
    static createFromSpec(wasm, spec) {
        const slice = wasm.allocAndCopyToWasmString(JSON.stringify(spec));
        const wasmPtr = wasm.exports.createValueFormatterFromJson(slice.ptr, slice.len);
        wasm.freeWasmString(slice);

        return new ValueFormatter(wasm, wasmPtr);
    }

    deinit() {
        this.wasm.exports.destroyValueFormatter(this.wasmPtr);
    }

    /**
     * @param {number} value 
     */
    textFromValue(value) {
        const packedSlice = this.wasm.exports.textFromValue(this.wasmPtr, value);
        return this.wasm.wasmSliceToString(packedSlice);
    }

    /**
     * @param {string} text 
     */
    valueFromText(text) {
        const slice = this.wasm.allocAndCopyToWasmString(text);
        const value = this.wasm.exports.valueFromText(this.wasmPtr, slice.ptr, slice.len);
        this.wasm.freeWasmString(slice);
        return value;
    }
}