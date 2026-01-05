import { Config } from "../app/config.js";
import { PlaybackEngine } from "../audio/playback-engine.js";
import { AppEventRouter } from "../app/app-event-router.js";
import { ClipboardManager } from "../app/clipboard-manager.js";
import { UndoManager } from "../app/undo-manager.js";

export class ComponentContext {
    /** @type {Config} */
    config;

    /** @type {PlaybackEngine} */
    playbackEngine;

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
    }
} 