import { AppContext } from "../../../app/app-context.js";
import { Component } from "../../framework/component.js";
import { CursorStyle, setCursorStyle } from "../../framework/cursor-style.js";
import { MouseEvent } from "../../framework/mouse-event.js";
import { Point } from "../../framework/point.js";
import { Rectangle } from "../../framework/rectangle.js";

export class Timeline extends Component {
    /** @type {AppContext} */
    context;

    /** @type {Point} */
    viewOffset = new Point;

    /** @type {Rectangle} */
    pianorollBounds = new Rectangle;

    /** @type {boolean} */
    allowDragFlag = true;

    /**
     * @param {AppContext} context 
     */
    constructor(context) {
        super();
        this.context = context;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const config = this.context.config;
        const bounds = this.getLocalBounds();

        const fullOffsetX = this.viewOffset.x + this.pianorollBounds.x;

        ctx.fillStyle = "oklch(92.8% 0.006 264.531)";
        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

        const beatOffset = -(fullOffsetX) / config.beatWidth;
        const numBeats = bounds.width / config.beatWidth;
        const xOffset = config.beatWidth * (beatOffset - Math.floor(beatOffset));
        ctx.fillStyle = "oklch(37.3% 0.034 259.733)";
        ctx.lineWidth = 1;
        ctx.textBaseline = "bottom";
        ctx.font = "16px system-ui";
        for (let b = 0; b < numBeats; b += 1) {
            const beat = b + Math.floor(beatOffset);
            const isWhole = beat % 4 === 0;
            ctx.strokeStyle = isWhole ? "oklch(70.7% 0.165 254.624)" : "oklch(87.2% 0.01 258.338)";
            const x = b * config.beatWidth - xOffset;

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.bounds.height);
            ctx.stroke();

            if (isWhole) {
                ctx.fillText(`${beat / 4}`, x + 4, bounds.getBottom());
            }
        }

        // PlayHead
        const triangleRadius = 8;
        const playHead = this.context.playbackEngine.playHead;
        const playHeadX = playHead.positionInBeats * config.beatWidth + fullOffsetX;
        ctx.strokeStyle = "oklch(75% 0.183 55.934)";
        ctx.fillStyle = "oklch(83.7% 0.128 66.29)";
        ctx.beginPath();
        ctx.moveTo(playHeadX - triangleRadius, bounds.y);
        ctx.lineTo(playHeadX + triangleRadius, bounds.y);
        ctx.lineTo(playHeadX, bounds.getCenterY());
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "oklch(87.2% 0.01 258.338)";
        ctx.beginPath();
        ctx.moveTo(bounds.x, bounds.getBottom() - 0.5);
        ctx.lineTo(bounds.getRight(), bounds.getBottom() - 0.5);
        ctx.stroke();
    }

    /**
     * @param {Point} offset 
     */
    setViewOffset(offset) {
        this.viewOffset.set(offset);
        this.repaint();
    }

    /** @param {MouseEvent} ev */
    mouseEnter(ev) {
        setCursorStyle(CursorStyle.pointer);
    }

    /** @param {MouseEvent} ev */
    mouseExit(ev) {
        setCursorStyle(CursorStyle.normal);
    }

    /** @param {MouseEvent} ev */
    mouseDown(ev) {
        this.mouseSetPlayHeadPosition(ev);

        this.allowDragFlag = !this.context.playbackEngine.playHead.isPlaying;
    }

    /** @param {MouseEvent} ev */
    mouseDrag(ev) {
        if (!this.allowDragFlag) return

        this.mouseSetPlayHeadPosition(ev);
    }

    /** @param {MouseEvent} ev */
    mouseSetPlayHeadPosition(ev) {
        const fullOffsetX = this.viewOffset.x + this.pianorollBounds.x;
        const beat = (ev.x - fullOffsetX) / this.context.config.beatWidth;
        this.context.playbackEngine.setPlayHeadPosition(beat);
    }
}