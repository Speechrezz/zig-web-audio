import { expect, test } from "bun:test";
import { WasmContainer } from "./wasm.js";
import { ValueFormatter } from "./value-formatter.js";

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

test("ValueFormatter from spec", async () => {
    const wasm = await createWasm();

    let range = ValueFormatter.createFromSpec(wasm, { type: "basic", decimals: 1, ctx: {scale: 100, prefix: "", suffix: "%"} });
    expect(range.textFromValue(0.314)).toBe("31.4%");
    expect(range.textFromValue(0.5678)).toBe("56.8%");
    expect(range.valueFromText("31.4%")).toBeCloseTo(0.314, 4);
    expect(range.valueFromText("56.78")).toBeCloseTo(0.5678, 4);

    range = ValueFormatter.createFromSpec(wasm, { type: "hertz", decimals: 1 });
    expect(range.textFromValue(3.1415)).toBe("3.1 Hz");
    expect(range.textFromValue(12345)).toBe("12.3 kHz");
    expect(range.valueFromText("3.1415 Hz")).toBeCloseTo(3.1415, 4);
    expect(range.valueFromText("12.3456 kHz")).toBeCloseTo(12345.6, 2);

    range = ValueFormatter.createFromSpec(wasm, { type: "seconds", decimals: 2, ctx: {decimals_ms: 1} });
    expect(range.textFromValue(3.1415)).toBe("3.14 sec");
    expect(range.textFromValue(0.12345)).toBe("123.5 ms");
    expect(range.valueFromText("3.1415 sec")).toBeCloseTo(3.1415, 4);
    expect(range.valueFromText("123.45 ms")).toBeCloseTo(0.12345, 2);

    range.deinit();
});