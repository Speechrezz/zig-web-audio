import { Config } from "./config.js";
import { PlaybackEngine } from "../audio/playback-engine.js";
import { AppEventRouter } from "./app-event-router.js";
import { ClipboardManager } from "./clipboard-manager.js";
import { UndoManager } from "./undo-manager.js";
import { WorkletState } from "../state/worklet-state.js";
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

    /** @type {WorkletState} */
    workletState;

    /**
     * @param {Config} config
     * @param {PlaybackEngine} playbackEngine
     * @param {DawController} daw
     * @param {UndoManager} undoManager
     * @param {AppEventRouter} eventRouter
     * @param {ClipboardManager} clipboardManager
     * @param {WorkletState} workletState
     */
    constructor(config, playbackEngine, daw, undoManager, eventRouter, clipboardManager, workletState) {
        this.config = config;
        this.playbackEngine = playbackEngine;
        this.daw = daw;
        this.undoManager = undoManager;
        this.eventRouter = eventRouter;
        this.clipboardManager = clipboardManager;
        this.workletState = workletState;
    }
} 