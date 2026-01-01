import { Config } from "./config.js"
import { initializeAudio, toggleAudioContext, isAudioContextRunning } from "../audio/audio.js"
import { MidiInput } from "../audio/midi-input.js"
import { PlaybackEngine } from "../audio/playback-engine.js"
import { PianoRoll } from "../canvas/piano-roll.js"
import { KeyboardListener } from "./keyboard-listener.js"
import { AppEventRouter } from "./app-event-router.js"
import { ComponentContext } from "../canvas/component-context.js"

export class App {
    /**
     * @type {PlaybackEngine | undefined}
     */
    playbackEngine = undefined;

    /**
     * @type {MidiInput | undefined}
     */
    midiInput = undefined;

    /**
     * @type {PianoRoll | undefined}
     */
    pianoRoll = undefined;

    /**
     * @type {AppEventRouter | undefined}
     */
    eventRouter = undefined;

    /**
     * @type {KeyboardListener | undefined}
     */
    keyboardListener = undefined;

    config = new Config();

    /**
     * @type {HTMLCanvasElement}
     */
    canvasElement;

    async initialize() {
        const startButton = document.getElementById("start-audio-button");
        const playButton = document.getElementById("play-button");
        const stopButton = document.getElementById("stop-button");
        const bpmInput = document.getElementById("bpm-input");
        this.canvasElement = document.getElementById("pianoroll");
    
        const audioContextStateChanged = (isRunning) => {
            playButton.disabled = !isRunning;
            stopButton.disabled = !isRunning;
        };
    
        await initializeAudio();
    
        audioContextStateChanged(isAudioContextRunning());
        startButton.onclick = () => {
            audioContextStateChanged(toggleAudioContext());
        }
    
        this.playbackEngine = new PlaybackEngine(this.config);
        this.midiInput = new MidiInput(this.playbackEngine);
        this.eventRouter = new AppEventRouter();
        this.keyboardListener = new KeyboardListener(this.eventRouter);

        const componentContext = new ComponentContext(this.config, this.playbackEngine, this.eventRouter);
        this.pianoRoll = new PianoRoll(this.canvasElement, componentContext);
        
        playButton.onclick = () => this.playbackEngine.play();
        stopButton.onclick = () => this.playbackEngine.stop();
    
        bpmInput.addEventListener("change", (event) => {
            this.playbackEngine.setTempo(Number(event.target.value));
        })
        this.playbackEngine.setTempo(Number(bpmInput.value));
    
        this.playbackEngine.addListener(() => this.pianoRoll.repaint());
    
        this.resizeCanvas();
        window.addEventListener("resize", () => this.resizeCanvas());
    }

    resizeCanvas() {
        const rect = this.canvasElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvasElement.width  = Math.round(rect.width * dpr);
        this.canvasElement.height = Math.round(rect.height * dpr);

        const ctx = this.canvasElement.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.pianoRoll.canvasResized();
    }
}