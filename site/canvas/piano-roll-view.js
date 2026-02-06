import { Component } from "./component.js";
import { Rectangle } from "./rectangle.js";
import { Point } from "./point.js";
import { AppContext } from "../app/app-context.js"
import { NotesManager } from "../audio/notes-manager.js";
import { NoteComponent } from "./note-component.js";
import { InstrumentEvent } from "../audio/audio-constants.js";
import { MouseAction, MouseActionPolicy } from "./mouse-event.js";
import { AppCommand } from "../app/app-event.js";

const UNDO_ID = "piano-roll-view";
const UndoType = Object.freeze({
    addNotes: "addNotes",
    removeNotes: "removeNotes",
    moveNote: "movesNote", 
})

const InteractionType = Object.freeze({
    none: 0,            // NOT dragging
    newNote: 1,         // New note
    removeNote: 2,      // New note
    moveNote: 3,        // Moving note around
    adjustNoteStart: 4, // Adjust length of note from start
    adjustNoteEnd: 5,   // Adjust length of note from end
    select: 6,          // Selecting
});

export class PianoRollView extends Component {
    // ---General---

    /** @type {AppContext} */
    context;

    /** @type {Point} */
    viewOffset = new Point();

    /** @type {NotesManager} */
    notesManager;

    /** @type {NoteComponent[]} */
    noteComponents = [];

    // ---Note Editing---

    /** How the user is currently interacting with notes */
    interactionType = InteractionType.none;
    /** Initial position of mouse when beginning to interact */
    interactionAnchor = new Point();

    /** @type {Rectangle | null} */
    selectionBounds = null;
    
    /**
     * The main `NoteComponent` being edited/moved
     * @type {NoteComponent | null}
     */
    selectedNoteMain = null;

    /**
     * All currently selected `NoteComponent`s
     * @type {NoteComponent[]}
     */
    selectedNotes = [];

    lastBeatLength = 1;
    
    /**
     * @param {AppContext} context 
     */
    constructor(context) {
        super();
        
        this.context = context;

        this.notesManager = new NotesManager(this.context.instruments, this.context.undoManager);
        this.notesManager.pianoRollCallback = () => { this.resetNotes(); this.repaint(); };

        this.context.instruments.addListener(InstrumentEvent.InstrumentSelected, () => this.instrumentSelected());
        this.context.eventRouter.addListener(this);

        this.context.config.addZoomListener(() => this.zoomChanged());
        this.zoomChanged();
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const config = this.context.config;
        const bounds = this.getLocalBounds();
        const fullWidth = config.calculateWidth();

        // Note lanes
        const pitchOffset = -this.viewOffset.y / config.noteHeight;
        const numPitches = bounds.height / config.noteHeight;
        const yOffset = config.noteHeight * (pitchOffset - Math.floor(pitchOffset));
        for (let p = 0; p < numPitches + 1; p += 1) {
            const pitch = config.pitchMax - (p + Math.floor(pitchOffset));
            const y = p * config.noteHeight - yOffset;
            ctx.fillStyle = config.isBlackKey(pitch) ? "oklch(96.7% 0.003 264.542)" : "white";
            ctx.fillRect(0, y, this.bounds.width, config.noteHeight);
        }

        // Darken out-of-bounds
        ctx.fillStyle = "oklch(21% 0.034 264.665/0.05)"
        if (this.viewOffset.x > 0) {
            ctx.fillRect(0, 0, this.viewOffset.x, bounds.height);
        }
        const xEnd = fullWidth + this.viewOffset.x;
        if (xEnd < bounds.width) {
            ctx.fillRect(xEnd, 0, bounds.width - xEnd, bounds.height);
        }

        // Beat grid
        const beatOffset = -this.viewOffset.x / config.beatWidth;
        const numBeats = bounds.width / config.beatWidth;
        const xOffset = config.beatWidth * (beatOffset - Math.floor(beatOffset));
        ctx.lineWidth = 1;
        for (let b = 0; b < numBeats; b += 1) {
            const beat = b + Math.floor(beatOffset);
            ctx.strokeStyle = beat % 4 == 0 ? "oklch(70.7% 0.165 254.624)" : "oklch(88.2% 0.059 254.128)";
            const x = b * config.beatWidth - xOffset;

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.bounds.height);
            ctx.stroke();
        }

        // Selection bounds
        if (this.selectionBounds !== null) {
            ctx.fillStyle = "oklch(88.2% 0.059 254.128/0.25)";
            ctx.fillRect(this.selectionBounds.x, this.selectionBounds.y, this.selectionBounds.width, this.selectionBounds.height);

            ctx.strokeStyle = "oklch(70.7% 0.165 254.624)";
            ctx.strokeRect(this.selectionBounds.x, this.selectionBounds.y, this.selectionBounds.width, this.selectionBounds.height);
        }

        // Playhead
        const playHead = this.context.playbackEngine.playHead;
        if (playHead.isPlaying) {
            const x = playHead.positionInBeats * config.beatWidth + this.viewOffset.x;
            ctx.fillStyle = "oklch(70.7% 0.165 254.624 / 0.5)";
            ctx.fillRect(x, 0, 8, this.bounds.height);
        }

        // Draw notes
        for (const noteComponent of this.noteComponents) {
            ctx.save();
            ctx.translate(noteComponent.toParentX(0), noteComponent.toParentY(0));

            noteComponent.draw(ctx);

            ctx.restore();
        }
    }

    /**
     * @param {Point} offset 
     */
    setViewOffset(offset) {
        this.viewOffset.set(offset);
        this.repaint();
    }

    zoomChanged() {

    }

    /**
     * Override to change mouse action handling policy
     * @param {MouseAction} mouseAction 
     * @returns MouseHandlePolicy
     */
    canHandleMouseAction(mouseAction) {
        switch (mouseAction) {
            case MouseAction.none:
            case MouseAction.draw:
            case MouseAction.remove:
            case MouseAction.select:
                return MouseActionPolicy.acceptBlock;

            default:
                return MouseActionPolicy.ignorePropagate;
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    mouseMove(ev) {
        this.updateMouseHighlightCursor(ev);
    }

    /**
     * @param {MouseEvent} ev 
     */
    mouseDown(ev) {
        if (ev.mouseAction === MouseAction.draw) {
            const existingNote = this.findNoteAt(ev.x, ev.y);
            if (existingNote === null) {
                const newNote = this.addNoteAt(ev.x, ev.y);
                this.adjustNoteBegin(ev, newNote, InteractionType.newNote);
            }
            else {
                const interactionType = this.getGrabType(ev, existingNote);
                this.adjustNoteBegin(ev, existingNote, interactionType);
            }
        }
        else if (ev.mouseAction === MouseAction.remove) {
            this.removeNoteBegin(ev);
        }
        else if (ev.mouseAction === MouseAction.select) {
            this.selectionBegin(ev);
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    mouseDrag(ev) {
        if (ev.mouseAction === MouseAction.draw) {
            this.adjustNoteStep(ev);
        }
        else if (ev.mouseAction === MouseAction.remove) {
            this.removeNoteStep(ev);
        }
        else if (ev.mouseAction === MouseAction.select) {
            this.selectionUpdate(ev);
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    mouseUp(ev) {
        if (ev.mouseAction === MouseAction.draw) {
            this.adjustNoteEnd(ev);
        }
        else if (ev.mouseAction === MouseAction.remove) {
            this.removeNoteEnd(ev);
        }
        else if (ev.mouseAction === MouseAction.select) {
            this.selectionEnd(ev);
        }

        this.updateMouseHighlightCursor(ev);
    }

    /**
     * Specify which events this listener can handle.
     * @param {AppEvent} appEvent 
     * @returns {number | null} Must return a `number` priority (higher = more priority) or `null` if can't handle. 
     */
    canHandleEvent(appEvent) {
        switch (appEvent.command) {
            case AppCommand.delete:
            case AppCommand.copy:
            case AppCommand.paste:
            case AppCommand.cut:
            case AppCommand.selectAll:
                return 0;
        }

        return null;
    }

    /**
     * Handle the `AppEvent`.
     * @param {AppEvent} appEvent 
     */
    handleEvent(appEvent) {
        switch (appEvent.command) {
            case AppCommand.delete:
                this.deleteSelection();
                break;
            case AppCommand.copy:
                this.copySelection();
                break;
            case AppCommand.paste:
                this.pasteNotes();
                break;
            case AppCommand.cut:
                break; // TODO
            case AppCommand.selectAll:
                this.selectAll();
                break;
        }
    }

    /**
     * @param {InteractionType} interactionType 
     * @param {boolean} isMouseDown 
     */
    interactionTypeToCursor(interactionType, isMouseDown = true) {
        switch (interactionType) {
            default:
                return "auto";
            case InteractionType.none:
                return "auto";
            case InteractionType.newNote:
            case InteractionType.adjustNoteStart:
            case InteractionType.adjustNoteEnd:
                return "ew-resize";
            case InteractionType.moveNote:
                return isMouseDown ? "grabbing" : "grab";
            case InteractionType.removeNote:
                return "note-allowed";
            case InteractionType.select:
                return "crosshair";
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    updateMouseHighlightCursor(ev) {
        const existingNote = this.findNoteAt(ev.x, ev.y);
        if (existingNote === null) {
            document.documentElement.style.cursor = "auto";
        } else {
            const interactionType = this.getGrabType(ev, existingNote);
            document.documentElement.style.cursor = this.interactionTypeToCursor(interactionType, false);
        }
    }

    instrumentSelected() {

    }

    resetNotes() {

    }

    /**
     * @param {number} x 
     * @param {number} y 
     */
    findNoteAt(x, y) {
        return null;
    }
}