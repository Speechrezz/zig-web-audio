import { Component } from "./component.js";
import { Note } from "../playback-engine.js";

export class NoteComponent extends Component{
    /**
     * @type {Note}
     */
    note

    /**
     * @param {Note} note 
     */
    constructor(note) {
        super();

        this.interceptsMouseEvents = false;
        this.note = note;
    }

    /**
     * Override to draw component.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        ctx.fillStyle = "oklch(70.7% 0.165 254.624)";
        ctx.strokeStyle = "oklch(62.3% 0.214 259.815)";
        ctx.lineWidth = 1;

        const offset = ctx.lineWidth * 0.5;
        ctx.beginPath();
        ctx.roundRect(offset, offset, this.bounds.width - ctx.lineWidth, this.bounds.height - ctx.lineWidth, 4);
        ctx.fill();
        ctx.stroke();
    }
}