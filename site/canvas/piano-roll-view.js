import { Component, Rectangle, Point } from "./component.js";
import { PlaybackEngine } from "../playback-engine.js"
import { PianoRollArea } from "./piano-roll-area.js";
import { Config } from "../app/config.js";

export class PianoRollView extends Component{
    /**
     * @type {PlaybackEngine}
     */
    playbackEngine;

    /**
     * @type {PianoRollArea}
     */
    pianoRollArea;

    /**
     * @type {Config}
     */
    config;

    /**
     * @param {PlaybackEngine} playbackEngine 
     * @param {Config} config 
     */
    constructor(playbackEngine, config) {
        super();
        
        this.playbackEngine = playbackEngine;
        this.config = config;

        this.pianoRollArea = new PianoRollArea(playbackEngine, config);
        this.addChildComponent(this.pianoRollArea);
    }
}