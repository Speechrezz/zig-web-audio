// @ts-check

import { AppContext } from "../../app/app-context.js";
import { TopLevelComponent } from "../framework/top-level-component.js";
import { DevicePanelSection } from "./device-panel/device-panel-section.js";
import { HeaderSection } from "./header/header-section.js";
import { TracksSection } from "./tracks/tracks-section.js";
import { PianoRollSection } from "./piano-roll/piano-roll-section.js";

export class AppInterface extends TopLevelComponent {
    /** @type {AppContext} */
    context;

    /** @type {HeaderSection} */
    header;

    /** @type {PianoRollSection} */
    pianoRoll;

    /** @type {TracksSection} */
    tracks;

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
        this.tracks = new TracksSection(context);
        this.devicePanel = new DevicePanelSection(context);

        this.addChildComponent(this.header);
        this.addChildComponent(this.pianoRoll);
        this.addChildComponent(this.tracks);
        this.addChildComponent(this.devicePanel);

        this.initializeTooltip();

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

        this.tracks.setBounds(bounds.removeFromLeft(196));
        this.pianoRoll.setBounds(bounds.clone());
    }
}