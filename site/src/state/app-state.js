import { PlaybackEngine } from "../audio/playback-engine.js";
import { WorkletState } from "./worklet-state.js";

export class AppState {
    /** @type {WorkletState} */
    workletState;

    /** @type {PlaybackEngine} */
    playbackEngine;

    /**
     * @param {WorkletState} workletState 
     * @param {PlaybackEngine} playbackEngine 
     */
    constructor(workletState, playbackEngine) {
        this.workletState = workletState;
        this.playbackEngine = playbackEngine;
    }
}