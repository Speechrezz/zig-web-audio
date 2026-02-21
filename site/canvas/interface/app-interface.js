import { AppContext } from "../../app/app-context.js";
import { TopLevelComponent } from "../framework/top-level-component.js";
import { DevicePanelSection } from "./device-panel/device-panel-section.js";
import { HeaderSection } from "./header/header-section.js";
import { InstrumentsSection } from "./instruments/instruments-section.js";
import { PianoRollSection } from "./piano-roll/piano-roll-section.js";

export class AppInterface extends TopLevelComponent {
    /** @type {AppContext} */
    context;

    /** @type {HeaderSection} */
    header;

    /** @type {PianoRollSection} */
    pianoRoll;

    /** @type {InstrumentsSection} */
    instruments;

    /** @type {DevicePanelSection} */
    devicePanel;

    /**
     * @param {AppContext} context 
     * @param {HTMLCanvasElement} canvas 
     */
    constructor(context, canvas) {
        super(canvas);
        this.context = context;
    
        this.header = new HeaderSection(context);
        this.pianoRoll = new PianoRollSection(context);
        this.instruments = new InstrumentsSection(context);
        this.devicePanel = new DevicePanelSection(context);

        this.addChildComponent(this.header);
        this.addChildComponent(this.pianoRoll);
        this.addChildComponent(this.instruments);
        this.addChildComponent(this.devicePanel);

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

        this.header.setBounds(bounds.removeFromTop(64));
        this.devicePanel.setBounds(bounds.removeFromBottom(256));

        this.instruments.setBounds(bounds.removeFromLeft(196));
        this.pianoRoll.setBounds(bounds.clone());
    }
}