import { Component } from "./component.js";
import { PianoRollArea } from "./piano-roll-area.js";
import { AppContext } from "../app/app-context.js"

export class PianoRollView extends Component{
    /**
     * @type {AppContext}
     */
    context;
    
    /**
     * @type {PianoRollArea}
     */
    pianoRollArea;

    /**
     * @param {AppContext} context 
     */
    constructor(context) {
        super();
        
        this.context = context;

        this.pianoRollArea = new PianoRollArea(context);
        this.addChildComponent(this.pianoRollArea);
    }
}