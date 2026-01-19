import { Rectangle, Point } from "./component.js"
import { ComponentContext } from "./component-context.js";
import { TopLevelComponent } from "./top-level-component.js";
import { PianoRollView } from "./piano-roll-view.js";
import { PianoComponent } from "./piano-component.js";
import { MouseAction, MouseEvent, MouseActionPolicy, MouseScrollEvent } from "./mouse-event.js";
import { AppCommand, AppEvent } from "../app/app-event.js";
import { AudioEvent } from "../audio/audio-constants.js";

export class PianoRoll extends TopLevelComponent {
    /**
     * @type {ComponentContext}
     */
    context;
    
    /**
     * @type {PianoRollView}
     */
    pianoRollView;

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
     * @param {ComponentContext} context 
     */
    constructor(canvasElement, context) {
        super(canvasElement);
        this.context = context;

        this.context.eventRouter.addListener(this);
        this.context.playbackEngine.addListener(AudioEvent.PlayHead, () => this.repaint());

        this.pianoRollView = new PianoRollView(context);
        this.addChildComponent(this.pianoRollView);

        this.pianoComponent = new PianoComponent(context);
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
            case MouseAction.scroll:
                return MouseActionPolicy.acceptBlock;
                
            default:
                return MouseActionPolicy.ignorePropagate;
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

    /**
     * @param {MouseScrollEvent} ev 
     */
    mouseScroll(ev) {
        this.updateViewOffset(this.viewOffset.x - ev.deltaX, this.viewOffset.y - ev.deltaY);
    }

    updateViewOffset(x, y) {
        const maxX = this.pianoRollView.pianoRollArea.bounds.width  - this.pianoRollView.bounds.width;
        const maxY = this.pianoRollView.pianoRollArea.bounds.height - this.pianoRollView.bounds.height;

        this.viewOffset.x = Math.min(0, Math.max(-maxX, x));
        this.viewOffset.y = Math.min(0, Math.max(-maxY, y));

        this.pianoRollView.pianoRollArea.translation.set(this.viewOffset);
        this.pianoComponent.translation.y = this.viewOffset.y;
        this.repaint();
    }

    /**
     * Specify which events this listener can handle.
     * @param {AppEvent} appEvent 
     * @returns {number | null} Must return a `number` priority (higher = more priority) or `null` if can't handle. 
     */
    canHandleEvent(appEvent) {
        switch (appEvent.command) {
            case AppCommand.playPause:
                return 0;
        }

        return null;
    }

    /**
     * Handle the `AppEvent`.
     * @param {AppEvent} appEvent 
     */
    handleEvent(appEvent) {
        switch (appEvent.command) {
            case AppCommand.playPause:
                this.playPause();
                break;
        }
    }

    playPause() {
        const playbackEngine = this.context.playbackEngine;
        if (playbackEngine.playHead.isPlaying) {
            playbackEngine.stop();
        }
        else {
            playbackEngine.play();
        }
    }
}

