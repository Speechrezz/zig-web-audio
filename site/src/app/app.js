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
import { TracksContainer } from "../audio/track.js"
import { WasmContainer } from "../core/wasm.js"
import { NormalizableRange } from "../core/normalizable-range.js"

export class App {
    /** @type {WasmContainer} */
    wasm = new WasmContainer;

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

    /** @type {HTMLCanvasElement | undefined} */
    canvasElement = undefined;

    async initialize() {
        const startButton = /** @type {HTMLInputElement} */ (document.getElementById("start-audio-button"));
        const startContainer = /** @type {HTMLDivElement} */ (document.getElementById("start-audio-container"));
        this.canvasElement = /** @type {HTMLCanvasElement} */ (document.getElementById("pianoroll"));

        await this.initializeWasm();

        const audioContextStateChanged = (/** @type {boolean} */ isRunning) => {
            if (isRunning) {
                startContainer.style.display = "none";
            }
        };
    
        await initializeAudio();
    
        audioContextStateChanged(isAudioContextRunning());
        startButton.onclick = () => {
            audioContextStateChanged(toggleAudioContext());
        }
    
        this.undoManager = new UndoManager(this.eventRouter);
        const tracks = new TracksContainer(this.wasm, this.undoManager);
        this.playbackEngine = new PlaybackEngine(this.config, tracks);
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
        const canvasElement = /** @type {HTMLCanvasElement} */ (this.canvasElement);

        const rect = canvasElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        canvasElement.width  = Math.round(rect.width * dpr);
        canvasElement.height = Math.round(rect.height * dpr);

        const ctx = /** @type {CanvasRenderingContext2D} */ (canvasElement.getContext("2d"));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // @ts-ignore
        this.appInterface.canvasResized();
    }

    async initializeWasm() {
        const wasmUrl = new URL("./main.wasm", import.meta.url);
        const wasmResponse = await fetch(wasmUrl);

        const importObject = {
            env: {
                getCurrentFrame: () => 0,
            }
        };

        await this.wasm.initialize(wasmResponse, importObject);
        console.log("WASM main initialized - exports:", this.wasm.exports);
    }
}