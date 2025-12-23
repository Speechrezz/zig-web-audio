import { PlaybackEngine, Note } from "../playback-engine.js"
import { Component, Rectangle, Point } from "./component.js"
import { TopLevelComponent } from "./top-level-component.js";
import { PianoRollArea } from "./piano-roll-area.js";
import { MouseAction, MouseEvent, MouseActionPolicy } from "./mouse-event.js";

export class PianoRoll extends TopLevelComponent {
    /**
     * @type {PlaybackEngine}
     */
    playbackEngine;

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
        super(canvasElement);
        this.playbackEngine = playbackEngine;

        this.pianoRollArea = new PianoRollArea(playbackEngine);
        this.addChildComponent(this.pianoRollArea);

        this.repaint();
    }

    draw(ctx) {
        ctx.clearRect(0, 0, this.bounds.width, this.bounds.height);
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

            case MouseAction.move:
                return MouseActionPolicy.acceptBlock;
                
            default:
                return MouseActionPolicy.ignorePropogate;
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    mouseDown(ev) {
        if (ev.mouseAction === MouseAction.move) {
            document.documentElement.style.cursor = "grabbing";

            this.mouseStart.x = ev.x;
            this.mouseStart.y = ev.y;

            this.viewOffsetAnchor.x = this.pianoRollArea.translation.x;
            this.viewOffsetAnchor.y = this.pianoRollArea.translation.y;
        }
    }

    mouseUp(ev) {
        if (ev.mouseAction === MouseAction.move) {
            document.documentElement.style.cursor = "auto";
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    mouseDrag(ev) {
        if (ev.mouseAction === MouseAction.move) {
            const offsetX = ev.x - this.mouseStart.x;
            const offsetY = ev.y - this.mouseStart.y;

            const maxX = this.pianoRollArea.bounds.width  - this.bounds.width;
            const maxY = this.pianoRollArea.bounds.height - this.bounds.height;

            this.viewOffset.x = Math.min(0, Math.max(-maxX, this.viewOffsetAnchor.x + offsetX));
            this.viewOffset.y = Math.min(0, Math.max(-maxY, this.viewOffsetAnchor.y + offsetY));

            this.pianoRollArea.translation.set(this.viewOffset);

            this.repaint();
        }
    }
}

