import { Component } from "../../framework/component.js";
import { Rectangle } from "../../framework/rectangle.js";
import { AppContext } from "../../../app/app-context.js"
import { MouseEvent } from "../../framework/mouse-event.js";
import { MidiEvent, MidiEventType } from "../../../audio/midi.js";

export class PianoComponent extends Component {
    /**
     * @type {AppContext}
     */
    context;

    /**
     * @type {{noteNumber: number, velocity: number} | null}
     */
    playingNote = null;

    /**
     * 
     * @param {AppContext} context 
     */
    constructor(context) {
        super();
        this.context = context;

        this.context.config.addZoomListener(() => this.zoomChanged());
        this.zoomChanged();
    }

    /**
     * Override to draw component.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const config = this.context.config;
        const bounds = this.getLocalBounds();

        ctx.fillStyle = "oklch(96.7% 0.003 264.542)";
        ctx.fillRect(0, 0, bounds.width, bounds.height);

        const blackNoteWidth = Math.round(bounds.width * 0.6);
        ctx.fillStyle = "oklch(37.3% 0.034 259.733)";
        ctx.strokeStyle = "oklch(87.2% 0.01 258.338)";
        ctx.lineWidth = 1;
        ctx.textBaseline = "hanging";
        ctx.font = "18px system-ui";

        ctx.beginPath()
        ctx.moveTo(bounds.width - 0.5, 0);
        ctx.lineTo(bounds.width - 0.5, bounds.height);
        ctx.stroke();

        for (let p = config.pitchMin; p <= config.pitchMax; p++) {
            const y = (config.pitchMax - p) * config.noteHeight;

            if (config.isBlackKey(p)) {
                const separatorY = y + config.noteHeight * 0.5;
                ctx.beginPath()
                ctx.moveTo(blackNoteWidth, separatorY);
                ctx.lineTo(bounds.width, separatorY);
                ctx.stroke();

                ctx.fillRect(0, y, blackNoteWidth, config.noteHeight);
            } else if (p % 12 === 4 || p % 12 === 11) {
                ctx.beginPath()
                ctx.moveTo(0, y);
                ctx.lineTo(bounds.width, y);
                ctx.stroke();
            } else if (p % 12 === 0) {
                ctx.fillText(`C${(p / 12) - 1}`, bounds.width - 30, y);
            }
        }

        const instrument = this.context.instruments.getSelected();

        if (instrument !== null) {
            ctx.fillStyle = "oklch(70.7% 0.165 254.624 / 0.3)";
            for (const activeNote of instrument.activeNotes) {
                const y = (config.pitchMax - activeNote.noteNumber) * config.noteHeight;
                ctx.fillRect(0, y, bounds.width, config.noteHeight);
            }
        }

        ctx.beginPath();
        ctx.moveTo(0.5, 0);
        ctx.lineTo(0.5, bounds.getBottom());
        ctx.stroke();
    }

    zoomChanged() {
        this.setBounds(new Rectangle(this.bounds.x, this.bounds.y, this.bounds.width, this.context.config.calculateHeight()));
    }

    /**
     * @param {MouseEvent} ev 
     */
    mouseDown(ev) {
        const noteNumber = this.yToNoteNumber(ev.y);
        const velocity = this.xToNoteVelocity(ev.x);
        this.playingNote = { noteNumber, velocity };

        const midiEvent = MidiEvent.newNote(MidiEventType.NoteOn, this.playingNote.noteNumber, this.playingNote.velocity, 0);
        this.context.playbackEngine.sendMidiMessageFromDevice(midiEvent);

        this.repaint();
    }

    /**
     * @param {MouseEvent} ev 
     */
    mouseDrag(ev) {
        const noteNumber = this.yToNoteNumber(ev.y);
        if (noteNumber !== this.playingNote.noteNumber) {
            const midiOff = MidiEvent.newNote(MidiEventType.NoteOff, this.playingNote.noteNumber, 100, 0);
            this.context.playbackEngine.sendMidiMessageFromDevice(midiOff);
            
            this.playingNote.noteNumber = noteNumber;

            const midiOn = MidiEvent.newNote(MidiEventType.NoteOn, this.playingNote.noteNumber, this.playingNote.velocity, 0);
            this.context.playbackEngine.sendMidiMessageFromDevice(midiOn);

            this.repaint();
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    mouseUp(ev) {
        const midiEvent = MidiEvent.newNote(MidiEventType.NoteOff, this.playingNote.noteNumber, 100, 0);
        this.context.playbackEngine.sendMidiMessageFromDevice(midiEvent);

        this.playingNoteNumber = null;

        this.repaint();
    }

    yToNoteNumber(y) {
        return this.context.config.pitchMax - Math.floor(y / this.context.config.noteHeight);
    }

    xToNoteVelocity(x) {
        return 127 * x / this.bounds.width;
    }
}