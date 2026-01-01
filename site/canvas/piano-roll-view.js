import { Component } from "./component.js";
import { PianoRollArea } from "./piano-roll-area.js";
import { ComponentContext } from "./component-context.js";

export class PianoRollView extends Component{
    /**
     * @type {ComponentContext}
     */
    context;
    
    /**
     * @type {PianoRollArea}
     */
    pianoRollArea;

    /**
     * @param {ComponentContext} context 
     */
    constructor(context) {
        super();
        
        this.context = context;

        this.pianoRollArea = new PianoRollArea(context);
        this.addChildComponent(this.pianoRollArea);
    }
}