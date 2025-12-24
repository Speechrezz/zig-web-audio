import { PlaybackEngine } from "../playback-engine.js"
import { Component, Rectangle, Point } from "./component.js"
import { TopLevelComponent } from "./top-level-component.js";
import { PianoRollView } from "./piano-roll-view.js";
import { PianoComponent } from "./piano-component.js";
import { MouseAction, MouseEvent, MouseActionPolicy } from "./mouse-event.js";
import { Config } from "../app/config.js";

export class PianoRoll extends TopLevelComponent {
    /**
     * @type {PlaybackEngine}
     */
    playbackEngine;

    /**
     * @type {PianoRollView}
     */
    pianoRollView;

    /**
     * @type {Config}
     */
    config;

    /**
     * @type {PianoComponent}
     */
    pianoComponent;

    beatSnapNum = 1;
    beatSnapDen = 1;

    viewOffset = new Point(0, 0);
    viewOffsetAnchor = new Point(0, 0);
    mouseStart = new Point(0, 0);

    /**
     * 
     * @param {HTMLCanvasElement} canvasElement 
     * @param {PlaybackEngine} playbackEngine 
     * @param {Config} config 
     */
    constructor(canvasElement, playbackEngine, config) {
        super(canvasElement);
        this.playbackEngine = playbackEngine;
        this.config = config;

        this.pianoRollView = new PianoRollView(playbackEngine, config);
        this.addChildComponent(this.pianoRollView);

        this.pianoComponent = new PianoComponent(config);
        this.addChildComponent(this.pianoComponent);

        this.canvasResized();
        this.repaint();
    }

    draw(ctx) {
        ctx.clearRect(0, 0, this.bounds.width, this.bounds.height);
    }

    resize() {
        this.updateViewOffset(this.viewOffset.x, this.viewOffset.y);

        const pianoWidth = 96;

        const bounds = this.getLocalBounds();
        const pianoBounds = bounds.removeFromLeft(pianoWidth);
        this.pianoRollView.setBounds(bounds.clone());
        this.pianoComponent.setBounds(new Rectangle(pianoBounds.x, pianoBounds.y, pianoBounds.width, this.pianoComponent.bounds.height));
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

            this.viewOffsetAnchor.set(this.pianoRollView.pianoRollArea.translation);
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

            this.updateViewOffset(this.viewOffsetAnchor.x + offsetX, this.viewOffsetAnchor.y + offsetY);
        }
    }

    updateViewOffset(x, y) {
        const maxX = this.pianoRollView.pianoRollArea.bounds.width  - this.bounds.width;
        const maxY = this.pianoRollView.pianoRollArea.bounds.height - this.bounds.height;

        this.viewOffset.x = Math.min(0, Math.max(-maxX, x));
        this.viewOffset.y = Math.min(0, Math.max(-maxY, y));

        this.pianoRollView.pianoRollArea.translation.set(this.viewOffset);
        this.pianoComponent.translation.y = this.viewOffset.y;
        this.repaint();
    }
}

