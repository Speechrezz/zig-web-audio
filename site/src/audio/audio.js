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

const BLOCK_SIZE = 128;

/**
 * Initializes audio context, audio worklet, and loads WASM.
 */
export async function initializeAudio() {
    audioContext = new AudioContext;
    await audioContext.suspend(); // Necessary to minimize latency for some reason

    const workletUrl = new URL("./wasm-worklet.js", import.meta.url);
    await audioContext.audioWorklet.addModule(workletUrl);

    const wasmUrl = new URL("./audio.wasm", import.meta.url);
    const wasmResponse = await fetch(wasmUrl);
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

    // Need to do this for some reason to enable EventListener API
    audioWorkletNode.port.onmessage = (ev) => {};

    await audioContext.resume();
    console.log("Audio initialized!");
    return audioWorkletNode;
}

/**
 * Returns `true` if the audio context is running.
 * @returns {boolean}
 */
export function isAudioContextRunning() {
    return audioContext !== null && audioContext.state === 'running';
}

/**
 * Toggle AudioContext state between running and suspended.
 * @returns {boolean} Is currently running
 */
export function toggleAudioContext() {
    if (audioContext === null) return false;

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
 * @returns {AudioContext | null} AudioContext
 */
export function getAudioContext() {
    return audioContext;
}

/**
 * Get current AudioWorkletNode object/
 * @returns {AudioWorkletNode | null} AudioWorkletNode
 */
export function getAudioWorkletNode() {
    return audioWorkletNode;
}

/**
 * @param {any} message 
 * @returns `true` if message was successfully sent
 */
export function postWorkletMessage(message) {
    if (audioWorkletNode === null) return false;

    audioWorkletNode.port.postMessage(message);
    return true;
}

/**
 * @returns Block size of audio
 */
export function getBlockSize() {
    return BLOCK_SIZE;
}

/**
 * @typedef {{performanceTime: number, contextTime: number}} OutputTimestamp
 */

/**
 * @returns Audio context time (is offset by a block)
 */
export function getContextTime() {
    const ctx = /** @type {AudioContext} */ (audioContext);
    const { performanceTime, contextTime } = /** @type {OutputTimestamp} */ (ctx.getOutputTimestamp());
    return contextTime + getBlockSize() / ctx.sampleRate;
}

/**
 * @param {Number} timestampMs Relative to the window (like `window.performance.now()`)
 * @returns The audio time being heard at `timestampMs` (in seconds)
 */
export function toAudibleTime(timestampMs) {
    const ctx = /** @type {AudioContext} */ (audioContext);
    const { performanceTime, contextTime } = /** @type {OutputTimestamp} */ (ctx.getOutputTimestamp());
    return contextTime + (timestampMs - performanceTime) * 1e-3;
}

/**
 * "What audio time is being heard right now?"
 * @returns The audio time being heard right now (in seconds)
 */
export function toAudibleTimeNow() {
    return toAudibleTime(window.performance.now());
}