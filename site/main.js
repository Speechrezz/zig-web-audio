import { initializeAudio, toggleAudioContext, getAudioWorkletNode, isAudioContextRunning } from "./audio/audio.js"
import { initializeMIDI } from "./audio/midi.js"
import { PlaybackEngine } from "./audio/playback-engine.js"
import { PianoRoll } from "./canvas/piano-roll.js"
import { Config } from "./app/config.js"

/**
 * @type {PlaybackEngine | undefined}
 */
let playbackEngine = undefined;

/**
 * @type {PianoRoll | undefined}
 */
let pianoRoll = undefined;

let config = new Config();

export async function initialize() {
    const startButton = document.getElementById("start-audio-button");
    const playButton = document.getElementById("play-button");
    const stopButton = document.getElementById("stop-button");
    const bpmInput = document.getElementById("bpm-input");
    const canvasElement = document.getElementById("pianoroll");

    const audioContextStateChanged = (isRunning) => {
        playButton.disabled = !isRunning;
        stopButton.disabled = !isRunning;
    };

    await initializeAudio();
    initializeMIDI(getAudioWorkletNode());

    audioContextStateChanged(isAudioContextRunning());
    startButton.onclick = () => {
        audioContextStateChanged(toggleAudioContext());
    }

    playbackEngine = new PlaybackEngine();
    pianoRoll = new PianoRoll(canvasElement, playbackEngine, config);

    playButton.onclick = () => playbackEngine.play();
    stopButton.onclick = () => playbackEngine.stop();

    bpmInput.addEventListener("change", (event) => {
        playbackEngine.setTempo(Number(event.target.value));
    })
    playbackEngine.setTempo(Number(bpmInput.value));

    playbackEngine.addListener(() => pianoRoll.repaint());

    function resizeCanvas() {
        const rect = canvasElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        canvasElement.width  = Math.round(rect.width * dpr);
        canvasElement.height = Math.round(rect.height * dpr);

        const ctx = canvasElement.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        pianoRoll.canvasResized();
    }

    resizeCanvas();
    window.addEventListener("resize", () => resizeCanvas());
}