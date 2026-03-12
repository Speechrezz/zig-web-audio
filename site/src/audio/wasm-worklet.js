// @ts-nocheck

import { decodeUtf8, unpackSlice } from "../core/wasm.js";
import { WorkletMessageType } from "./worklet-message.js";

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
                    console.warn("[WasmProcessor] Unhandled 'onmessage':", msg);
                    break;
                case WorkletMessageType.midi:
                    this.exports.sendMidiEvent(msg.instrumentIndex, msg.data, msg.time);
                    break;
                case WorkletMessageType.stopAllNotes:
                    this.exports.stopAllNotes(msg.allowTailOff);
                    break;
                case WorkletMessageType.addInstrument: {
                    const success = Boolean(this.exports.addInstrument(msg.context.instrumentIndex, msg.context.instrumentType));
                    if (success === false) {
                        this.port.postMessage({type: WorkletMessageType.addInstrument, success: false});
                        break;
                    }

                    const stateSlice = unpackSlice(this.exports.getTrackState(msg.context.instrumentIndex));
                    const stateString = this.getWasmString(stateSlice.ptr, stateSlice.len);
                    this.exports.freeString(stateSlice.ptr, stateSlice.len);

                    const data = {
                        state: JSON.parse(stateString),
                        context: msg.context,
                    }

                    this.port.postMessage({ type: WorkletMessageType.addInstrument, success: true, data });
                    break;
                }
                case WorkletMessageType.removeTrack:
                    this.exports.removeInstrument(msg.instrumentIndex);
                    break;
                case WorkletMessageType.clearTracks:
                    this.exports.clearInstruments();
                    break;

                case WorkletMessageType.setParameterValue:
                    const trackIndex = msg.context.trackIndex;
                    const parameterIndex = msg.context.parameterIndex;
                    const stateCount = msg.context.stateCount;

                    if (msg.context.isNormalized === true) {
                        this.exports.setParameterValueNormalized(trackIndex, parameterIndex, msg.context.value);
                    }
                    else {
                        this.exports.setParameterValue(trackIndex, parameterIndex, msg.context.value);
                    }

                    const value = this.exports.getParameterValue(trackIndex, parameterIndex);
                    const valueNormalized = this.exports.getParameterValueNormalized(trackIndex, parameterIndex);

                    const data = {
                        state: {
                            value: value,
                            normalized: valueNormalized,
                            stateCount: stateCount,
                        },
                        context: msg.context,
                    }

                    this.port.postMessage({ type: WorkletMessageType.setParameterValue, data });
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
        console.log("WASM audio initialized - exports:", this.exports);
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
