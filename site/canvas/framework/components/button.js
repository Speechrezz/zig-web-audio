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

        ctx.fillStyle = "oklch(96.7% 0.003 264.542)";
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
}