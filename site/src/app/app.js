import { Config } from "./config.js"
import { initializeAudio, toggleAudioContext, isAudioContextRunning } from "../audio/audio.js"
import { MidiInput } from "../audio/midi-input.js"
import { PlaybackEngine } from "../audio/playback-engine.js"
import { AppInterface } from "../canvas/interface/app-interface.js"
import { KeyboardListener } from "./keyboard-listener.js"
import { AppEventRouter } from "./app-event-router.js"
import { AppContext } from "./app-context.js"
import { ClipboardManager } from "./clipboard-manager.js"
import { UndoManager } from "./undo-manager.js"
import { InstrumentsContainer } from "../audio/instrument.js"

export class App {
    /** @type {PlaybackEngine | undefined} */
    playbackEngine = undefined;

    /** @type {MidiInput | undefined} */
    midiInput = undefined;

    /** @type {AppInterface | undefined} */
    appInterface = undefined;
    
    /** @type {AppEventRouter} */
    eventRouter = new AppEventRouter();

    /** @type {UndoManager | undefined} */
    undoManager = undefined;

    /** @type {ClipboardManager | undefined} */
    clipboardManager = undefined;

    /** @type {KeyboardListener | undefined} */
    keyboardListener = undefined;

    /** @type {Config} */
    config = new Config();

    /** @type {HTMLCanvasElement} */
    canvasElement;

    async initialize() {
        const startButton = document.getElementById("start-audio-button");
        const startContainer = document.getElementById("start-audio-container");
        this.canvasElement = document.getElementById("pianoroll");
    
        const audioContextStateChanged = (isRunning) => {
            if (isRunning)
                startContainer.style.display = "none";
        };
    
        await initializeAudio();
    
        audioContextStateChanged(isAudioContextRunning());
        startButton.onclick = () => {
            audioContextStateChanged(toggleAudioContext());
        }
    
        this.undoManager = new UndoManager(this.eventRouter);
        const instruments = new InstrumentsContainer(this.undoManager);
        this.playbackEngine = new PlaybackEngine(this.config, instruments);
        this.midiInput = new MidiInput(this.playbackEngine);
        this.clipboardManager = new ClipboardManager();
        this.keyboardListener = new KeyboardListener(this.eventRouter);

        const appContext = new AppContext(
            this.config, 
            this.playbackEngine, 
            this.undoManager,
            this.eventRouter,
            this.clipboardManager,
        );

        this.appInterface = new AppInterface(appContext, this.canvasElement);
        
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

        this.appInterface.canvasResized();
    }
}