import { Component } from "./component.js";
import { Rectangle } from "./rectangle.js";
import { Point } from "./point.js";
import { AppContext } from "../app/app-context.js"
import { cloneNotes, NotesManager } from "../audio/notes-manager.js";
import { NoteComponent } from "./note-component.js";
import { InstrumentEvent } from "../audio/audio-constants.js";
import { MouseAction, MouseActionPolicy } from "./mouse-event.js";
import { AppCommand } from "../app/app-event.js";
import { Note } from "../audio/note.js";

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
            ctx.translate(
                noteComponent.toParentX(0) + this.viewOffset.x,
                noteComponent.toParentY(0) + this.viewOffset.y,
            );

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
            case MouseAction.primary:
            case MouseAction.secondary:
            case MouseAction.select:
                return MouseActionPolicy.acceptBlock;

            default:
                return MouseActionPolicy.ignorePropagate;
        }
    }

    isEditable() {
        return this.context.instruments.selectedIndex !== null;
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
        if (ev.mouseAction === MouseAction.primary) {
            const existingNote = this.findNoteAtScreen(ev.x, ev.y);
            if (existingNote === null) {
                const newNote = this.addNoteAt(ev.x, ev.y);
                this.adjustNoteBegin(ev, newNote, InteractionType.newNote);
            }
            else {
                const interactionType = this.getGrabType(ev.x, existingNote);
                this.adjustNoteBegin(ev, existingNote, interactionType);
            }
        }
        else if (ev.mouseAction === MouseAction.secondary) {
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
        if (ev.mouseAction === MouseAction.primary) {
            this.adjustNoteStep(ev);
        }
        else if (ev.mouseAction === MouseAction.secondary) {
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
        if (ev.mouseAction === MouseAction.primary) {
            this.adjustNoteEnd(ev);
        }
        else if (ev.mouseAction === MouseAction.secondary) {
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
                return "not-allowed";
            case InteractionType.select:
                return "crosshair";
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    updateMouseHighlightCursor(ev) {
        const existingNote = this.findNoteAtScreen(ev.x, ev.y);
        if (existingNote === null) {
            document.documentElement.style.cursor = this.interactionTypeToCursor(InteractionType.none, false);
        } else {
            const interactionType = this.getGrabType(ev.x, existingNote);
            document.documentElement.style.cursor = this.interactionTypeToCursor(interactionType, false);
        }
    }

    instrumentSelected() {
        this.clearSelection();
        this.resetNotes();
        this.repaint();
    }

    resetNotes() {
        this.noteComponents.length = 0;

        const instrument = this.context.instruments.getSelected();
        if (instrument === null) return;

        for (const note of instrument.notes) {
            const noteComponent = new NoteComponent(note);
            this.updateNoteBounds(noteComponent);
            this.noteComponents.push(noteComponent);
        }
    }

    fromScreenX(screenX) {
        return screenX - this.viewOffset.x;
    }

    fromScreenY(screenY) {
        return screenY - this.viewOffset.y;
    }

    beatToX(beat) {
        return beat * this.context.config.beatWidth;
    }

    xToBeat(x) {
        return x / this.context.config.beatWidth;
    }

    xScreenToBeat(x) {
        x -= this.viewOffset.x;
        return x / this.context.config.beatWidth;
    }

    noteNumberToY(noteNumber) {
        return this.context.config.noteHeight * (this.context.config.pitchMax - noteNumber);
    }

    yToNoteNumber(y) {
        return this.context.config.pitchMax - Math.floor(y / this.context.config.noteHeight);
    }

    yScreenToNoteNumber(y) {
        y -= this.viewOffset.y;
        return this.context.config.pitchMax - Math.floor(y / this.context.config.noteHeight);
    }

    /**
     * @param {NoteComponent} noteComponent 
     */
    updateNoteBounds(noteComponent) {
        const x = this.beatToX(noteComponent.note.beatStart);
        const y = this.noteNumberToY(noteComponent.note.noteNumber);

        noteComponent.setBounds(new Rectangle(x, y, this.context.config.beatWidth * noteComponent.note.beatLength, this.context.config.noteHeight));
    }

    /**
     * @param {number} x 
     * @param {number} y 
     */
    findNoteAt(x, y) {
        for (let i = this.noteComponents.length - 1; i >= 0; i--) {
            const noteComponent = this.noteComponents[i];
            if (noteComponent.bounds.contains(x, y)) {
                return noteComponent;
            }
        }

        return null;
    }

    /**
     * @param {number} x 
     * @param {number} y 
     */
    findNoteAtScreen(x, y) {
        return this.findNoteAt(x - this.viewOffset.x, y - this.viewOffset.y);
    }

    /**
     * When clicking/hovering a note, this will determine which interaction type the user wants to perform
     * @param {MouseEvent} ev Mouse event
     * @param {NoteComponent} noteComponent NoteComponent which is being interacted with
     * @returns InteractionType
     */
    getGrabType(screenX, noteComponent) {
        const x = this.fromScreenX(screenX);
        const margin = 6;

        const noteX = noteComponent.bounds.x;
        const width = noteComponent.bounds.width;

        if (x - noteX >= width - margin)
            return InteractionType.adjustNoteEnd;
        if (x - noteX <= margin)
            return InteractionType.adjustNoteStart;
        return InteractionType.moveNote;
    }

    /**
     * @param {Note[]} notes 
     */
    addNotes(notes) {
        if (!this.isEditable()) return [];

        this.notesManager.addNotes(this.context.instruments.selectedIndex, notes);

        /** @type {NoteComponent[]} */
        const noteComponents = [];

        for (const note of notes) {
            const noteComponent = new NoteComponent(note);
            this.updateNoteBounds(noteComponent);

            this.noteComponents.push(noteComponent);
            noteComponents.push(noteComponent);
        }

        return noteComponents;
    }

    addNoteAt(x, y) {
        const beat = Math.floor(this.xScreenToBeat(x));
        const noteNumber = this.yScreenToNoteNumber(y);

        const note = Note.create(beat, this.lastBeatLength, noteNumber);
        return this.addNotes([note])[0];
    }

    /**
     * @param {NoteComponent[]} noteComponents 
     */
    removeNotes(noteComponents) {
        /** @type {Note[]} */
        const notes = [];

        for (const noteComponent of noteComponents) {
            this.deleteNoteComponent(noteComponent);
            notes.push(noteComponent.note);
        }

        this.notesManager.removeNotes(this.context.instruments.selectedIndex, notes);
    }

    /**
     * @param {NoteComponent} noteComponent 
     */
    deleteNoteComponent(noteComponent) {
        const noteComponentIndex = this.noteComponents.indexOf(noteComponent);
        this.noteComponents.splice(noteComponentIndex, 1);
    }

    /**
     * @param {number} x relative to this component
     * @param {number} y relative to this component
     */
    removeNoteAt(x, y) {
        const noteComponent = this.findNoteAtScreen(x, y);
        if (noteComponent !== null) {
            this.removeNotes([noteComponent], false);
            return noteComponent.note;
        }

        return null;
    }

    /**
     * @param {MouseEvent} ev 
     * @param {NoteComponent} noteComponent 
     * @param {number} interactionType InteractionType
     */
    adjustNoteBegin(ev, noteComponent, interactionType) {
        if (!this.isEditable()) return;
        this.context.playbackEngine.sendPreviewMidiNote(noteComponent.note.noteNumber);

        if (!this.isNoteSelected(noteComponent)) {
            this.clearSelection();
            this.selectedNotes.push(noteComponent);
            noteComponent.isSelected = true;
        }

        for (const selectedNote of this.selectedNotes) {
            selectedNote.updateNoteAnchor();
        }

        this.selectedNoteMain = noteComponent;
        this.interactionType = interactionType;
        this.interactionAnchor.x = ev.x;
        this.interactionAnchor.y = ev.y;
        
        document.documentElement.style.cursor = this.interactionTypeToCursor(interactionType);
        this.repaint();
    }

    /**
     * @param {MouseEvent} ev 
     */
    adjustNoteStep(ev) {
        if (this.interactionType === InteractionType.none) return;
        
        switch (this.interactionType) {
            case InteractionType.newNote: {
                const threshold = 6;
                const offsetX = ev.x - this.interactionAnchor.x;

                // User has to move mouse `threshold` pixels before adjusting kicks-in
                if (Math.abs(offsetX) >= threshold) {
                    this.interactionType = InteractionType.adjustNoteEnd;
                }
                break;
            }
            case InteractionType.moveNote:
                this.adjustNoteStepMoveNote(ev);
                break;
            case InteractionType.adjustNoteEnd:
                this.adjustNoteStepNoteEnd(ev);
                break;
            case InteractionType.adjustNoteStart:
                this.adjustNoteStepNoteStart(ev);
                break;
        }

        for (const selectedNote of this.selectedNotes) {
            this.updateNoteBounds(selectedNote);
        }
        this.repaint();
    }

    /**
     * @param {MouseEvent} ev 
     */
    adjustNoteStepMoveNote(ev) {
        const offsetX = ev.x - this.interactionAnchor.x;
        const offsetY = ev.y - this.interactionAnchor.y;

        const offsetBeats = Math.round(this.xToBeat(offsetX));
        const offsetPitch = Math.round(-offsetY / this.context.config.noteHeight);

        const oldNoteNumber = this.selectedNoteMain.note.noteNumber;

        for (const selectedNote of this.selectedNotes) {
            selectedNote.note.beatStart  = selectedNote.noteAnchor.beatStart + offsetBeats;
            selectedNote.note.noteNumber = selectedNote.noteAnchor.noteNumber + offsetPitch;
        }

        if (this.selectedNoteMain.note.noteNumber !== oldNoteNumber) {
            this.context.playbackEngine.sendPreviewMidiNote(this.selectedNoteMain.note.noteNumber);
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    adjustNoteStepNoteEnd(ev) {
        const shortestLength = this.findShortestNoteInSelection();

        let beatLengthOffset = Math.round(this.xScreenToBeat(ev.x) - Note.getBeatStop(this.selectedNoteMain.noteAnchor));
        beatLengthOffset = Math.max(1 - shortestLength, beatLengthOffset);

        for (const selectedNote of this.selectedNotes) {
            selectedNote.note.beatLength = selectedNote.noteAnchor.beatLength + beatLengthOffset;
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    adjustNoteStepNoteStart(ev) {
        const shortestLength = this.findShortestNoteInSelection();

        let beatStartOffset = Math.round(this.xScreenToBeat(ev.x) - this.selectedNoteMain.noteAnchor.beatStart);
        beatStartOffset = Math.min(beatStartOffset, shortestLength - 1);

        for (const selectedNote of this.selectedNotes) {
            const beatStop = Note.getBeatStop(selectedNote.noteAnchor);
            selectedNote.note.beatStart = selectedNote.noteAnchor.beatStart + beatStartOffset;
            selectedNote.note.beatLength = beatStop - selectedNote.note.beatStart;
        }
    }

    findShortestNoteInSelection() {
        let shortestLength = this.selectedNotes[0].noteAnchor.beatLength;
        for (const selectedNote of this.selectedNotes) {
            if (selectedNote.noteAnchor.beatLength < shortestLength) {
                shortestLength = selectedNote.noteAnchor.beatLength;
            }
        }

        return shortestLength;
    }

    /**
     * @param {MouseEvent} ev 
     */
    adjustNoteEnd(ev) {
        if (this.interactionType === InteractionType.none) return;

        if (this.selectedNoteMain.hasMoved()) {
            /** @type {Note[]} */
            const noteDiffs = [];
            for (const noteComponent of this.selectedNotes) {
                noteDiffs.push(noteComponent.getNoteDiff());        
            }
            
            this.notesManager.moveNotesGestureEnd(this.context.instruments.selectedIndex, noteDiffs);
        }

        this.lastBeatLength = this.selectedNoteMain.note.beatLength;
        this.interactionType = InteractionType.none;
    }

    /**
     * @param {MouseEvent} ev 
     */
    removeNoteBegin(ev) {
        document.documentElement.style.cursor = this.interactionTypeToCursor(InteractionType.removeNote);
        this.clearSelection();

        this.notesManager.removeNotesGestureBegin(this.context.instruments.selectedIndex);

        const noteToRemove = this.findNoteAtScreen(ev.x, ev.y);
        if (noteToRemove !== null) {
            this.notesManager.removeNotesGestureStep(noteToRemove.note);
            this.deleteNoteComponent(noteToRemove);
        }

        this.repaint();
    }

    /**
     * @param {MouseEvent} ev 
     */
    removeNoteStep(ev) {
        const noteToRemove = this.findNoteAtScreen(ev.x, ev.y);
        if (noteToRemove !== null) {
            this.notesManager.removeNotesGestureStep(noteToRemove.note);
            this.deleteNoteComponent(noteToRemove);
            this.repaint();
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    removeNoteEnd(ev) {
        this.notesManager.removeNotesGestureEnd();
    }

    /**
     * @param {MouseEvent} ev 
     */
    selectionBegin(ev) {
        this.clearSelection();
        document.documentElement.style.cursor = this.interactionTypeToCursor(InteractionType.select);
        this.interactionAnchor.x = ev.x;
        this.interactionAnchor.y = ev.y;
        this.selectionBounds = new Rectangle();
        this.selectionUpdate(ev);
    }

    /**
     * @param {MouseEvent} ev 
     */
    selectionUpdate(ev) {
        const bounds = this.selectionBounds;

        if (ev.x >= this.interactionAnchor.x) {
            bounds.x = this.interactionAnchor.x;
            bounds.width = ev.x - this.interactionAnchor.x;
        }
        else {
            bounds.x = ev.x;
            bounds.width = this.interactionAnchor.x - ev.x;
        }

        if (ev.y >= this.interactionAnchor.y) {
            bounds.y = this.interactionAnchor.y;
            bounds.height = ev.y - this.interactionAnchor.y;
        }
        else {
            bounds.y = ev.y;
            bounds.height = this.interactionAnchor.y - ev.y;
        }

        for (const selectedNote of this.selectedNotes) {
            selectedNote.isSelected = false;
        }
        this.selectedNotes.length = 0;

        const globalBounds = bounds.clone();
        globalBounds.translate(-this.viewOffset.x, -this.viewOffset.y);

        for (const noteComponent of this.noteComponents) {
            if (noteComponent.bounds.intersects(globalBounds)) {
                this.selectedNotes.push(noteComponent);
                noteComponent.isSelected = true;
            }
        }

        this.repaint();
    }
    
    /**
     * @param {MouseEvent} ev 
     */
    selectionEnd(ev) {
       this.selectionBounds = null;
       this.repaint();
    }

    /**
     * @param {NoteComponent} noteComponent 
     */
    addNoteToSelection(noteComponent) {
        this.selectedNotes.push(noteComponent);
        noteComponent.isSelected = true;
    }

    /**
     * @param {NoteComponent[]} noteComponents 
     */
    addNotesToSelection(noteComponents) {
        for (const noteComponent of noteComponents) {
            this.addNoteToSelection(noteComponent);
        }
    }

    selectAll() {
        this.clearSelection();
        this.addNotesToSelection(this.noteComponents);
        this.repaint();
    }
    
    clearSelection() {
        for (const selectedNote of this.selectedNotes) {
            selectedNote.isSelected = false;
        }

        this.selectedNoteMain = null;
        this.selectedNotes.length = 0;
    }

    deleteSelection() {
        this.removeNotes(this.selectedNotes);
        
        this.selectedNoteMain = null;
        this.selectedNotes.length = 0;

        this.repaint();
    }

    copySelection() {
        if (this.selectedNotes.length === 0) return;

        /** @type {Note[]} */
        const notesToCopy = [];
        for (const noteComponent of this.selectedNotes) {
            notesToCopy.push(Note.clone(noteComponent.note));
        }

        this.context.clipboardManager.setClipboard("notes", notesToCopy);
    }

    pasteNotes() {
        if (this.context.clipboardManager.getType() !== "notes") return;

        this.clearSelection();

        const notesToPaste = cloneNotes(this.context.clipboardManager.getClipboard());

        for (const note of notesToPaste) {
            note.beatStart += 1;
        }

        const noteComponents = this.addNotes(notesToPaste);
        this.addNotesToSelection(noteComponents);

        this.repaint();
    }

    isNoteSelected(noteComponent) {
        return this.selectedNotes.indexOf(noteComponent) >= 0;
    }
}