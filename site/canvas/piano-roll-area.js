import { PlaybackEngine, Note } from "../playback-engine.js"
import { Component, Rectangle, Point } from "./component.js"
import { NoteComponent } from "./note-component.js";
import { MouseAction, MouseEvent, MouseActionPolicy } from "./mouse-event.js";
import { Config } from "../app/config.js";

const InteractionType = Object.freeze({
    none: 0, // NOT dragging
    moveNote: 1, // Moving note around
    adjustNoteStart: 2, // Adjust length of note from start
    adjustNoteEnd: 3,   // Adjust length of note from end
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

    interactionType = InteractionType.none;
    interactionAnchor = new Point();
    interactionAnchorNote = new Note(0, 0, 0);
    
    /**
     * @type {NoteComponent | null}
     */
    selectedNote = null;

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
                return MouseActionPolicy.acceptPropagate;

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
                this.adjustNoteBegin(ev, newNote, InteractionType.adjustNoteEnd);
                document.documentElement.style.cursor = "ew-resize";
            }
            else {
                const grabType = this.getGrabType(ev, existingNote);
                this.adjustNoteBegin(ev, existingNote, grabType);
            }
        }
        else if (ev.mouseAction === MouseAction.remove) {
            this.removeNoteAt(ev.x, ev.y);
            document.documentElement.style.cursor = "not-allowed";
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

    /**
     * @param {MouseEvent} ev 
     */
    updateMouseHighlightCursor(ev) {
        const existingNote = this.findNoteAt(ev.x, ev.y);
        if (existingNote === null) {
            document.documentElement.style.cursor = "auto";
        } else {
            switch (this.getGrabType(ev, existingNote)) {
                case InteractionType.moveNote:
                    document.documentElement.style.cursor = "grab";
                    break;

                case InteractionType.adjustNoteStart:
                case InteractionType.adjustNoteEnd:
                    document.documentElement.style.cursor = "ew-resize";
                    break;
            }
        }
    }

    /**
     * @param {MouseEvent} ev 
     * @param {NoteComponent} noteComponent 
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
        this.playbackEngine.instruments[0].notes.push(note);
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

        const playbackEngineNotes = this.playbackEngine.instruments[0].notes;
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
     * @param {Number} grabType
     */
    adjustNoteBegin(ev, noteComponent, grabType) {
        this.interactionType = grabType;
        this.interactionAnchor.x = ev.x - noteComponent.bounds.x;
        this.interactionAnchor.y = ev.y - noteComponent.bounds.y;
        this.interactionAnchorNote = noteComponent.note.clone();
        this.selectedNote = noteComponent;

        if (this.interactionType === InteractionType.moveNote) {
            document.documentElement.style.cursor = "grabbing";
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    adjustNoteStep(ev) {
        if (this.interactionType === InteractionType.none) return;

        const mouseOffsetCoeff = 0.5;
        const offsetX = ev.x - this.interactionAnchor.x + mouseOffsetCoeff * this.config.beatWidth;
        const offsetY = ev.y - this.interactionAnchor.y + mouseOffsetCoeff * this.config.noteHeight;

        const beat = this.xToBeat(offsetX);
        const noteNumber = this.yToNoteNumber(offsetY);

        switch (this.interactionType) {
            case InteractionType.moveNote: {
                this.selectedNote.note.beatStart = Math.floor(beat);
                this.selectedNote.note.noteNumber = noteNumber;
                break;
            }
            case InteractionType.adjustNoteEnd: {
                const beatLength = this.interactionAnchorNote.beatLength + Math.floor(beat - this.selectedNote.note.beatStart);
                this.selectedNote.note.beatLength = Math.max(1, beatLength);
                break;
            }
            case InteractionType.adjustNoteStart: {
                const anchorNote = this.interactionAnchorNote;
                const minBeatStart = anchorNote.beatStart + anchorNote.beatLength - 1;

                const beatStart = Math.min(minBeatStart, Math.floor(beat));
                const beatLength = anchorNote.beatStart - beatStart + anchorNote.beatLength;

                this.selectedNote.note.beatStart = beatStart;
                this.selectedNote.note.beatLength = beatLength;
                break;
            }
        }

        this.updateNoteBounds(this.selectedNote);
        this.repaint();
    }

    /**
     * @param {MouseEvent} ev 
     */
    adjustNoteEnd(ev) {
        if (this.interactionType === InteractionType.none) return;

        this.lastBeatLength = this.selectedNote.note.beatLength;
        document.documentElement.style.cursor = "auto";
        this.interactionType = InteractionType.none;
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
        const notes = this.playbackEngine.instruments[0].notes;
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
            this.updateNoteBounds(this.selectedNote);
        }

        this.repaint();
    }
}