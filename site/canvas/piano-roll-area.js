import { PlaybackEngine, Note } from "../playback-engine.js"
import { Component, Rectangle, Point } from "./component.js"
import { NoteComponent } from "./note-component.js";
import { MouseAction, MouseEvent, MouseActionPolicy } from "./mouse-event.js";

const PITCH_MIN = 21;  // A0
const PITCH_MAX = 108; // C8
const NUM_PITCHES = PITCH_MAX - PITCH_MIN + 1;

const BASE_BEAT_WIDTH = 32;
const BASE_BEAT_HEIGHT = 24;
const MIN_NUM_BEATS = 64;

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
     */
    constructor(playbackEngine) {
        super();
        this.playbackEngine = playbackEngine;

        this.setBounds(new Rectangle(0, 0, MIN_NUM_BEATS * BASE_BEAT_WIDTH, NUM_PITCHES * BASE_BEAT_HEIGHT));
    }

    draw(ctx) {
        // Lanes
        for (let p = PITCH_MIN; p <= PITCH_MAX; p++) {
            const y = (PITCH_MAX - p) * BASE_BEAT_HEIGHT;
            ctx.fillStyle = isBlackKey(p) ? "oklch(96.7% 0.003 264.542)" : "white";
            ctx.fillRect(0, y, this.bounds.width, BASE_BEAT_HEIGHT);
        }

        // Grid
        ctx.lineWidth = 1;
        let gridIndex = 0;
        for (let x = 0; x < this.bounds.width; x += BASE_BEAT_WIDTH) {
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
            const x = playHead.positionInBeats * BASE_BEAT_WIDTH;
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
                this.addNoteAt(ev.x, ev.y);
            }
            else {
                this.adjustNoteBegin(ev, existingNote);
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
    }

    /**
     * @param {Number} x relative to this component
     * @param {Number} y relative to this component
     */
    addNoteAt(x, y) {
        const beat = Math.floor(this.xToBeat(x));
        const noteNumber = this.yToNoteNumber(y);

        const note = new Note(beat, this.lastBeatLength, noteNumber);
        this.addNote(note);
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
     */
    adjustNoteBegin(ev, noteComponent) {
        this.interactionType = this.getGrabType(ev, noteComponent);
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
        const offsetX = ev.x - this.interactionAnchor.x + mouseOffsetCoeff * BASE_BEAT_WIDTH;
        const offsetY = ev.y - this.interactionAnchor.y + mouseOffsetCoeff * BASE_BEAT_HEIGHT;

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
        return beat * BASE_BEAT_WIDTH;
    }

    xToBeat(x) {
        return x / BASE_BEAT_WIDTH;
    }

    noteNumberToY(noteNumber) {
        return this.bounds.height - (noteNumber - PITCH_MIN + 1) * BASE_BEAT_HEIGHT;
    }

    yToNoteNumber(y) {
        y = this.bounds.height - y;
        return PITCH_MIN + Math.floor(y / BASE_BEAT_HEIGHT);
    }

    /**
     * 
     * @param {NoteComponent} noteComponent 
     */
    updateNoteBounds(noteComponent) {
        const x = this.beatToX(noteComponent.note.beatStart);
        const y = this.noteNumberToY(noteComponent.note.noteNumber);
        noteComponent.setBounds(new Rectangle(x, y, BASE_BEAT_WIDTH * noteComponent.note.beatLength, BASE_BEAT_HEIGHT));
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
}

export function isBlackKey(midi) {
    const pc = midi % 12;
    return pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10;
}