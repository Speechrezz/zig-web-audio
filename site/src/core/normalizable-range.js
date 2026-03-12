import { WasmContainer } from "./wasm.js";

/**
 * @typedef {object} RangeSpec
 * @property {string} type
 * @property {number} start
 * @property {number} end
 * @property {any} [ctx]
 */

export class NormalizableRange {
    /** @type {WasmContainer} */
    wasm;

    /** @type {number} */
    wasmPtr;

    /** @type {number} */
    start;
    /** @type {number} */
    end;

    /**
     * @param {WasmContainer} wasm 
     * @param {RangeSpec} spec 
     */
    constructor(wasm, spec) {
        this.wasm = wasm;

        const slice = this.wasm.allocAndCopyToWasmString(JSON.stringify(spec));
        this.wasmPtr = this.wasm.exports.createNormalizableRange(slice.ptr, slice.len);
        this.wasm.freeWasmString(slice);

        this.start = spec.start;
        this.end = spec.end;
    }

    deinit() {
        this.wasm.exports.destroyNormalizableRange(this.wasmPtr);
    }

    /**
     * @param {number} value 
     */
    toNormalized(value) {
        return this.wasm.exports.toNormalizedValue(this.wasmPtr, value);
    }

    /**
     * @param {number} value 
     */
    fromNormalized(value) {
        return this.wasm.exports.fromNormalizedValue(this.wasmPtr, value);
    }
}