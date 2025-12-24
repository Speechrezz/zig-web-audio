import { Component, Rectangle, Point } from "./component.js";
import { PlaybackEngine } from "../playback-engine.js"
import { PianoRollArea } from "./piano-roll-area.js";

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
     * @param {PlaybackEngine} playbackEngine 
     */
    constructor(playbackEngine) {
        super();
        
        this.playbackEngine = playbackEngine;
        this.pianoRollArea = new PianoRollArea(playbackEngine);
        this.addChildComponent(this.pianoRollArea);
    }
}