import { AppContext } from "../../app/app-context.js";
import { TopLevelComponent } from "../framework/top-level-component.js";
import { InstrumentsSection } from "./instruments/instruments-section.js";
import { PianoRollSection } from "./piano-roll/piano-roll-section.js";

export class AppInterface extends TopLevelComponent {
    /** @type {AppContext} */
    context;

    /** @type {PianoRollSection} */
    pianoRoll;

    /** @type {InstrumentsSection} */
    instruments;

    /**
     * @param {AppContext} context 
     * @param {HTMLCanvasElement} canvas 
     */
    constructor(context, canvas) {
        super(canvas);
        this.context = context;
    
        this.pianoRoll = new PianoRollSection(context);
        this.instruments = new InstrumentsSection(context);

        this.addChildComponent(this.pianoRoll);
        this.addChildComponent(this.instruments);

        this.canvasResized();
        this.repaint();
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        ctx.clearRect(0, 0, this.bounds.width, this.bounds.height);
    }

    resized() {
        const bounds = this.getLocalBounds();
        this.instruments.setBounds(bounds.removeFromLeft(196));
        this.pianoRoll.setBounds(bounds.clone());
    }
}