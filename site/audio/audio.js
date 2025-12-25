/**
 * @global
 * @type {AudioContext | null}
 */
let audioContext = null;

/**
 * @global
 * @type {AudioWorkletNode | null}
 */
let audioWorkletNode = null;

/**
 * Initializes audio context, audio worklet, and loads WASM.
 */
export async function initializeAudio() {
    audioContext = new AudioContext();
    await audioContext.audioWorklet.addModule('audio/wasm-worklet.js');

    const wasmResponse = await fetch("audio/audio_backend.wasm");
    const wasmBytes = await wasmResponse.arrayBuffer();

    audioWorkletNode = new AudioWorkletNode(audioContext, 'wasm-processor', {
        numberOfOutputs: 1,
        outputChannelCount: [2],
        processorOptions: {
            wasmBytes: wasmBytes,   // Pass the bytes directly
            sampleRate: audioContext.sampleRate,
        }
    });

    audioWorkletNode.connect(audioContext.destination);
    console.log("Audio initialized!");
}

/**
 * Returns `true` if the audio context is running.
 * @returns {boolean}
 */
export function isAudioContextRunning() {
    return audioContext.state === 'running';
}

/**
 * Toggle AudioContext state between running and suspended.
 * @returns {boolean} Is currently running
 */
export function toggleAudioContext() {
    if (isAudioContextRunning()) {
        audioContext.suspend();
        return false;
    } else {
        audioContext.resume();
        return true;
    }
}

/**
 * Get current AudioContext object/
 * @returns {AudioContext} AudioContext
 */
export function getAudioContext() {
    return audioContext;
}

/**
 * Get current AudioWorkletNode object/
 * @returns {AudioWorkletNode} AudioWorkletNode
 */
export function getAudioWorkletNode() {
    return audioWorkletNode;
}