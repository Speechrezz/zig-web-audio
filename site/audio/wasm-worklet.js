import { WorkletMessageType } from "./worklet-message.js";

function decodeUtf8(mem) {
    let s = "";
    for (let i = 0; i < mem.length; i++) {
        s += String.fromCharCode(mem[i]);
    }
    return s;
}

const BLOCK_SIZE = 128;

class WasmWorkletProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();

        const bytes = options.processorOptions.wasmBytes;

        // Receive messages from main thread
        this.port.onmessage = (event) => {
            const msg = event.data;

            if (msg.type === WorkletMessageType.midi) {
                this.instance.exports.sendMidiEvent(msg.instrumentIndex, msg.data, BigInt(msg.time));
            } 
            else if (msg.type === WorkletMessageType.stopAllNotes) {
                this.instance.exports.stopAllNotes(msg.allowTailOff);
            }
            else {
                console.log("[WasmProcessor] onmessage:", msg); // TODO
            }
        };

        this.initWasm(bytes);
        this.instance.exports.initAudio();

        const sampleRate = options.processorOptions.sampleRate;
        const numChannels = options.outputChannelCount[0];
        this.instance.exports.prepareAudio(sampleRate, numChannels, BLOCK_SIZE);

        this.currentFrame = BigInt(0);
    }

    initWasm(bytes) {
        const importObject = {
            env: {
                consoleLogBinding: (ptr, len) => {
                    const mem = new Uint8Array(this.instance.exports.memory.buffer, ptr, len);
                    console.log(decodeUtf8(mem));
                },
                getCurrentFrame: () => {
                    return this.currentFrame;
                },
            }
        };

        const module = new WebAssembly.Module(bytes);
        this.instance = new WebAssembly.Instance(module, importObject);
        console.log("WASM initialized - exports:", this.instance.exports);
    }

    process(inputs, outputs) {
        const out = outputs[0];
        const blockSize = out[0].length; // Typically 128

        if (!this.instance.exports.processAudio(blockSize))
            return false;

        const exports = this.instance.exports;
        const wasmOutL = new Float32Array(exports.memory.buffer, exports.getOutputChannel(0), blockSize);
        const wasmOutR = new Float32Array(exports.memory.buffer, exports.getOutputChannel(1), blockSize);

        out[0].set(wasmOutL);
        out[1].set(wasmOutR);

        this.currentFrame += BigInt(blockSize);

        return true;
    }
}

registerProcessor('wasm-processor', WasmWorkletProcessor);
