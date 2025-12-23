import { Component } from "./component.js";
import { MouseEvent, MouseAction, MouseActionPolicy } from "./mouse-event.js";
import { Note } from "../playback-engine.js";

export class NoteComponent extends Component{
    /**
     * @type {Note}
     */
    note

    /**
     * @type {(NoteComponent) => {}}
     */
    onRemove

    /**
     * @param {Note} note 
     * @param {(NoteComponent) => {}} onRemove 
     */
    constructor(note, onRemove) {
        super();

        this.note = note;
        this.onRemove = onRemove;
    }

    draw(ctx) {
        ctx.fillStyle = "oklch(70.7% 0.165 254.624)";
        ctx.beginPath();
        ctx.roundRect(0, 0, this.bounds.width, this.bounds.height, 4);
        ctx.fill();
    }

    /**
     * @param {MouseAction} mouseAction 
     */
    canHandleMouseAction(mouseAction) {
        switch (mouseAction) {
            case MouseAction.none:
            case MouseAction.draw:
            case MouseAction.remove:
                return MouseActionPolicy.acceptBlock;
            default:
                return MouseActionPolicy.ignorePropogate;
        }
    }

    mouseDown(ev) {
        if (ev.mouseAction === MouseAction.remove) {
            this.onRemove(this);
        }
    }
}