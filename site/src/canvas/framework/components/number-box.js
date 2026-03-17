import { AudioParameter } from "../../../audio/audio-parameter.js";
import { Component } from "../component.js";
import { CursorStyle, setCursorStyle } from "../cursor-style.js";
import { MouseAction, MouseActionPolicy, MouseEvent, MouseScrollEvent } from "../mouse-event.js";
import { ParameterProxy } from "../parameter-proxy.js";
import { Point } from "../point.js";

export class NumberBox extends Component {
    /** @type {ParameterProxy} */
    proxy = new ParameterProxy;

    /** @type {null | (() => void)} */
    onChange = null;

    dragCoefficient = 1e-3;
    scrollWheelScale = 4e-4;

    valueAnchor = 0;
    distanceDragged = 0;

    constructor() {
        super();

        this.lockCursorOnMouseDown = true;
        this.proxy.onValueChange = () => this.onProxyValueChange();
    }

    deinit() {
        this.proxy.deinit();
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bounds = this.getLocalBounds();

        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 4);
        ctx.fill();

        ctx.fillStyle = "oklch(13% 0.028 261.692)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "16px system-ui";
        ctx.fillText(this.proxy.textFromValue(this.proxy.value), bounds.getCenterX(), bounds.getCenterY());

        ctx.strokeStyle = "oklch(70.7% 0.022 261.325)";
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
        this.distanceDragged = 0;
        this.valueAnchor = this.proxy.valueNormalized;
    }

    /** @param {MouseEvent} ev */
    // mouseUp(ev) {}

    /** @param {MouseEvent} ev */
    mouseDrag(ev) {
        this.distanceDragged += ev.deltaY;
        const newValue = this.valueAnchor - this.distanceDragged * this.dragCoefficient;
        this.setValueNormalizedInternal(newValue);
    }

    /** @param {MouseScrollEvent} ev */
    mouseScroll(ev) {
        const delta = Math.abs(ev.deltaX) >= Math.abs(ev.deltaY) ? ev.deltaX : -ev.deltaY;

        this.setValueNormalizedInternal(this.proxy.valueNormalized + delta * this.scrollWheelScale);
    }

    /**
     * @param {number} valueNormalized 
     */
    setValueNormalizedInternal(valueNormalized) {
        this.proxy.setNormalizedValue(valueNormalized);
    }

    /**
     * @param {number} value 
     */
    setValueInternal(value) {
        this.proxy.setValue(value);
    }

    onProxyValueChange() {
        this.repaint();

        if (this.onChange)
            this.onChange();
    }

    /**
     * @param {ParameterProxy} proxy 
     */
    setProxy(proxy) {
        this.proxy.deinit();
        this.proxy = proxy;
        this.proxy.onValueChange = () => this.onProxyValueChange();
    }

    /**
     * @param {AudioParameter} audioParameter 
     */
    attach(audioParameter) {
        this.setProxy(audioParameter.createProxy());
    }
}