import { Component } from "../../framework/component.js";
import { Note } from "../../../audio/note.js";

export class NoteComponent extends Component{
    /**
     * Note data
     * @type {Note}
     */
    note;

    /**
     * Used for adjusting note
     */
    noteAnchor = Note.create(0, 0, 0);

    isSelected = false;

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
        ctx.fillStyle = this.isSelected ? "oklch(80.9% 0.105 251.813)" : "oklch(70.7% 0.165 254.624)";
        ctx.strokeStyle = "oklch(62.3% 0.214 259.815)";
        ctx.lineWidth = 1;

        const offset = ctx.lineWidth * 0.5;
        ctx.beginPath();
        ctx.roundRect(offset, offset, this.bounds.width - ctx.lineWidth, this.bounds.height - ctx.lineWidth, 4);
        ctx.fill();
        ctx.stroke();
    }

    updateNoteAnchor() {
        this.noteAnchor.timeStart = this.note.timeStart;
        this.noteAnchor.timeLength = this.note.timeLength;
        this.noteAnchor.noteNumber = this.note.noteNumber;
    }

    hasMoved() {
        return this.noteAnchor.timeStart  !== this.note.timeStart
            || this.noteAnchor.timeLength !== this.note.timeLength
            || this.noteAnchor.noteNumber !== this.note.noteNumber;
    }

    getNoteDiff() {
        const noteDiff = Note.clone(this.note);

        noteDiff.timeStart  -= this.noteAnchor.timeStart;
        noteDiff.timeLength -= this.noteAnchor.timeLength;
        noteDiff.noteNumber -= this.noteAnchor.noteNumber;

        return noteDiff;
    }
}