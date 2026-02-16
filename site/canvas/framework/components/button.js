import { Component } from "../component.js";
import { MouseEvent } from "../mouse-event.js";
import { CursorStyle, setCursorStyle } from "../cursor-style.js"

export class Button extends Component {
    /** @type {null | string} */
    name;

    /** @type {undefined | () => void} */
    onClick = undefined;

    /**
     * @param {null | string} name 
     */
    constructor(name = null) {
        super();

        this.name = name;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bounds = this.getLocalBounds();

        if (!this.isMouseOver()) {
            ctx.fillStyle = "oklch(96.7% 0.003 264.542)";
        }
        else if (this.isMouseDown()) {
            ctx.fillStyle = "oklch(70.7% 0.022 261.325)";
        }
        else {
            ctx.fillStyle = "oklch(87.2% 0.01 258.338)";
        }

        ctx.beginPath();
        ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 4);
        ctx.fill();

        if (this.name !== null) {
            ctx.fillStyle = "oklch(13% 0.028 261.692)";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "20px system-ui";
            ctx.fillText(this.name, bounds.getCenterX(), bounds.getCenterY());
        }

        ctx.strokeStyle = "oklch(55.1% 0.027 264.364)";
        ctx.lineWidth = 1;
        bounds.reduce(0.5, 0.5);

        ctx.beginPath();
        ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 4);
        ctx.stroke();
    }

    /** @param {MouseEvent} ev */
    mouseDown(ev) {
        this.repaint();
    }

    /** @param {MouseEvent} ev */
    mouseUp(ev) {
        if (this.getLocalBounds().contains(ev.x, ev.y)) {
            if (this.onClick !== undefined) {
                this.onClick();
            }
        }

        this.repaint();
    }

    /** @param {MouseEvent} ev */
    mouseEnter(ev) {
        this.repaint();
        setCursorStyle(CursorStyle.pointer);
    }

    /** @param {MouseEvent} ev */
    mouseExit(ev) {
        this.repaint();
        setCursorStyle(CursorStyle.normal);
    }
}