import { Config } from "./config.js"
import { initializeAudio } from "../audio/audio.js"
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
import { WorkletState } from "../state/worklet-state.js"
import { AppState } from "../state/app-state.js"

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

    /** @type {ClipboardManager} */
    clipboardManager = new ClipboardManager;

    /** @type {KeyboardListener | undefined} */
    keyboardListener = undefined;

    /** @type {WorkletState | undefined} */
    workletState = undefined;

    /** @type {AppState | undefined} */
    appState = undefined;

    /** @type {Config} */
    config = new Config();

    /** @type {HTMLCanvasElement | undefined} */
    canvasElement = undefined;

    async initialize() {
        const startButton = /** @type {HTMLInputElement} */ (document.getElementById("start-audio-button"));
        this.canvasElement = /** @type {HTMLCanvasElement} */ (document.getElementById("pianoroll"));

        await this.initializeWasm();

        this.undoManager = new UndoManager(this.eventRouter);
        const tracks = new TracksContainer(this.wasm, this.undoManager);
        this.playbackEngine = new PlaybackEngine(this.config, tracks);
        this.midiInput = new MidiInput(this.playbackEngine);
        this.keyboardListener = new KeyboardListener(this.eventRouter);
        this.workletState = new WorkletState();
        this.appState = new AppState(this.workletState, this.playbackEngine);

        const appContext = new AppContext(
            this.config, 
            this.playbackEngine, 
            this.undoManager,
            this.eventRouter,
            this.clipboardManager,
            this.workletState,
        );

        this.appInterface = new AppInterface(appContext, this.canvasElement);
        
        this.resizeCanvas();
        window.addEventListener("resize", () => this.resizeCanvas());

        startButton.onclick = async () => {
            this.startButtonClicked(startButton);
        }
        startButton.disabled = false;
        startButton.value = "Start Audio Engine";
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

    /**
     * @param {HTMLInputElement} startButton 
     */
    async startButtonClicked(startButton) {
        startButton.value = "Loading...";
        startButton.disabled = true;
        const startContainer = /** @type {HTMLDivElement} */ (document.getElementById("start-audio-container"));
        this.canvasElement = /** @type {HTMLCanvasElement} */ (document.getElementById("pianoroll"));

        const node = await initializeAudio();
        // @ts-ignore
        this.playbackEngine.tracks.initializeAudio();
        // @ts-ignore
        this.workletState.workletInitialized(node);

        startContainer.style.display = "none";
    }
}