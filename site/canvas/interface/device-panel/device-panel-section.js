import { AppContext } from "../../../app/app-context.js";
import { InstrumentEvent } from "../../../audio/audio-constants.js";
import { Component } from "../../framework/component.js";

export class DevicePanelSection extends Component {
    /** @type {AppContext} */
    context;

    /**
     * @param {AppContext} context 
     */
    constructor(context) {
        super();
        this.context = context;

        this.context.instruments.addListener(InstrumentEvent.InstrumentSelected, () => this.instrumentSelected());
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bounds = this.getLocalBounds();
        const selectedInstrument = this.context.instruments.getSelected();

        ctx.fillStyle = "oklch(98.5% 0.002 247.839)";
        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

        ctx.fillStyle = "oklch(70.7% 0.022 261.325)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "24px system-ui";
        ctx.fillText(selectedInstrument ? "TODO: Device Panel" : "No instrument selected...", bounds.getCenterX(), bounds.getCenterY());

        if (selectedInstrument !== null) {
            ctx.fillStyle = "oklch(13% 0.028 261.692)";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.font = "18px system-ui";
            ctx.fillText(selectedInstrument.name, bounds.x + 8, bounds.getCenterY());
        }

        ctx.strokeStyle = "oklch(87.2% 0.01 258.338)";
        ctx.beginPath();
        ctx.moveTo(0, bounds.y + 0.5);
        ctx.lineTo(bounds.getRight(), bounds.y + 0.5);
        ctx.stroke();
    }

    resized() {
    }

    instrumentSelected() {
        this.repaint();
    }
}