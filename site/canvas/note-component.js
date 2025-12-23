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

    draw(ctx) {
        ctx.fillStyle = "oklch(70.7% 0.165 254.624)";
        ctx.beginPath();
        ctx.roundRect(0, 0, this.bounds.width, this.bounds.height, 4);
        ctx.fill();
    }

    clone() {
        return {...this};
    }
}