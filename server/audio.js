let audioContext;

export async function initializeAudio() {
    audioContext = new AudioContext();
    await audioContext.audioWorklet.addModule('wasm-worklet.js');

    const wasmResponse = await fetch("audio.wasm");
    const wasmBytes = await wasmResponse.arrayBuffer();

    node = new AudioWorkletNode(audioContext, 'wasm-processor', {
        numberOfOutputs: 1,
        outputChannelCount: [2],
        processorOptions: {
            wasmBytes: wasmBytes,   // Pass the bytes directly
            sampleRate: audioContext.sampleRate,
        }
    });

    node.connect(audioContext.destination);
    console.log("Audio initialized!");
}

export function isAudioContextRunning() {
    return audioContext.state === 'running';
}

export function toggleAudioContext() {
    if (isAudioContextRunning()) {
        audioContext.suspend();
    } else {
        audioContext.resume();
    }
}