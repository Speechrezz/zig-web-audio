import { expect, test } from "bun:test";
import { ParameterSpec } from "./parameter-spec.js";
import { WasmContainer } from "./wasm.js";

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

test("ParameterSpec from spec", async () => {
    const wasm = await createWasm();

    const spec = ParameterSpec.createFromSpec(wasm, {
        formatter: { type: "hertz", decimals: 1 },
        range: {type: "linear", start: 10, end: 20},
    });

    expect(spec.range.toNormalized(10)).toBeCloseTo(0.0);
    expect(spec.range.toNormalized(15)).toBeCloseTo(0.5);
    expect(spec.range.toNormalized(20)).toBeCloseTo(1.0);

    expect(spec.range.fromNormalized(0.0)).toBeCloseTo(10);
    expect(spec.range.fromNormalized(0.5)).toBeCloseTo(15);
    expect(spec.range.fromNormalized(1.0)).toBeCloseTo(20);

    expect(spec.formatter.textFromValue(3.1415)).toBe("3.1 Hz");
    expect(spec.formatter.textFromValue(12345)).toBe("12.3 kHz");
    expect(spec.formatter.valueFromText("3.1415 Hz")).toBeCloseTo(3.1415, 4);
    expect(spec.formatter.valueFromText("12.3456 kHz")).toBeCloseTo(12345.6, 2);

    spec.createProxy();

    spec.deinit();
});