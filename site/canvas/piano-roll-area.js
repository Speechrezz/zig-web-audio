import { Note } from "../audio/playback-engine.js"
import { Component, Rectangle, Point } from "./component.js"
import { NoteComponent } from "./note-component.js";
import { MouseAction, MouseEvent, MouseActionPolicy } from "./mouse-event.js";
import { ComponentContext } from "./component-context.js";
import { AppCommand, AppEvent } from "../app/app-event.js";
import { AppTransaction } from "../app/undo-manager.js";

const UNDO_ID = "piano-roll-area";
const UndoType = Object.freeze({
    addNotes: "addNotes",
    removeNotes: "removeNotes",
    moveNote: "movesNote", 
})

const InteractionType = Object.freeze({
    none: 0, // NOT dragging
    newNote: 1,
    moveNote: 2, // Moving note around
    adjustNoteStart: 3, // Adjust length of note from start
    adjustNoteEnd: 4,   // Adjust length of note from end
});

export class PianoRollArea extends Component {
    // ---General---
    
    /**
     * @type {ComponentContext}
     */
    context;

    /**
    * @type {NoteComponent[]}
    */
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

    /**
     * Keeps track of notes that are being removed as user removes them to form a single transaction
     * @type {Note[]}
     */
    removedNotesBuffer = [];

    lastBeatLength = 1;

    /**
     * @param {ComponentContext} context 
     */
    constructor(context) {
        super();
        this.context = context;

        this.context.undoManager.addListener(UNDO_ID, this);
        this.context.eventRouter.addListener(this);

        this.context.config.addZoomListener(() => this.zoomChanged());
        this.zoomChanged();
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const config = this.context.config;

        // Lanes
        for (let p = config.pitchMin; p <= config.pitchMax; p++) {
            const y = (config.pitchMax - p) * config.noteHeight;
            ctx.fillStyle = config.isBlackKey(p) ? "oklch(96.7% 0.003 264.542)" : "white";
            ctx.fillRect(0, y, this.bounds.width, config.noteHeight);
        }

        // Grid
        ctx.lineWidth = 1;
        let gridIndex = 0;
        for (let x = 0; x < this.bounds.width; x += config.beatWidth) {
            ctx.strokeStyle = gridIndex % 4 == 0 ? "oklch(70.7% 0.165 254.624)" : "oklch(88.2% 0.059 254.128)";

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.bounds.height);
            ctx.stroke();

            gridIndex++;
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
            const x = playHead.positionInBeats * config.beatWidth;
            ctx.fillStyle = "oklch(70.7% 0.165 254.624 / 0.5)";
            ctx.fillRect(x, 0, 8, this.bounds.height);
        }
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
                return MouseActionPolicy.ignorePropogate;
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
     * Override to handle undo events.
     * @param {AppTransaction} transaction 
     */
    undo(transaction) {
        switch (transaction.type) {
            case UndoType.addNotes: {
                /** @type {Note[]} */
                const notes = transaction.diff;
                for (const note of notes) {
                    const noteComponent = this.noteComponents.find((v) => v.note.id === note.id);
                    if (noteComponent !== undefined) {
                        this.removeNotes([noteComponent], false);   
                    }
                }
                this.repaint();
                break;
            }
            case UndoType.removeNotes: {
                const notes = cloneNotes(transaction.diff);
                this.addNotes(notes, false);
                this.repaint();
                break;
            }
            case UndoType.moveNote: {
                /** @type {Note[]} */
                const diffNotes = transaction.diff;
                for (const diffNote of diffNotes) {
                    const noteComponent = this.noteComponents.find((v) => v.note.id === diffNote.id);
                    if (noteComponent === undefined) continue;

                    noteComponent.note.beatStart  -= diffNote.beatStart;
                    noteComponent.note.beatLength -= diffNote.beatLength;
                    noteComponent.note.noteNumber -= diffNote.noteNumber;
                    this.updateNoteBounds(noteComponent);
                }

                this.repaint();
                break;
            }
        }
    }

    /**
     * Override to handle undo events.
     * @param {AppTransaction} transaction 
     */
    redo(transaction) {
        switch (transaction.type) {
            case UndoType.addNotes: {
                const notes = cloneNotes(transaction.diff);
                this.addNotes(notes, false);
                this.repaint();
                break;
            }
            case UndoType.removeNotes: {
                /** @type {Note} */
                const notes = transaction.diff;
                for (const note of notes) {
                    const noteComponent = this.noteComponents.find((v) => v.note.id === note.id);
                    if (noteComponent !== undefined) {
                        this.removeNotes([noteComponent], false);   
                    }
                }
                this.repaint();
                break;
            }
            case UndoType.moveNote: {
                /** @type {Note[]} */
                const diffNotes = transaction.diff;
                for (const diffNote of diffNotes) {
                    const noteComponent = this.noteComponents.find((v) => v.note.id === diffNote.id);
                    if (noteComponent === undefined) continue;

                    noteComponent.note.beatStart  += diffNote.beatStart;
                    noteComponent.note.beatLength += diffNote.beatLength;
                    noteComponent.note.noteNumber += diffNote.noteNumber;
                    this.updateNoteBounds(noteComponent);
                }

                this.repaint();
                break;
            }
        }
    }

    interactionTypeToCursor(interactionType, isMouseDown = true) {
        switch (interactionType) {
            case InteractionType.none:
                return "auto";
            case InteractionType.newNote:
            case InteractionType.adjustNoteStart:
            case InteractionType.adjustNoteEnd:
                return "ew-resize";
            case InteractionType.moveNote:
                return isMouseDown ? "grabbing" : "grab";
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

    /**
     * When clicking/hovering a note, this will determine which interaction type the user wants to perform
     * @param {MouseEvent} ev Mouse event
     * @param {NoteComponent} noteComponent NoteComponent which is being interacted with
     * @returns InteractionType
     */
    getGrabType(ev, noteComponent) {
        const margin = 6;

        const x = noteComponent.bounds.x;
        const width = noteComponent.bounds.width;

        if (ev.x - x >= width - margin)
            return InteractionType.adjustNoteEnd;
        if (ev.x - x <= margin)
            return InteractionType.adjustNoteStart;
        return InteractionType.moveNote;
    }

    /**
     * @param {Note[]} notes 
     * @param {boolean} addToUndo If `true`, this will assign the note object a new unique ID and notify the undo manager
     */
    addNotes(notes, addToUndo = true) {
        const instrument = this.context.playbackEngine.getSelectedInstrument();
        /** @type {NoteComponent[]} */
        const noteComponents = [];

        for (const note of notes) {
            if (addToUndo) {
                note.id = instrument.getNextNoteId();
            }

            instrument.notes.push(note);
            const noteComponent = new NoteComponent(note);

            this.noteComponents.push(noteComponent);
            this.addChildComponent(noteComponent);

            this.updateNoteBounds(noteComponent);

            noteComponents.push(noteComponent);
        }

        if (addToUndo) {
            this.context.undoManager.push(new AppTransaction(UNDO_ID, UndoType.addNotes, cloneNotes(notes)));
        }

        return noteComponents;
    }

    /**
     * @param {number} x relative to this component
     * @param {number} y relative to this component
     */
    addNoteAt(x, y) {
        const beat = Math.floor(this.xToBeat(x));
        const noteNumber = this.yToNoteNumber(y);

        const note = new Note(beat, this.lastBeatLength, noteNumber);
        return this.addNotes([note])[0];
    }

    /**
     * @param {NoteComponent[]} noteComponents 
     * @param {boolean} addToUndo If `true`, this will notify the undo manager
     */
    removeNotes(noteComponents, addToUndo = true) {
        for (const noteComponent of noteComponents) {
            const noteComponentIndex = this.noteComponents.indexOf(noteComponent);
            this.noteComponents.splice(noteComponentIndex, 1);

            const playbackEngineNotes = this.context.playbackEngine.getSelectedInstrument().notes;
            const engineNoteIndex = playbackEngineNotes.indexOf(noteComponent.note);
            playbackEngineNotes.splice(engineNoteIndex, 1);

            this.removeChildComponent(noteComponent);
        }

        if (addToUndo) {
            /** @type {Note[]} */
            const notes = [];
            for (const noteComponent of noteComponents) {
                notes.push(noteComponent.note.clone());
            }
            this.context.undoManager.push(new AppTransaction(UNDO_ID, UndoType.removeNotes, notes));
        }
    }

    /**
     * @param {number} x relative to this component
     * @param {number} y relative to this component
     */
    removeNoteAt(x, y) {
        const noteComponent = this.findNoteAt(x, y);
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

        let beatLengthOffset = Math.round(this.xToBeat(ev.x) - this.selectedNoteMain.noteAnchor.getBeatStop());
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

        let beatStartOffset = Math.round(this.xToBeat(ev.x) - this.selectedNoteMain.noteAnchor.beatStart);
        beatStartOffset = Math.min(beatStartOffset, shortestLength - 1);

        for (const selectedNote of this.selectedNotes) {
            const beatStop = selectedNote.noteAnchor.getBeatStop();
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
            
            this.context.undoManager.push(new AppTransaction(UNDO_ID, UndoType.moveNote, noteDiffs));
        }

        this.lastBeatLength = this.selectedNoteMain.note.beatLength;
        this.interactionType = InteractionType.none;
    }

    /**
     * @param {MouseEvent} ev 
     */
    removeNoteBegin(ev) {
        document.documentElement.style.cursor = "not-allowed";
        this.clearSelection();
        this.removedNotesBuffer.length = 0;

        const removedNote = this.removeNoteAt(ev.x, ev.y);
        if (removedNote !== null) {
            this.removedNotesBuffer.push(removedNote);
        }

        this.repaint();
    }

    /**
     * @param {MouseEvent} ev 
     */
    removeNoteStep(ev) {
        const removedNote = this.removeNoteAt(ev.x, ev.y);
        if (removedNote !== null) {
            this.removedNotesBuffer.push(removedNote);
            this.repaint();
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    removeNoteEnd(ev) {
        if (this.removedNotesBuffer.length > 0) {
            this.context.undoManager.push(new AppTransaction(UNDO_ID, UndoType.removeNotes, cloneNotes(this.removedNotesBuffer)));
        }
    }
    
    /**
     * @param {MouseEvent} ev 
     */
    selectionBegin(ev) {
        this.clearSelection();
        document.documentElement.style.cursor = "crosshair";
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

        for (const noteComponent of this.noteComponents) {
            if (noteComponent.bounds.intersects(bounds)) {
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
            notesToCopy.push(noteComponent.note.clone());
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

    /**
     * @param {number} x relative to this component
     * @param {number} y relative to this component
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

    beatToX(beat) {
        return beat * this.context.config.beatWidth;
    }

    xToBeat(x) {
        return x / this.context.config.beatWidth;
    }

    noteNumberToY(noteNumber) {
        return this.bounds.height - (noteNumber - this.context.config.pitchMin + 1) * this.context.config.noteHeight;
    }

    yToNoteNumber(y) {
        y = this.bounds.height - y;
        return this.context.config.pitchMin + Math.floor(y / this.context.config.noteHeight);
    }

    /**
     * 
     * @param {NoteComponent} noteComponent 
     */
    updateNoteBounds(noteComponent) {
        const x = this.beatToX(noteComponent.note.beatStart);
        const y = this.noteNumberToY(noteComponent.note.noteNumber);

        noteComponent.setBounds(new Rectangle(x, y, this.context.config.beatWidth * noteComponent.note.beatLength, this.context.config.noteHeight));
    }

    indexOfNote(x, noteNumber) {
        const notes = this.context.playbackEngine.getSelectedInstrument().notes;
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            if (note.beatStart == x && note.noteNumber == noteNumber) {
                return i;
            }
        }

        return null;
    }

    zoomChanged() {
        this.setBounds(new Rectangle(0, 0, this.context.config.calculateWidth(), this.context.config.calculateHeight()));

        for (const note of this.noteComponents) {
            this.updateNoteBounds(this.selectedNoteMain);
        }

        this.repaint();
    }
}

function cloneNotes(notes) {
    /** @type {Note[]} */
    const cloned = [];

    for (const note of notes) {
        cloned.push(note.clone());
    }

    return cloned;
}