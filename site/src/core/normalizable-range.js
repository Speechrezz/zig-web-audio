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
     * 
     * @param {WasmContainer} wasm 
     * @param {number} wasmPtr 
     * @param {number} start 
     * @param {number} end 
     */
    constructor(wasm, wasmPtr, start, end) {
        this.wasm = wasm;
        this.wasmPtr = wasmPtr;
        this.start = start;
        this.end = end;
    }

    /**
     * @param {WasmContainer} wasm 
     * @param {RangeSpec} spec 
     */
    static createFromSpec(wasm, spec) {
        const slice = wasm.allocAndCopyToWasmString(JSON.stringify(spec));
        const wasmPtr = wasm.exports.createNormalizableRangeFromJson(slice.ptr, slice.len);
        wasm.freeWasmString(slice);

        return new NormalizableRange(wasm, wasmPtr, spec.start, spec.end);
    }

    /**
     * @param {WasmContainer} wasm 
     * @param {number} start 
     * @param {number} end 
     */
    static createLinear(wasm, start, end) {
        const wasmPtr = wasm.exports.createNormalizableRangeLinear(start, end);
        return new NormalizableRange(wasm, wasmPtr, start, end);
    }

    /**
     * @param {WasmContainer} wasm 
     * @param {number} start 
     * @param {number} end 
     * @param {number} centerPoint 
     */
    static createSkewedCenter(wasm, start, end, centerPoint) {
        const wasmPtr = wasm.exports.createNormalizableRangeSkewedCenter(start, end, centerPoint);
        return new NormalizableRange(wasm, wasmPtr, start, end);
    }

    deinit() {
        this.wasm.exports.destroyNormalizableRange(this.wasmPtr);
    }

    /**
     * @param {number} value 
     * @returns {number} 
     */
    toNormalized(value) {
        return this.wasm.exports.toNormalizedValue(this.wasmPtr, value);
    }

    /**
     * @param {number} value 
     * @returns {number} 
     */
    fromNormalized(value) {
        return this.wasm.exports.fromNormalizedValue(this.wasmPtr, value);
    }
}