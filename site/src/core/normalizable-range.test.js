import { expect, test } from "bun:test";
import { WasmContainer } from "./wasm.js";
import { NormalizableRange } from "./normalizable-range.js";

async function createWasm() {
    const wasm = new WasmContainer;
    const wasmUrl = new URL("../app/main.wasm", import.meta.url);
    const wasmResponse = await fetch(wasmUrl);

    const importObject = {
        env: {
            getCurrentFrame: () => 0,
        }
    };

    await wasm.initialize(wasmResponse, importObject);
    return wasm;
}

test("NormalizableRange from spec", async () => {
    const wasm = await createWasm();
    let range = NormalizableRange.createFromSpec(wasm, {type: "linear", start: 10, end: 20});

    expect(range.toNormalized( 5)).toBeCloseTo(0.0);
    expect(range.toNormalized(10)).toBeCloseTo(0.0);
    expect(range.toNormalized(15)).toBeCloseTo(0.5);
    expect(range.toNormalized(20)).toBeCloseTo(1.0);
    expect(range.toNormalized(25)).toBeCloseTo(1.0);

    expect(range.fromNormalized( -1)).toBeCloseTo(10);
    expect(range.fromNormalized(0.0)).toBeCloseTo(10);
    expect(range.fromNormalized(0.5)).toBeCloseTo(15);
    expect(range.fromNormalized(1.0)).toBeCloseTo(20);
    expect(range.fromNormalized(1.5)).toBeCloseTo(20);

    range.deinit();

    range = NormalizableRange.createFromSpec(wasm, {type: "skewed", start: 10, end: 20, ctx: {exp: 2}});

    expect(range.toNormalized(5)).toBeCloseTo(0);
    expect(range.toNormalized(10)).toBeCloseTo(0);
    expect(range.toNormalized(15)).toBeCloseTo(0.25);
    expect(range.toNormalized(20)).toBeCloseTo(1);
    expect(range.toNormalized(25)).toBeCloseTo(1);

    expect(range.fromNormalized( -1)).toBeCloseTo(10);
    expect(range.fromNormalized(0.0)).toBeCloseTo(10);
    expect(range.fromNormalized(0.25)).toBeCloseTo(15);
    expect(range.fromNormalized(1.0)).toBeCloseTo(20);
    expect(range.fromNormalized(1.5)).toBeCloseTo(20);

    range.deinit();
});

test("NormalizableRange init", async () => {
    const wasm = await createWasm();
    let range = NormalizableRange.createLinear(wasm, 10, 20);

    expect(range.toNormalized(12)).toBeCloseTo(0.2);
    expect(range.toNormalized(15)).toBeCloseTo(0.5);

    expect(range.fromNormalized(0.5)).toBeCloseTo(15);
    expect(range.fromNormalized(0.8)).toBeCloseTo(18);

    range = NormalizableRange.createSkewedCenter(wasm, 10, 20, 12);

    expect(range.toNormalized(12)).toBeCloseTo(0.5);
    expect(range.fromNormalized(0.5)).toBeCloseTo(12);
});