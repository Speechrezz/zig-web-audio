import { PlaybackEngine, Note } from "../playback-engine.js"
import { Component, Rectangle, Point } from "./component.js"
import { PianoRollArea } from "./piano-roll-area.js";
import { MouseEvent } from "./mouse-event.js";

const ClickMode = Object.freeze({
    none: 0,
    draw: 1,
    drag: 2,
    remove: 3,
});

export class PianoRoll extends Component {
    /**
     * @type {HTMLCanvasElement}
     */
    canvas;

    /**
     * @type {PlaybackEngine}
     */
    playbackEngine;

    clickMode = ClickMode.none;
    mouseDownButton = 0;

    beatSnapNum = 1;
    beatSnapDen = 1;

    viewOffset = new Point(0, 0);
    viewOffsetAnchor = new Point(0, 0);
    mouseStart = new Point(0, 0);

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
        this.canvas.oncontextmenu = (ev) => ev.preventDefault();

        this.pianoRollArea = new PianoRollArea(playbackEngine);
        this.addChildComponent(this.pianoRollArea);

        this.setBounds(new Rectangle(0, 0, this.canvas.width, this.canvas.height));
        console.log("viewOffset:", this.viewOffset);

        this.repaint();
    }

    draw(ctx) {
        ctx.clearRect(0, 0, this.bounds.width, this.bounds.height);
    }

    /**
     * @param {PointerEvent} ev 
     */
    mouseDown(ev) {
        if (this.clickMode !== ClickMode.none) return;
        this.canvas.setPointerCapture(ev.pointerId);

        this.clickMode = ev.button + 1;
        this.mouseDownButton = ev.button;

        if (this.clickMode === ClickMode.draw) {
            const componentWithCoords = this.getComponentAtWithCoords(ev.offsetX, ev.offsetY);
            if (componentWithCoords === null) return;

            const mouseEvent = new MouseEvent(componentWithCoords.x, componentWithCoords.y, ev.offsetX, ev.offsetY);
            componentWithCoords.component.mouseDown(mouseEvent);
        }
        else if (this.clickMode === ClickMode.drag) {
            this.mouseStart.x = ev.offsetX;
            this.mouseStart.y = ev.offsetY;

            this.viewOffsetAnchor.x = this.pianoRollArea.translation.x;
            this.viewOffsetAnchor.y = this.pianoRollArea.translation.y;
        }
    }

    /**
     * @param {PointerEvent} ev 
     */
    mouseUp(ev) {
        if (ev.button !== this.mouseDownButton) return;

        this.canvas.releasePointerCapture(ev.pointerId);
        this.clickMode = ClickMode.none;
    }

    /**
     * @param {PointerEvent} ev 
     */
    mouseMoveInternal(ev) {
        if (this.clickMode === ClickMode.drag) {
            this.mouseDrag(ev);
        }
    }

    /**
     * @param {PointerEvent} ev 
     */
    mouseDrag(ev) {
        const offsetX = ev.offsetX - this.mouseStart.x;
        const offsetY = ev.offsetY - this.mouseStart.y;

        const maxX = this.pianoRollArea.bounds.width  - this.bounds.width;
        const maxY = this.pianoRollArea.bounds.height - this.bounds.height;

        this.viewOffset.x = Math.min(0, Math.max(-maxX, this.viewOffsetAnchor.x + offsetX));
        this.viewOffset.y = Math.min(0, Math.max(-maxY, this.viewOffsetAnchor.y + offsetY));

        this.pianoRollArea.translation.set(this.viewOffset);

        this.repaint();
    }
}

