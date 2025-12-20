import { initializeAudio, toggleAudioContext, getAudioWorkletNode, isAudioContextRunning } from "./audio.js"
import { initializeMIDI } from "./midi.js"
import { PianoRoll } from "./pianoroll.js"
import { PlaybackEngine } from "./playback-engine.js"

/**
 * @type {PlaybackEngine | undefined}
 */
let playbackEngine = undefined;

/**
 * @type {PianoRoll | undefined}
 */
let pianoRoll = undefined;

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
    pianoRoll = new PianoRoll(canvasElement, playbackEngine);

    playButton.onclick = () => playbackEngine.play();
    stopButton.onclick = () => playbackEngine.stop();

    bpmInput.addEventListener("change", (event) => {
        playbackEngine.setTempo(Number(event.target.value));
    })
    playbackEngine.setTempo(Number(bpmInput.value));

    playbackEngine.addListener(() => pianoRoll.draw());
}