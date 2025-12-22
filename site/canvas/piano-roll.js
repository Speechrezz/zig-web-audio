import { PlaybackEngine, Note } from "../playback-engine.js"
import { Component, Rectangle } from "./component.js"

const PITCH_MIN = 21;  // A0
const PITCH_MAX = 108; // C8
const NUM_PITCHES = PITCH_MAX - PITCH_MIN + 1;

const BASE_BEAT_WIDTH = 80;
const BASE_BEAT_HEIGHT = 32;
const MIN_NUM_BEATS = 32;

class PianoRollArea extends Component {
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
    }
}

export class PianoRoll extends Component {
    /**
     * @type {HTMLCanvasElement}
     */
    canvas;

    /**
     * @type {PlaybackEngine}
     */
    playbackEngine;

    mouseDownFlag = false;

    /**
     * 
     * @param {HTMLCanvasElement} canvasElement 
     * @param {PlaybackEngine} playbackEngine 
     */
    constructor(canvasElement, playbackEngine) {
        super();
        this.canvas = canvasElement;
        this.playbackEngine = playbackEngine;
        this.getGraphicsContext = () => this.canvas.getContext("2d");

        this.canvas.onmousedown = (ev) => this.mouseDown(ev);
        this.canvas.onmouseup   = (ev) => this.mouseUp(ev);
        this.canvas.onmousemove = (ev) => this.mouseMoveInternal(ev);

        this.pianoRollArea = new PianoRollArea(playbackEngine);
        this.addChildComponent(this.pianoRollArea);

        this.setBounds(new Rectangle(0, 0, this.canvas.width, this.canvas.height));

        this.repaint();
    }

    draw(ctx) {
        ctx.clearRect(0, 0, this.bounds.width, this.bounds.height);
    }

    /**
     * @param {PointerEvent} ev 
     */
    mouseDown(ev) {
        this.mouseDownFlag = true;
        this.dragStartX = ev.offsetX;
        this.dragStartY = ev.offsetY;

        this.prevTranslationX = this.pianoRollArea.translation.x;
        this.prevTranslationY = this.pianoRollArea.translation.y;
    }

    /**
     * @param {PointerEvent} ev 
     */
    mouseUp(ev) {
        console.log("mouseup")
        this.mouseDownFlag = false;
    }

    /**
     * @param {PointerEvent} ev 
     */
    mouseMoveInternal(ev) {
        if (this.mouseDownFlag) {
            this.mouseDrag(ev);
        }
    }

    /**
     * @param {PointerEvent} ev 
     */
    mouseDrag(ev) {
        const offsetX = ev.offsetX - this.dragStartX;
        const offsetY = ev.offsetY - this.dragStartY;

        const maxX = this.pianoRollArea.bounds.width  - this.bounds.width;
        const maxY = this.pianoRollArea.bounds.height - this.bounds.height;

        this.pianoRollArea.translation.x = Math.min(0, Math.max(-maxX, this.prevTranslationX + offsetX));
        this.pianoRollArea.translation.y = Math.min(0, Math.max(-maxY, this.prevTranslationY + offsetY));

        this.repaint();
    }
}

function isBlackKey(midi) {
    const pc = midi % 12;
    return pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10;
}