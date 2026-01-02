import { Config } from "../app/config.js";
import { PlaybackEngine } from "../audio/playback-engine.js";
import { AppEventRouter } from "../app/app-event-router.js";
import { ClipboardManager } from "../app/clipboard-manager.js";

export class ComponentContext {
    /** @type {Config} */
    config;

    /** @type {PlaybackEngine} */
    playbackEngine;

    /** @type {AppEventRouter} */
    eventRouter;

    /** @type {ClipboardManager} */
    clipboardManager;

    /**
     * @param {Config} config 
     * @param {PlaybackEngine} playbackEngine 
     * @param {AppEventRouter} eventRouter 
     * @param {ClipboardManager} clipboardManager 
     */
    constructor(config, playbackEngine, eventRouter, clipboardManager) {
        this.config = config;
        this.playbackEngine = playbackEngine;
        this.eventRouter = eventRouter;
        this.clipboardManager = clipboardManager;
    }
} 