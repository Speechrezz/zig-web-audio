import { Config } from "./config.js";
import { PlaybackEngine } from "../audio/playback-engine.js";
import { AppEventRouter } from "./app-event-router.js";
import { ClipboardManager } from "./clipboard-manager.js";
import { UndoManager } from "./undo-manager.js";
import { TracksContainer } from "../audio/track.js";
import { StorageController } from "../state/storage-controller.js";

export class AppContext {
    /** @type {Config} */
    config;

    /** @type {PlaybackEngine} */
    playbackEngine;

    /** @type {TracksContainer} */
    tracks;

    /** @type {UndoManager} */
    undoManager;

    /** @type {AppEventRouter} */
    eventRouter;

    /** @type {ClipboardManager} */
    clipboardManager;

    /** @type {StorageController} */
    storage;

    /**
     * @param {Config} config
     * @param {PlaybackEngine} playbackEngine
     * @param {UndoManager} undoManager
     * @param {AppEventRouter} eventRouter
     * @param {ClipboardManager} clipboardManager
     * @param {StorageController} storage
     */
    constructor(config, playbackEngine, undoManager, eventRouter, clipboardManager, storage) {
        this.config = config;
        this.playbackEngine = playbackEngine;
        this.undoManager = undoManager;
        this.eventRouter = eventRouter;
        this.clipboardManager = clipboardManager;
        this.storage = storage;

        this.tracks = this.playbackEngine.tracks;
    }
} 