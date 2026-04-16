// @ts-nocheck

import { decodeUtf8, encodeAscii, unpackSlice } from "../core/wasm.js";
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
                
                // --MIDI--
                case WorkletMessageType.midi:
                    this.exports.sendMidiEvent(msg.instrumentIndex, msg.data, msg.time);
                    break;
                case WorkletMessageType.stopAllNotes:
                    this.exports.stopAllNotes(msg.allowTailOff);
                    break;

                // --Global--
                case WorkletMessageType.saveState: {
                    const stateString = this.wasmSliceToString(this.exports.saveState());

                    this.port.postMessage({
                        type: WorkletMessageType.saveState,
                        success: true,
                        stateString: stateString,
                        callbackId: msg.callbackId,
                    });
                    break;
                }
                case WorkletMessageType.loadState: {
                    console.log("[Worklet.loadState]", msg);
                    const stateSlice = this.allocAndCopyToWasmString(JSON.stringify(msg.state));
                    const success = this.exports.loadState(stateSlice.ptr, stateSlice.len);
                    this.freeWasmString(stateSlice);

                    this.port.postMessage({
                        type: WorkletMessageType.loadState,
                        success,
                    });
                    break;
                }

                // --Track--
                case WorkletMessageType.addInstrument: {
                    const kindSlice = this.allocAndCopyToWasmString(msg.ctx.processorKind);
                    const success = Boolean(this.exports.addInstrument(msg.ctx.trackIndex, kindSlice.ptr, kindSlice.len));
                    this.freeWasmString(kindSlice);

                    if (success === false) {
                        this.port.postMessage({type: WorkletMessageType.insertTrack, success: false});
                        break;
                    }

                    const specString = this.wasmSliceToString(this.exports.getTrackSpec(msg.ctx.trackIndex));
                    this.port.postMessage({ type: WorkletMessageType.insertTrack, success: true, ctx: msg.ctx, spec: specString });
                    break;
                }
                case WorkletMessageType.removeTrack:
                    this.exports.removeTrack(msg.ctx.trackIndex);
                    this.port.postMessage({ type: WorkletMessageType.removeTrack, success: true, ctx: msg.ctx });
                    break;
                case WorkletMessageType.clearTracks:
                    this.exports.clearTracks();
                    this.port.postMessage({ type: WorkletMessageType.clearTracks, success: true });
                    break;

                case WorkletMessageType.saveTrackState: {
                    const stateString = this.wasmSliceToString(this.exports.saveTrackState(msg.trackIndex));

                    this.port.postMessage({
                        type: WorkletMessageType.saveTrackState,
                        success: true,
                        stateString: stateString,
                        callbackId: msg.callbackId,
                        ctx: { index: msg.trackIndex },
                    });
                    break;
                }

                // --Parameter--
                case WorkletMessageType.setParameterValueNormalized: {
                    const containerPtr = msg.context.containerPtr;
                    const parameterIndex = msg.context.parameterIndex;

                    this.exports.setParameterValueNormalized(containerPtr, parameterIndex, msg.context.value);
                    break;
                }
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

    /**
     * @param {BigInt} packed 
     */
    wasmSliceToString(packed) {
        const slice = unpackSlice(packed);
        const string = this.getWasmString(slice.ptr, slice.len);
        this.freeWasmString(slice);
        return string;
    }

    /**
     * @param {string} str 
     */
    allocAndCopyToWasmString(str) {
        const len = str.length;
        /** @type {number} */
        const ptr = this.exports.allocString(str.length);
        const mem = new Uint8Array(this.exports.memory.buffer, ptr, len);

        encodeAscii(str, mem);
        return {ptr, len};
    }

    /**
     * @param {{ptr: number, len: number}} slice 
     */
    freeWasmString(slice) {
        this.exports.freeString(slice.ptr, slice.len);
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
