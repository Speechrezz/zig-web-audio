import { WorkletMessageType } from "./worklet-message.js";

function decodeUtf8(mem) {
    let s = "";
    for (let i = 0; i < mem.length; i++) {
        s += String.fromCharCode(mem[i]);
    }
    return s;
}

function unpackSlice(x) {
    // WebAssembly i64 typically comes to JS as a BigInt.
    const len = Number((x >> 32n) & 0xffffffffn);
    const ptr = Number(x & 0xffffffffn);
    return { ptr, len };
}

const BLOCK_SIZE = 128;

class WasmWorkletProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();

        const bytes = options.processorOptions.wasmBytes;
        this.initWasm(bytes);

        // Receive messages from main thread
        this.port.onmessage = (event) => {
            const msg = event.data;

            switch (msg.type) {
                default:
                    console.log("[WasmProcessor] onmessage:", msg); // TODO
                    break;
                case WorkletMessageType.midi:
                    this.exports.sendMidiEvent(msg.instrumentIndex, msg.data, BigInt(msg.time));
                    break;
                case WorkletMessageType.stopAllNotes:
                    this.exports.stopAllNotes(msg.allowTailOff);
                    break;
                case WorkletMessageType.addInstrument:
                    this.exports.addInstrument(msg.instrumentIndex, msg.instrumentType);
                    const paramsSlice = unpackSlice(this.exports.getInstrumentParameters(msg.instrumentIndex));
                    const paramsString = this.getWasmString(paramsSlice.ptr, paramsSlice.len);
                    this.exports.freeString(paramsSlice.ptr, paramsSlice.len);

                    const params = JSON.parse(paramsString);
                    this.port.postMessage({type: "params", params});
                    break;
                case WorkletMessageType.removeInstrument:
                    this.exports.removeInstrument(msg.instrumentIndex);
                    break;
                case WorkletMessageType.clearInstruments:
                    this.exports.clearInstruments();
                    break;
            }
        };

        this.exports.initAudio();

        const sampleRate = options.processorOptions.sampleRate;
        const numChannels = options.outputChannelCount[0];
        this.exports.prepareAudio(sampleRate, numChannels, BLOCK_SIZE);

        this.currentFrame = BigInt(0);
    }

    initWasm(bytes) {
        const importObject = {
            env: {
                consoleLogBinding: (ptr, len) => {
                    console.log(this.getWasmString(ptr, len));
                },
                getCurrentFrame: () => {
                    return this.currentFrame;
                },
            }
        };

        const module = new WebAssembly.Module(bytes);
        this.instance = new WebAssembly.Instance(module, importObject);
        this.exports = this.instance.exports;
        console.log("WASM initialized - exports:", this.exports);
    }

    /**
     * Reads string from WASM memory. Converts from UTF8 to UTF16.
     * Creates a copy of the string, meaning the string can be safely freed after this function call.
     * @param {number} ptr 
     * @param {number} len 
     */
    getWasmString(ptr, len) {
        const mem = new Uint8Array(this.exports.memory.buffer, ptr, len);
        return decodeUtf8(mem);
    }

    process(inputs, outputs) {
        const out = outputs[0];
        const blockSize = out[0].length; // Typically 128

        if (!this.exports.processAudio(blockSize))
            return false;

        const exports = this.exports;
        const wasmOutL = new Float32Array(exports.memory.buffer, exports.getOutputChannel(0), blockSize);
        const wasmOutR = new Float32Array(exports.memory.buffer, exports.getOutputChannel(1), blockSize);

        out[0].set(wasmOutL);
        out[1].set(wasmOutR);

        this.currentFrame += BigInt(blockSize);

        return true;
    }
}

registerProcessor('wasm-processor', WasmWorkletProcessor);
