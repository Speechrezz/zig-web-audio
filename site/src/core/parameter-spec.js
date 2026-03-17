import { NormalizableRange } from "./normalizable-range.js";
import { ParameterProxy } from "../canvas/framework/parameter-proxy.js";
import { ValueFormatter } from "./value-formatter.js";
import { WasmContainer } from "./wasm.js";

export class ParameterSpec {
    /** @type {WasmContainer} */
    wasm;

    /** @type {number} */
    wasmPtr;

    /** @type {NormalizableRange} */
    range;

    /** @type {ValueFormatter} */
    formatter;

    /**
     * @param {WasmContainer} wasm 
     * @param {number} wasmPtr 
     * @param {NormalizableRange} range 
     * @param {ValueFormatter} formatter 
     */
    constructor(wasm, wasmPtr, range, formatter) {
        this.wasm = wasm;
        this.wasmPtr = wasmPtr;
        this.range = range;
        this.formatter = formatter;
    }

    /**
     * @param {WasmContainer} wasm 
     * @param {ParameterSpecJson} spec 
     */
    static createFromSpec(wasm, spec) {
        const slice = wasm.allocAndCopyToWasmString(JSON.stringify(spec));
        const wasmPtr = wasm.exports.createParameterSpecFromJson(slice.ptr, slice.len);
        wasm.freeWasmString(slice);

        const rangePtr = wasm.exports.getRangeFromParameterSpec(wasmPtr);
        const formatterPtr = wasm.exports.getFormatterFromParameterSpec(wasmPtr);

        const range = new NormalizableRange(wasm, rangePtr, spec.range.start, spec.range.end);
        const formatter = new ValueFormatter(wasm, formatterPtr);

        return new ParameterSpec(wasm, wasmPtr, range, formatter);
    }

    deinit() {
        this.wasm.exports.destroyParameterSpec(this.wasmPtr);
    }

    createProxy() {
        const proxy = new ParameterProxy;
        proxy.deinit = () => this.deinit();

        proxy.valueMin = this.range.start;
        proxy.valueMax = this.range.end;

        proxy.toNormalizedValue = (value) => this.range.toNormalized(value);
        proxy.fromNormalizedValue = (value) => this.range.fromNormalized(value);

        proxy.textFromValue = (value) => this.formatter.textFromValue(value);
        proxy.valueFromText = (text) => this.formatter.valueFromText(text);

        return proxy;
    }
}