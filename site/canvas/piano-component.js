import { Component, Rectangle, Point } from "./component.js";

export class PianoComponent extends Component{
    constructor() {
        super();
    }

    /**
     * Override to draw component.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        ctx.fillStyle = "oklch(70.7% 0.165 254.624)";
        ctx.fillRect(0, 0, this.bounds.width, this.bounds.height);
    }
}