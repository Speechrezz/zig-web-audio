import { AudioParameter } from "../../../audio/audio-parameter.js";
import { Component } from "../component.js";
import { CursorStyle, setCursorStyle } from "../cursor-style.js";
import { MouseAction, MouseActionPolicy } from "../mouse-event.js";
import { Point } from "../point.js";

export class NumberBox extends Component {
    /** @type {null | AudioParameter} */
    audioParameter = null;

    /**
     * Keeps track of current state version. Useful for syncing with audio thread.
     * @type {number}
     */
    stateCount = 0;

    value = 0;
    valueNormalized = 0;
    valueMin = 0;
    valueMax = 1;
    valueDefault = 0;

    /** @type {null | (stateCount: number) => void} */
    parameterListener = null;

    valueToText = (value) => `${Math.round(value)}`;

    /** @type {null | () => void} */
    onChange = null;

    dragCoefficient = 0.5;
    scrollWheelScale = 4e-4;

    mouseAnchor = new Point;
    valueAnchor = 0;
    distanceDragged = 0;

    constructor() {
        super();

        this.lockCursorOnMouseDown = true;
    }

    deinit() {
        if (this.audioParameter !== null) 
            this.audioParameter.removeListener(this.parameterListener);
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bounds = this.getLocalBounds();

        ctx.fillStyle = "oklch(13% 0.028 261.692)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "16px system-ui";
        ctx.fillText(this.valueToText(this.value), bounds.getCenterX(), bounds.getCenterY());

        ctx.strokeStyle = "oklch(55.1% 0.027 264.364)";
        ctx.lineWidth = 1;
        bounds.reduce(0.5, 0.5);

        ctx.beginPath();
        ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 4);
        ctx.stroke();
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
            case MouseAction.scroll:
                return MouseActionPolicy.acceptPropagate;
            default:
                return MouseActionPolicy.ignorePropagate;
        }
    }

    /** @param {MouseEvent} ev */
    mouseEnter(ev) {
        setCursorStyle(CursorStyle.resizeNS);
    }

    /** @param {MouseEvent} ev */
    mouseExit(ev) {
        setCursorStyle(CursorStyle.normal);
    }

    /** @param {MouseEvent} ev */
    mouseDown(ev) {
        this.mouseAnchor.x = ev.x;
        this.mouseAnchor.y = ev.y;

        this.distanceDragged = 0;
        this.valueAnchor = this.value;
    }

    /** @param {MouseEvent} ev */
    // mouseUp(ev) {}

    /** @param {MouseEvent} ev */
    mouseDrag(ev) {
        this.distanceDragged += this.mouseAnchor.y - ev.y;
        const newValue = Math.round(this.valueAnchor + this.distanceDragged * this.dragCoefficient);
        this.setValueInternal(newValue);
    }

    /** @param {MouseScrollEvent} ev */
    mouseScroll(ev) {
        const delta = Math.abs(ev.deltaX) >= Math.abs(ev.deltaY) ? ev.deltaX : -ev.deltaY;

        this.setValueNormalizedInternal(this.valueNormalized + delta * this.scrollWheelScale);
    }

    setValueNormalizedInternal(valueNormalized) {
        this.valueNormalized = valueNormalized;
        const value = valueNormalized * this.valueMax;
        this.setValueInternal(value);
    }

    setValueInternal(value) {
        value = Math.min(Math.max(value, this.valueMin), this.valueMax);
        if (this.value === value) return;

        this.value = value;
        if (this.onChange !== null)
            this.onChange();
        
        this.repaint();

        if (this.audioParameter !== null) {
            this.audioParameter.set(value, false);
            this.stateCount = this.audioParameter.stateCount;
        }
    }
}