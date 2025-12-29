import { PlaybackEngine, Note } from "../audio/playback-engine.js"
import { Component, Rectangle, Point } from "./component.js"
import { NoteComponent } from "./note-component.js";
import { MouseAction, MouseEvent, MouseActionPolicy } from "./mouse-event.js";
import { Config } from "../app/config.js";

const InteractionType = Object.freeze({
    none: 0, // NOT dragging
    newNote: 1,
    moveNote: 2, // Moving note around
    adjustNoteStart: 3, // Adjust length of note from start
    adjustNoteEnd: 4,   // Adjust length of note from end
});

export class PianoRollArea extends Component {
    /**
     * @type {PlaybackEngine}
     */
    playbackEngine;



    /**
     * @type {Config}
    */
    config;

    /**
    * @type {NoteComponent[]}
    */
    noteComponents = [];

  
    // ---Note Editing---

    /** How the user is currently interacting with notes */
    interactionType = InteractionType.none;
    /** Initial position of mouse when beginning to interact */
    interactionAnchor = new Point();
    
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
     * @param {PlaybackEngine} playbackEngine 
     * @param {Config} config 
     */
    constructor(playbackEngine, config) {
        super();
        this.playbackEngine = playbackEngine;
        this.config = config;

        this.config.addZoomListener(() => this.zoomChanged());
        this.zoomChanged();
    }

    draw(ctx) {
        // Lanes
        for (let p = this.config.pitchMin; p <= this.config.pitchMax; p++) {
            const y = (this.config.pitchMax - p) * this.config.noteHeight;
            ctx.fillStyle = this.config.isBlackKey(p) ? "oklch(96.7% 0.003 264.542)" : "white";
            ctx.fillRect(0, y, this.bounds.width, this.config.noteHeight);
        }

        // Grid
        ctx.lineWidth = 1;
        let gridIndex = 0;
        for (let x = 0; x < this.bounds.width; x += this.config.beatWidth) {
            ctx.strokeStyle = gridIndex % 4 == 0 ? "oklch(70.7% 0.165 254.624)" : "oklch(88.2% 0.059 254.128)";

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.bounds.height);
            ctx.stroke();

            gridIndex++;
        }

        // Playhead
        const playHead = this.playbackEngine.playHead;
        if (playHead.isPlaying) {
            const x = playHead.positionInBeats * this.config.beatWidth;
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
            this.removeNoteAt(ev.x, ev.y);
            document.documentElement.style.cursor = "not-allowed";
        }
        else if (ev.mouseAction === MouseAction.select) {
            document.documentElement.style.cursor = "crosshair";
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    mouseDrag(ev) {
        if (ev.mouseAction === MouseAction.remove) {
            this.removeNoteAt(ev.x, ev.y);
        }
        else {
            this.adjustNoteStep(ev);
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    mouseUp(ev) {
        if (ev.mouseAction === MouseAction.draw) {
            this.adjustNoteEnd(ev);
        }

        this.updateMouseHighlightCursor(ev);
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
     * @param {Note} note 
     */
    addNote(note) {
        this.playbackEngine.getSelectedInstrument().notes.push(note);
        const noteComponent = new NoteComponent(note, (c) => this.removeNote(c));

        this.noteComponents.push(noteComponent);
        this.addChildComponent(noteComponent);

        this.updateNoteBounds(noteComponent);
        this.repaint();

        return noteComponent;
    }

    /**
     * @param {Number} x relative to this component
     * @param {Number} y relative to this component
     */
    addNoteAt(x, y) {
        const beat = Math.floor(this.xToBeat(x));
        const noteNumber = this.yToNoteNumber(y);

        const note = new Note(beat, this.lastBeatLength, noteNumber);
        return this.addNote(note);
    }

    /**
     * @param {NoteComponent} noteComponent 
     */
    removeNote(noteComponent) {
        const noteComponentIndex = this.noteComponents.indexOf(noteComponent);
        this.noteComponents.splice(noteComponentIndex, 1);

        const playbackEngineNotes = this.playbackEngine.getSelectedInstrument().notes;
        const engineNoteIndex = playbackEngineNotes.indexOf(noteComponent.note);
        playbackEngineNotes.splice(engineNoteIndex, 1);

        this.removeChildComponent(noteComponent);
        this.repaint();
    }

    /**
     * @param {Number} x relative to this component
     * @param {Number} y relative to this component
     */
    removeNoteAt(x, y) {
        const noteComponent = this.findNoteAt(x, y);
        if (noteComponent !== null) {
            this.removeNote(noteComponent);
        }
    }

    /**
     * @param {MouseEvent} ev 
     * @param {NoteComponent} noteComponent 
     * @param {Number} interactionType InteractionType
     */
    adjustNoteBegin(ev, noteComponent, interactionType) {
        this.playbackEngine.sendPreviewMidiNote(noteComponent.note.noteNumber);

        this.interactionType = interactionType;
        this.interactionAnchor.x = ev.x;
        this.interactionAnchor.y = ev.y;
        this.selectedNoteMain = noteComponent;

        this.selectedNoteMain.updateNoteAnchor();
        
        document.documentElement.style.cursor = this.interactionTypeToCursor(interactionType);
    }

    /**
     * @param {MouseEvent} ev 
     */
    adjustNoteStep(ev) {
        if (this.interactionType === InteractionType.none) return;

        const noteMain = this.selectedNoteMain.note;
        const noteAnchor = this.selectedNoteMain.noteAnchor;
        
        switch (this.interactionType) {
            case InteractionType.newNote: {
                const threshold = 4;
                const offsetX = ev.x - this.interactionAnchor.x;

                // User has to move mouse `threshold` pixels before adjusting kicks-in
                if (Math.abs(offsetX) >= threshold) {
                    this.interactionType = InteractionType.adjustNoteEnd;
                }
                break;
            }
            case InteractionType.moveNote: {
                const offsetX = ev.x - this.interactionAnchor.x;
                const offsetY = ev.y - this.interactionAnchor.y;

                const offsetBeats  = Math.round(this.xToBeat(offsetX));
                const offsetPitch = Math.round(-offsetY / this.config.noteHeight);

                let newBeatStart = noteAnchor.beatStart + offsetBeats;
                let newNoteNumber = noteAnchor.noteNumber + offsetPitch;

                newBeatStart  = Math.max(0, Math.min(this.config.lengthInBeats - noteMain.beatLength, newBeatStart));
                newNoteNumber = Math.max(this.config.pitchMin, Math.min(this.config.pitchMax, newNoteNumber));

                if (newNoteNumber !== noteMain.noteNumber) {
                    this.playbackEngine.sendPreviewMidiNote(newNoteNumber);
                }

                noteMain.beatStart = newBeatStart;
                noteMain.noteNumber = newNoteNumber;
                break;
            }
            case InteractionType.adjustNoteEnd: {
                const beatLength = Math.round(this.xToBeat(ev.x) - noteMain.beatStart);
                noteMain.beatLength = Math.max(1, beatLength);
                break;
            }
            case InteractionType.adjustNoteStart: {
                const beatStop = noteAnchor.getBeatStop();

                let offsetBeats = Math.round(this.xToBeat(ev.x) - noteAnchor.beatStart);
                offsetBeats = Math.min(offsetBeats, noteAnchor.beatLength - 1);

                noteMain.beatStart = noteAnchor.beatStart + offsetBeats;
                noteMain.beatLength = beatStop - noteMain.beatStart;
                break;
            }
        }

        this.updateNoteBounds(this.selectedNoteMain);
        this.repaint();
    }

    /**
     * @param {MouseEvent} ev 
     */
    adjustNoteEnd(ev) {
        if (this.interactionType === InteractionType.none) return;

        this.lastBeatLength = this.selectedNoteMain.note.beatLength;
        document.documentElement.style.cursor = "auto";
        this.interactionType = InteractionType.none;

        this.selectedNoteMain.offsetBeats = 0;
        this.selectedNoteMain.offsetPitch = 0;
    }

    /**
     * @param {Number} x relative to this component
     * @param {Number} y relative to this component
     */
    findNoteAt(x, y) {
        for (const noteComponent of this.noteComponents) {
            if (noteComponent.bounds.contains(x, y)) {
                return noteComponent;
            }
        }

        return null;
    }

    beatToX(beat) {
        return beat * this.config.beatWidth;
    }

    xToBeat(x) {
        return x / this.config.beatWidth;
    }

    noteNumberToY(noteNumber) {
        return this.bounds.height - (noteNumber - this.config.pitchMin + 1) * this.config.noteHeight;
    }

    yToNoteNumber(y) {
        y = this.bounds.height - y;
        return this.config.pitchMin + Math.floor(y / this.config.noteHeight);
    }

    /**
     * 
     * @param {NoteComponent} noteComponent 
     */
    updateNoteBounds(noteComponent) {
        const x = this.beatToX(noteComponent.note.beatStart);
        const y = this.noteNumberToY(noteComponent.note.noteNumber);

        noteComponent.setBounds(new Rectangle(x, y, this.config.beatWidth * noteComponent.note.beatLength, this.config.noteHeight));
    }

    indexOfNote(x, noteNumber) {
        const notes = this.playbackEngine.getSelectedInstrument().notes;
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            if (note.beatStart == x && note.noteNumber == noteNumber) {
                return i;
            }
        }

        return null;
    }

    zoomChanged() {
        this.setBounds(new Rectangle(0, 0, this.config.calculateWidth(), this.config.calculateHeight()));

        for (const note of this.noteComponents) {
            this.updateNoteBounds(this.selectedNoteMain);
        }

        this.repaint();
    }
}