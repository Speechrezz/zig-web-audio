import { Config } from "./config.js";
import { PlaybackEngine } from "../audio/playback-engine.js";
import { AppEventRouter } from "./app-event-router.js";
import { ClipboardManager } from "./clipboard-manager.js";
import { UndoManager } from "./undo-manager.js";
import { DawController } from "../daw/daw-controller.js";

export class AppContext {
    /** @type {Config} */
    config;

    /** @type {PlaybackEngine} */
    playbackEngine;

    /** @type {DawController} */
    daw;

    /** @type {UndoManager} */
    undoManager;

    /** @type {AppEventRouter} */
    eventRouter;

    /** @type {ClipboardManager} */
    clipboardManager;

    /**
     * @param {Config} config
     * @param {PlaybackEngine} playbackEngine
     * @param {DawController} daw
     * @param {UndoManager} undoManager
     * @param {AppEventRouter} eventRouter
     * @param {ClipboardManager} clipboardManager
     */
    constructor(config, playbackEngine, daw, undoManager, eventRouter, clipboardManager) {
        this.config = config;
        this.playbackEngine = playbackEngine;
        this.daw = daw;
        this.undoManager = undoManager;
        this.eventRouter = eventRouter;
        this.clipboardManager = clipboardManager;
    }
} 