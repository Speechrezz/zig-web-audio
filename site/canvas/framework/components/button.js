import { Component } from "../component.js";
import { MouseEvent } from "../mouse-event.js";

export class Button extends Component {
    /** @type {undefined | () => void} */
    onClick = undefined;

    constructor() {
        super();
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bounds = this.getLocalBounds();

        ctx.fillStyle = this.isMouseOverOrDragging() ? "oklch(87.2% 0.01 258.338)" : "oklch(96.7% 0.003 264.542)";
        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

        ctx.strokeStyle = "oklch(55.1% 0.027 264.364)";
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    /** @param {MouseEvent} ev */
    // mouseDown(ev) {}

    /** @param {MouseEvent} ev */
    mouseUp(ev) {
        if (this.getLocalBounds().contains(ev.x, ev.y)) {
            if (this.onClick !== undefined) {
                this.onClick();
            }
        }
    }

    /** @param {MouseEvent} ev */
    mouseEnter(ev) {
        console.log("Button.mouseEnter()");
        this.repaint();
    }

    /** @param {MouseEvent} ev */
    mouseExit(ev) {
        console.log("Button.mouseExit()");
        this.repaint();
    }
}