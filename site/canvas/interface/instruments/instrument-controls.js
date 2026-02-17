import { Instrument } from "../../../audio/instrument.js";
import { Component } from "../../framework/component.js";
import { Button } from "../../framework/components/button.js";
import { Rectangle } from "../../framework/rectangle.js";

export class InstrumentControls extends Component {
    /** @type {Instrument} */
    instrument;

    /** @type {Button} */
    deleteButton = new Button("x");

    /** @type {Rectangle} */
    headerBounds = new Rectangle;

    /** @type {bool} */
    isSelected = false;

    /** @type {null | (index: number) => void} */
    onDelete = null;

    /** @type {null | (index: number) => void} */
    onClick = null;

    /**
     * @param {Instrument} instrument 
     */
    constructor(instrument) {
        super();

        this.instrument = instrument;

        this.addChildComponent(this.deleteButton);
        this.deleteButton.onClick = () => {
            if (this.onDelete !== null)
                this.onDelete(this.instrument.index);
        }
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bounds = this.getLocalBounds();

        ctx.fillStyle = this.isSelected ? "oklch(98.5% 0.002 247.839)" : "oklch(92.8% 0.006 264.531)";
        ctx.beginPath();
        ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 4);
        ctx.fill();

        ctx.fillStyle = "oklch(13% 0.028 261.692)";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = "16px system-ui";
        ctx.fillText(this.instrument.name, this.headerBounds.x, this.headerBounds.getCenterY());

        bounds.reduce(0.5, 0.5);
        ctx.lineWidth = 1;
        ctx.strokeStyle = this.isSelected ? "oklch(70.7% 0.165 254.624)" : "oklch(55.1% 0.027 264.364)";

        ctx.beginPath();
        ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 4);
        ctx.stroke();
    }

    resized() {
        const bounds = this.getLocalBounds();
        bounds.reduce(8, 8);

        this.headerBounds = bounds.removeFromTop(24);
        this.deleteButton.setBounds(this.headerBounds.removeFromRight(24));
    }

    /** @param {MouseEvent} ev */
    mouseDown(ev) {
        if (this.onClick !== null)
            this.onClick(this.instrument.index);
    }

    /**
     * @param {bool} isSelected 
     */
    setSelected(isSelected) {
        if (this.isSelected === isSelected) return;

        this.isSelected = isSelected;
        this.repaint();
    }
}