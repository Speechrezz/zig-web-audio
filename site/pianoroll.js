import { PlaybackEngine, Note } from "./playback-engine.js"

const NUM_BEATS = 32;

export class PianoRoll {
    /**
     * @type {HTMLCanvasElement}
     */
    canvas;

    /**
     * @type {PlaybackEngine}
     */
    playbackEngine;

    rows = 24;
    cols = NUM_BEATS;
    pitchMin = 48;

    /**
     * 
     * @param {HTMLCanvasElement} canvasElement 
     * @param {PlaybackEngine} playbackEngine 
     */
    constructor(canvasElement, playbackEngine) {
        this.canvas = canvasElement;
        this.playbackEngine = playbackEngine;
        this.canvas.onclick = (ev) => {
            this.onClick(ev);
        }

        this.draw();
    }

    draw() {
        const canvas = this.canvas;
        let ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const rows = this.rows;
        const cols = this.cols;

        const pitchMin = this.pitchMin;
        const pitchMax = pitchMin + rows - 1;

        // Lanes
        const noteHeight = canvas.height / rows;
        for (let p = pitchMin; p <= pitchMax; p++) {
            const y = (pitchMax - p) * noteHeight;
            ctx.fillStyle = isBlackKey(p) ? "oklch(96.7% 0.003 264.542)" : "white";
            ctx.fillRect(0, y, canvas.width, noteHeight);
        }

        // Grid
        ctx.strokeStyle = "oklch(80.9% 0.105 251.813)";
        ctx.lineWidth = 1;
        const noteWidth = canvas.width / cols;
        let gridIndex = 0;
        for (let x = 0; x < canvas.width; x += noteWidth) {
            ctx.strokeStyle = gridIndex % 4 == 0 ? "oklch(70.7% 0.165 254.624)" : "oklch(88.2% 0.059 254.128)";

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();

            gridIndex++;
        }

        // Playhead
        const playHead = this.playbackEngine.playHead;
        if (playHead.isPlaying) {
            const x = playHead.positionInBeats * noteWidth;
            ctx.fillStyle = "oklch(70.7% 0.165 254.624 / 0.5)";
            ctx.fillRect(x, 0, 8, canvas.height);
        }

        // Notes
        for (const note of this.playbackEngine.instruments[0].notes) {
            const x = note.beatStart * noteWidth;
            const y = canvas.height - (note.noteNumber - pitchMin + 1) * noteHeight;
            ctx.fillStyle = "oklch(70.7% 0.165 254.624)";
            ctx.roundRect(x, y, noteWidth, noteHeight, 4);
            ctx.fill();
        }
    }

    /**
     * 
     * @param {PointerEvent} ev 
     */
    onClick(ev) {
        const notes = this.playbackEngine.instruments[0].notes;
        const x = this.xToGridIndex(ev.offsetX);
        const noteNumber = this.yToNoteNumber(ev.offsetY);

        const noteIndex = this.indexOfNote(x, noteNumber);
        if (noteIndex === null) {
            notes.push(new Note(x, 1, noteNumber));
        } else {
            notes.splice(noteIndex, 1);
        }

        this.draw();
    }

    /**
     * 
     * @param {number} y 
     * @returns {number} Midi note number
     */
    yToNoteNumber(y) {
        y = this.canvas.height - y;
        const rows = this.rows;

        const pitchMin = this.pitchMin;
        const noteHeight = this.canvas.height / rows;

        return pitchMin + Math.floor(y / noteHeight);
    }

    /**
     * 
     * @param {number} x 
     * @returns {number} Grid index
     */
    xToGridIndex(x) {
        const cols = this.cols;
        const noteWidth = this.canvas.width / cols;

        return Math.floor(x / noteWidth);
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

function isBlackKey(midi) {
    const pc = midi % 12;
    return pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10;
}