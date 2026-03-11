import { Rectangle } from "../../framework/rectangle.js";
import { Point } from "../../framework/point.js";
import { Component } from "../../framework/component.js";
import { CursorStyle, setCursorStyle } from "../../framework/cursor-style.js"
import { AppContext } from "../../../app/app-context.js"
import { PianoRoll } from "./piano-roll.js";
import { PianoComponent } from "./piano-component.js";
import { MouseAction, MouseEvent, MouseActionPolicy, MouseScrollEvent } from "../../framework/mouse-event.js";
import { AppCommand, AppEvent } from "../../../app/app-event.js";
import { AudioEvent } from "../../../audio/audio-constants.js";
import { Timeline } from "./timeline.js";

export class PianoRollSection extends Component {
    /** @type {AppContext} */
    context;

    /** @type {Timeline} */
    timeline;
    
    /** @type {PianoRoll} */
    pianoRoll;

    /** @type {PianoComponent} */
    pianoComponent;

    viewOffset = new Point(0, 0);
    viewOffsetAnchor = new Point(0, 0);
    mouseStart = new Point(0, 0);

    /**
     * @param {AppContext} context 
     */
    constructor(context) {
        super();
        this.context = context;

        this.context.eventRouter.addListener(this);
        this.context.playbackEngine.addListener(AudioEvent.PlayHead, () => this.repaint());

        this.pianoRoll = new PianoRoll(context);
        this.addChildComponent(this.pianoRoll);

        this.pianoComponent = new PianoComponent(context);
        this.addChildComponent(this.pianoComponent);

        this.timeline = new Timeline(context);
        this.addChildComponent(this.timeline);

        this.context.config.addZoomListener(() => this.zoomChanged());
        this.zoomChanged();
    }

    resized() {
        this.updateViewOffset(this.viewOffset.x, this.viewOffset.y);

        const pianoWidth = 96;

        const bounds = this.getLocalBounds();
        this.timeline.setBounds(bounds.removeFromTop(24));

        const pianoBounds = bounds.removeFromLeft(pianoWidth);
        this.pianoRoll.setBounds(bounds.clone());
        this.pianoComponent.setBounds(new Rectangle(pianoBounds.x, pianoBounds.y, pianoBounds.width, this.pianoComponent.bounds.height));

        this.timeline.pianorollBounds = this.pianoRoll.bounds;
    }

    /**
     * Override to change mouse action handling policy
     * @param {MouseAction} mouseAction 
     * @returns MouseHandlePolicy
     */
    canHandleMouseAction(mouseAction) {
        switch (mouseAction) {
            case MouseAction.none:
            case MouseAction.primary:
            case MouseAction.secondary:
                return MouseActionPolicy.acceptPropagate;

            case MouseAction.scroll:
            case MouseAction.translate:
            case MouseAction.magnify:
                return MouseActionPolicy.acceptBlock;
                
            default:
                return MouseActionPolicy.ignorePropagate;
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    mouseDown(ev) {
        if (ev.mouseAction === MouseAction.translate) {
            setCursorStyle(CursorStyle.grabbing);

            this.mouseStart.x = ev.x;
            this.mouseStart.y = ev.y;

            this.viewOffsetAnchor.set(this.viewOffset);
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    mouseUp(ev) {
        if (ev.mouseAction === MouseAction.translate) {
            setCursorStyle(CursorStyle.normal);
        }
    }

    /**
     * @param {MouseEvent} ev 
     */
    mouseDrag(ev) {
        if (ev.mouseAction === MouseAction.translate) {
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

    /**
     * @param {MouseScrollEvent} ev 
     */
    mouseMagnify(ev) {
        const pianoRollMouseX = ev.x - this.pianoRoll.bounds.x;
        
        const prevBeatWidth = this.context.config.beatWidth;
        this.context.config.multiplyZoomLevel(ev.deltaY, 1);
        const newBeatWidth = this.context.config.beatWidth;
        const widthChangeRatio = newBeatWidth / prevBeatWidth;

        let newOffsetX = this.viewOffset.x - pianoRollMouseX;
        newOffsetX *= widthChangeRatio;
        newOffsetX += pianoRollMouseX;
        newOffsetX = Math.round(newOffsetX);
        this.updateViewOffset(newOffsetX, this.viewOffset.y);
    }

    /**
     * @param {number} x 
     * @param {number} y 
     */
    updateViewOffset(x, y) {
        const maxY = this.context.config.calculateHeight() - this.pianoRoll.bounds.height;

        this.viewOffset.x = x;
        this.viewOffset.y = Math.min(0, Math.max(-maxY, y));

        this.timeline.setViewOffset(this.viewOffset);
        this.pianoRoll.setViewOffset(this.viewOffset);
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
                this.playStop();
                break;
        }
    }

    playStop() {
        this.context.playbackEngine.playStop();
    }

    zoomChanged() {
        this.pianoRoll.zoomChanged();
        this.pianoComponent.zoomChanged();
        this.timeline.zoomChanged();
    }
}

