import { Component } from "../component.js";

export class ValueTooltip extends Component {
    /** @type {string} */
    text = "";
    font = "14px system-ui";

    constructor() {
        super();
        this.interceptsMouseEvents = false;
        this.visibleFlag = false;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bounds = this.getLocalBounds();

        ctx.fillStyle = "oklch(98.5% 0.002 247.839)";
        ctx.beginPath();
        ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 4);
        ctx.fill();

        bounds.reduce(0.5, 0.5);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "oklch(70.7% 0.022 261.325)";
        ctx.beginPath();
        ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 4);
        ctx.stroke();

        ctx.fillStyle = "oklch(13% 0.028 261.692)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "14px system-ui";
        ctx.fillText(this.text, bounds.getCenterX(), bounds.getCenterY());
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} text 
     */
    setText(ctx, text) {
        const paddingX = 16;

        this.text = text;
        ctx.font = this.font;
        const textWidth = ctx.measureText(this.text).width;

        this.setBounds(this.bounds.withSizeKeepingCenter(textWidth + paddingX, this.bounds.height));
        this.repaint();
    }
}