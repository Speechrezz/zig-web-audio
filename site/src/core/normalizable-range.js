import { WasmContainer } from "./wasm";

/**
 * @typedef {object} RangeSpec
 * @property {string} type
 * @property {number} start
 * @property {number} end
 * @property {any} ctx
 */

export class NormalizableRange {
    /** @type {WasmContainer} */
    wasm;

    /** @type {number} */
    // wasmRange;

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
        // this.wasmRange = this.wasm.exports.createNormalizableRange();

        this.start = spec.start;
        this.end = spec.end;
    }

}