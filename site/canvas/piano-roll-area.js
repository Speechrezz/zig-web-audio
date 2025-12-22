import { PlaybackEngine, Note } from "../playback-engine.js"
import { Component, Rectangle, Point } from "./component.js"

const PITCH_MIN = 21;  // A0
const PITCH_MAX = 108; // C8
const NUM_PITCHES = PITCH_MAX - PITCH_MIN + 1;

const BASE_BEAT_WIDTH = 32;
const BASE_BEAT_HEIGHT = 24;
const MIN_NUM_BEATS = 64;

export class PianoRollArea extends Component {
    /**
     * @type {PlaybackEngine}
     */
    playbackEngine;

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

        // Notes
        for (const note of this.playbackEngine.instruments[0].notes) {
            const x = this.beatToX(note.beatStart);
            const y = this.noteNumberToY(note.noteNumber);
            ctx.fillStyle = "oklch(70.7% 0.165 254.624)";
            ctx.roundRect(x, y, BASE_BEAT_WIDTH, BASE_BEAT_HEIGHT, 4);
            ctx.fill();
        }
    }

    mouseDown(ev) {
        const beat = Math.floor(this.xToBeat(ev.x));
        const noteNumber = this.yToNoteNumber(ev.y);
        console.log("beat:", beat, ", noteNumber:", noteNumber);

        const notes = this.playbackEngine.instruments[0].notes;

        const noteIndex = this.indexOfNote(beat, noteNumber);
        if (noteIndex === null) {
            notes.push(new Note(beat, 1, noteNumber));
        } else {
            notes.splice(noteIndex, 1);
        }

        this.repaint();
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