function decodeUtf8(mem) {
    let s = "";
    for (let i = 0; i < mem.length; i++) {
        s += String.fromCharCode(mem[i]);
    }
    return s;
}

class WasmWorkletProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();

        console.log("options:", options);

        const bytes = options.processorOptions.wasmBytes;

        // Receive messages from main thread
        this.port.onmessage = (event) => {
            const msg = event.data;
            console.log("[WasmProcessor] onmessage:", msg); // TODO
        };

        this.initWasm(bytes);
        this.instance.exports.initAudio();

        const sampleRate = options.processorOptions.sampleRate;
        const numChannels = options.outputChannelCount[0];
        const blockSize = 128;
        this.instance.exports.prepareAudio(sampleRate, numChannels, blockSize);
    }

    initWasm(bytes) {
        const importObject = {
            env: {
                consoleLogImpl: (ptr, len) => {
                    const mem = new Uint8Array(this.instance.exports.memory.buffer, ptr, len);
                    console.log(decodeUtf8(mem));
                }
            }
        };

        const module = new WebAssembly.Module(bytes);
        this.instance = new WebAssembly.Instance(module, importObject);
    }

    process(inputs, outputs) {
        console.log("Outputs:", outputs);

        return false;
    }
}

registerProcessor('wasm-processor', WasmWorkletProcessor);
