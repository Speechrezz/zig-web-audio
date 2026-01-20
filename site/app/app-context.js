import { Config } from "./config.js";
import { PlaybackEngine } from "../audio/playback-engine.js";
import { AppEventRouter } from "./app-event-router.js";
import { ClipboardManager } from "./clipboard-manager.js";
import { UndoManager } from "./undo-manager.js";
import { InstrumentsContainer } from "../audio/instrument.js";

export class AppContext {
    /** @type {Config} */
    config;

    /** @type {PlaybackEngine} */
    playbackEngine;

    /** @type {InstrumentsContainer} */
    instruments;

    /** @type {UndoManager} */
    undoManager;

    /** @type {AppEventRouter} */
    eventRouter;

    /** @type {ClipboardManager} */
    clipboardManager;

    /**
     * @param {Config} config 
     * @param {PlaybackEngine} playbackEngine 
     * @param {UndoManager} undoManager 
     * @param {AppEventRouter} eventRouter 
     * @param {ClipboardManager} clipboardManager 
     */
    constructor(config, playbackEngine, undoManager, eventRouter, clipboardManager) {
        this.config = config;
        this.playbackEngine = playbackEngine;
        this.undoManager = undoManager;
        this.eventRouter = eventRouter;
        this.clipboardManager = clipboardManager;

        this.instruments = this.playbackEngine.instruments;
    }
} 