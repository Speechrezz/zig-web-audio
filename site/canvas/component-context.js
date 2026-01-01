import { Config } from "../app/config.js";
import { PlaybackEngine } from "../audio/playback-engine.js";
import { AppEventRouter } from "../app/app-event-router.js";

export class ComponentContext {
    /** @type {Config} */
    config;

    /** @type {PlaybackEngine} */
    playbackEngine;

    /** @type {AppEventRouter} */
    eventRouter;

    /**
     * @param {Config} config 
     * @param {PlaybackEngine} playbackEngine 
     * @param {AppEventRouter} eventRouter 
     */
    constructor(config, playbackEngine, eventRouter) {
        this.config = config;
        this.playbackEngine = playbackEngine;
        this.eventRouter = eventRouter;
    }
} 