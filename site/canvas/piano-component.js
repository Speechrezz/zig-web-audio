import { Component, Rectangle, Point } from "./component.js";
import { Config } from "../app/config.js";

export class PianoComponent extends Component {
    /**
     * @type {Config}
     */
    config;

    /**
     * 
     * @param {Config} config 
     */
    constructor(config) {
        super();
        this.config = config;

        this.config.addZoomListener(() => this.zoomChanged());
        this.zoomChanged();
    }

    /**
     * Override to draw component.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        ctx.fillStyle = "oklch(96.7% 0.003 264.542)";
        ctx.fillRect(0, 0, this.bounds.width, this.bounds.height);

        const blackNoteWidth = Math.round(this.bounds.width * 0.6);
        ctx.fillStyle = "oklch(37.3% 0.034 259.733)";
        ctx.strokeStyle = "oklch(87.2% 0.01 258.338)";
        ctx.lineWidth = 1;
        ctx.textBaseline = "hanging";
        ctx.font = "18px serif";

        ctx.beginPath()
        ctx.moveTo(this.bounds.width - 0.5, 0);
        ctx.lineTo(this.bounds.width - 0.5, this.bounds.height);
        ctx.stroke();

        for (let p = this.config.pitchMin; p <= this.config.pitchMax; p++) {
            const y = (this.config.pitchMax - p) * this.config.noteHeight;

            if (this.config.isBlackKey(p)) {
                const separatorY = y + this.config.noteHeight * 0.5;
                ctx.beginPath()
                ctx.moveTo(blackNoteWidth, separatorY);
                ctx.lineTo(this.bounds.width, separatorY);
                ctx.stroke();

                ctx.fillRect(0, y, blackNoteWidth, this.config.noteHeight);
            } else if (p % 12 === 4 || p % 12 === 11) {
                ctx.beginPath()
                ctx.moveTo(0, y);
                ctx.lineTo(this.bounds.width, y);
                ctx.stroke();
            } else if (p % 12 === 0) {
                ctx.fillText(`C${(p / 12) - 1}`, this.bounds.width - 30, y);
            }
        }
    }

    zoomChanged() {
        this.setBounds(new Rectangle(0, 0, this.bounds.width, this.config.calculateHeight()));
        console.log("piano bounds:", this.bounds);
    }
}