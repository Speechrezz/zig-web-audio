import { Component } from "../component.js";
import { MouseAction, MouseActionPolicy, MouseEvent, MouseScrollEvent } from "../mouse-event.js";
import { CursorStyle, setCursorStyle } from "../cursor-style.js"
import { AudioParameter } from "../../../audio/audio-parameter.js";
import { Point } from "../point.js";
import { Rectangle } from "../rectangle.js";

/**
 * @readonly
 * @enum {number}
 */
export const SliderStyle = Object.freeze({
    horizontal: 0,
    vertical: 1,
});

export class Slider extends Component {
    /** @type {SliderStyle} */
    sliderStyle = SliderStyle.horizontal;

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
    valueMax = 0;
    valueDefault = 0;

    /** @type {null | (stateCount: number) => void} */
    parameterListener = null;

    /** @type {Point} */
    mouseAnchor = new Point;
    valueNormalizedAnchor = 0;
    scrollWheelScale = 1e-3;

    /** @type {Rectangle} */
    adjustableBounds = new Rectangle;

    constructor() {
        super();
    }

    deinit() {
        if (this.audioParameter !== null) 
            this.audioParameter.removeListener(this.parameterListener);
    }

    setSliderStyle(sliderStyle) {
        if (this.sliderStyle !== sliderStyle) {
            this.sliderStyle = sliderStyle;
            this.repaint();
        }
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bounds = this.getLocalBounds();

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(this.adjustableBounds.x, this.adjustableBounds.y, 
            this.adjustableBounds.width, this.adjustableBounds.height, 4)
        ctx.clip();

        // Fill slider

        ctx.fillStyle = "oklch(88.2% 0.059 254.128)";
        ctx.strokeStyle = "oklch(70.7% 0.165 254.624)";
        ctx.lineWidth = this.isMouseOverOrDragging() ? 2 : 1;

        const filledBounds = this.adjustableBounds.clone();
        if (this.sliderStyle === SliderStyle.horizontal) {
            filledBounds.width = this.valueNormalized * filledBounds.width;

            ctx.fillRect(filledBounds.x, filledBounds.y, filledBounds.width, filledBounds.height);

            ctx.beginPath();
            ctx.moveTo(filledBounds.getRight(), filledBounds.y);
            ctx.lineTo(filledBounds.getRight(), filledBounds.getBottom());
            ctx.stroke();
        }
        else {
            filledBounds.setTop(this.valueNormalized * filledBounds.height);
            ctx.fillRect(filledBounds.x, filledBounds.y, filledBounds.width, filledBounds.height);

            ctx.beginPath();
            ctx.moveTo(filledBounds.x, filledBounds.y);
            ctx.lineTo(filledBounds.getRight(), filledBounds.y);
            ctx.stroke();
        }

        // Draw outline

        ctx.restore();
        bounds.reduce(0.5, 0.5);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "oklch(55.1% 0.027 264.364)";

        ctx.beginPath();
        ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 4);
        ctx.stroke();
    }

    resized() {
        this.adjustableBounds = this.getLocalBounds().reduced(1, 1);
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
    mouseDown(ev) {
        this.mouseAnchor.x = ev.x;
        this.mouseAnchor.y = ev.y;
        this.valueNormalizedAnchor = this.valueNormalized;
    }

    /** @param {MouseEvent} ev */
    mouseDrag(ev) {
        let proportion;

        if (this.sliderStyle === SliderStyle.horizontal) {
            const diffX = ev.x - this.mouseAnchor.x;
            proportion = diffX / this.adjustableBounds.width;
        } else {
            const diffY = this.mouseAnchor.y - ev.y;
            proportion = diffY / this.adjustableBounds.height;
        }

        this.setValueInternal(this.valueNormalizedAnchor + proportion);
    }

    /** @param {MouseEvent} ev */
    mouseEnter(ev) {
        setCursorStyle(this.sliderStyle === SliderStyle.horizontal ? CursorStyle.resizeEW : CursorStyle.resizeNS);
        this.repaint();
    }

    /** @param {MouseEvent} ev */
    mouseExit(ev) {
        setCursorStyle(CursorStyle.normal);
        this.repaint();
    }

    /** @param {MouseScrollEvent} ev */
    mouseScroll(ev) {
        const delta = Math.abs(ev.deltaX) >= Math.abs(ev.deltaY) ? ev.deltaX : -ev.deltaY;

        this.setValueInternal(this.valueNormalized + delta * this.scrollWheelScale);
    }

    setValueInternal(valueNormalized) {
        valueNormalized = Math.min(Math.max(valueNormalized), 1);
        if (this.valueNormalized === valueNormalized) return;

        this.valueNormalized = valueNormalized;
        this.repaint();

        this.audioParameter.set(valueNormalized, true);
        this.stateCount = this.audioParameter.stateCount;
    }

    /**
     * @param {AudioParameter} audioParameter 
     */
    attach(audioParameter) {
        this.audioParameter = audioParameter;
        const state = this.audioParameter.state;

        this.value = state.value;
        this.valueNormalized = state.value_normalized;
        this.valueMin = state.value_min;
        this.valueMax = state.value_max;
        this.valueDefault = state.value_default;
        this.stateCount = this.audioParameter.stateCount;

        this.parameterListener = (stateCount) => this.updateValueFromParameter(stateCount);
        this.audioParameter.addListener(this.parameterListener);
    }

    /**
     * @param {number} stateCount 
     */
    updateValueFromParameter(stateCount) {
        const state = this.audioParameter.state;
        this.value = state.value;

        if (this.stateCount < stateCount) {
            this.stateCount = stateCount;
            this.valueNormalized = state.value_normalized;
            this.repaint();
        }
    }
}