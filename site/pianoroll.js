import { getContextTime, sendMidiMessageSeconds, packMidiEvent, MidiEventType } from "./midi.js"

class Note {
    /**
     * 
     * @param {number} x 
     * @param {number} noteNumber 
     */
    constructor(x, noteNumber) {
        this.x = x;
        this.noteNumber = noteNumber;
    }
}

const NUM_BEATS = 32;

export class PianoRoll {
    /**
     * @type {HTMLCanvasElement}
     */
    canvas;

    bpm = 120;
    rows = 24;
    cols = NUM_BEATS;
    pitchMin = 48;

    notes = [];

    isPlaying = false;

    /**
     * 
     * @param {HTMLCanvasElement} canvasElement 
     * @param {function} getBpm 
     */
    constructor(canvasElement, getBpm) {
        this.canvas = canvasElement;
        this.getBpm = getBpm;
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
        if (this.isPlaying) {
            const x = this.currentBeat * noteWidth;
            ctx.fillStyle = "oklch(70.7% 0.165 254.624 / 0.15)";
            ctx.fillRect(x, 0, noteWidth, canvas.height);
        }

        // Notes
        for (const note of this.notes) {
            const x = note.x * noteWidth;
            const y = canvas.height - (note.noteNumber - pitchMin + 1) * noteHeight;
            ctx.fillStyle = "oklch(70.7% 0.165 254.624)";
            ctx.roundRect(x, y, noteWidth, noteHeight, 4);
            ctx.fill();
        }
    }

    play() {
        this.currentBeat = 0;
        this.timePassedSec = 0;
        this.contextTimeStart = getContextTime();
        this.isPlaying = true;

        this.tickIntervalSec = 60 / this.bpm;
        console.log("Play!", this.contextTimeStart, this.tickIntervalSec);

        this.timer = setInterval(() => this.tick(), this.tickIntervalSec * 1e3);
        this.tick();
    }

    stop() {
        console.log("Stop.");
        this.isPlaying = false;
        clearInterval(this.timer);
        this.draw();
    }

    tick() {
        const newBpm = this.getBpm();
        if (Number.isFinite(newBpm) && newBpm !== this.bpm) {
            this.bpm = Math.min(Math.max(newBpm, 60), 600);
            this.tickIntervalSec = 60 / this.bpm;
            clearInterval(this.timer);
            this.timer = setInterval(() => this.tick(), this.tickIntervalSec * 1e3);
        }

        const notesAtBeat = this.getNotesAtBeat(this.currentBeat);

        for (const note of notesAtBeat) {
            this.playNote(note, this.timePassedSec);
        }

        this.draw();
        
        this.currentBeat = (this.currentBeat + 1) % NUM_BEATS;
        this.timePassedSec += this.tickIntervalSec;
    }

    playNote(note, timePassedSec) {
        const noteOnEvent  = packMidiEvent(MidiEventType.NoteOn,  note.noteNumber, 100, 0);
        const noteOffEvent = packMidiEvent(MidiEventType.NoteOff, note.noteNumber, 100, 0);

        const lookAheadSec = 0.1;
        const noteOnTime = this.contextTimeStart + timePassedSec + lookAheadSec;

        sendMidiMessageSeconds(noteOnEvent,  noteOnTime);
        sendMidiMessageSeconds(noteOffEvent, noteOnTime + this.tickIntervalSec);
    }

    /**
     * 
     * @param {PointerEvent} ev 
     */
    onClick(ev) {
        const x = this.xToGridIndex(ev.offsetX);
        const noteNumber = this.yToNoteNumber(ev.offsetY);

        const noteIndex = this.indexOfNote(x, noteNumber);
        if (noteIndex === null) {
            this.notes.push(new Note(x, noteNumber));
        } else {
            this.notes.splice(noteIndex, 1);
        }

        this.draw();
    }

    getNotesAtBeat(beat) {
        beat = Math.floor(beat);
        let notesAtBeat = [];

        for (let i = 0; i < this.notes.length; i++) {
            const note = this.notes[i];
            if (note.x == beat) {
                notesAtBeat.push(note);
            }
        }

        return notesAtBeat;
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
        for (let i = 0; i < this.notes.length; i++) {
            const note = this.notes[i];
            if (note.x == x && note.noteNumber == noteNumber) {
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