import { expect, test } from "bun:test";
import { WasmContainer } from "./wasm";
import { NormalizableRange } from "./normalizable-range";

test("NormalizableRange", async () => {
    const wasm = new WasmContainer;
    const wasmUrl = new URL("../app/main.wasm", import.meta.url);
    const wasmResponse = await fetch(wasmUrl);

    const importObject = {
        env: {
            getCurrentFrame: () => 0,
        }
    };

    await wasm.initialize(wasmResponse, importObject);

    let range = new NormalizableRange(wasm, {type: "linear", start: 10, end: 20});

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

    range = new NormalizableRange(wasm, {type: "skewed", start: 10, end: 20, ctx: {exp: 2}});

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