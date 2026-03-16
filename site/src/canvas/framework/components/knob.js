import { Component } from "../component.js";
import { MouseAction, MouseActionPolicy, MouseEvent, MouseScrollEvent } from "../mouse-event.js";
import { CursorStyle, setCursorStyle } from "../cursor-style.js"
import { AudioParameter } from "../../../audio/audio-parameter.js";
import { Point } from "../point.js";
import { Rectangle } from "../rectangle.js";
import { ParameterProxy } from "../parameter-proxy.js";
import { MoreMath } from "../../../core/math.js";

export class Knob extends Component {
    /** @type {ParameterProxy} */
    proxy = new ParameterProxy;

    /** @type {Point} */
    mouseAnchor = new Point;
    valueAnchor = 0;

    dragCoefficient = 3e-3;
    scrollWheelScale = 6e-4;

    knobBounds = new Rectangle;
    labelBounds = new Rectangle;

    /** @type {number} */
    radius = 0;
    centerX = 0;
    centerY = 0;

    constructor() {
        super();

        this.proxy.onValueChange = () => this.repaint();
    }

    deinit() {
        this.proxy.deinit();
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bottomAngle = Math.PI / 2;
        const offsetAngle = Math.PI / 5;
        const startAngle = bottomAngle + offsetAngle;
        const endAngle = startAngle + 2 * (Math.PI - offsetAngle);
        const valueAngle = MoreMath.lerp(this.proxy.valueNormalized, startAngle, endAngle);

        // Background arc
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius, startAngle, endAngle);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "oklch(87.2% 0.01 258.338)";
        ctx.stroke();

        // Foreground arc
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius, startAngle, valueAngle);
        ctx.strokeStyle = "oklch(62.3% 0.214 259.815)";
        ctx.stroke();

        // Pointer
        const pointerLength = 0.75;
        const pointerX = MoreMath.linearMap(Math.cos(valueAngle), -1, 1, this.knobBounds.x, this.knobBounds.getRight());
        const pointerY = MoreMath.linearMap(Math.sin(valueAngle), -1, 1, this.knobBounds.y, this.knobBounds.getBottom());
        ctx.beginPath()
        ctx.moveTo(pointerX, pointerY);
        ctx.lineTo(MoreMath.lerp(pointerLength, pointerX, this.centerX), MoreMath.lerp(pointerLength, pointerY, this.centerY));
        ctx.stroke();

        // Label
        ctx.fillStyle = "oklch(13% 0.028 261.692)";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.font = "14px system-ui";
        ctx.fillText(this.proxy.textFromValue(this.proxy.value), this.labelBounds.getCenterX(), this.labelBounds.getBottom());
    }

    resized() {
        const bounds = this.getLocalBounds();
        this.labelBounds = bounds.removeFromBottom(16);
        this.knobBounds = bounds.reduced(1, 1);

        this.radius = Math.min(this.knobBounds.width, this.knobBounds.height) * 0.5;
        this.centerX = this.knobBounds.getCenterX();
        this.centerY = this.knobBounds.getCenterY();
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
        this.valueAnchor = this.proxy.valueNormalized;
    }

    /** @param {MouseEvent} ev */
    mouseDrag(ev) {
        const distanceDragged = this.mouseAnchor.y - ev.y;
        const newValue = this.valueAnchor + distanceDragged * this.dragCoefficient;

        this.setNormalizedValueInternal(newValue);
    }

    /** @param {MouseEvent} ev */
    mouseEnter(ev) {
        setCursorStyle(CursorStyle.resizeNS);
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

        this.setNormalizedValueInternal(this.proxy.valueNormalized + delta * this.scrollWheelScale);
    }

    /**
     * @param {number} valueNormalized 
     */
    setNormalizedValueInternal(valueNormalized) {
        valueNormalized = Math.min(Math.max(valueNormalized, 0), 1);
        if (this.proxy.valueNormalized === valueNormalized) return;

        this.proxy.setNormalizedValue(valueNormalized);
    }

    /**
     * @param {ParameterProxy} proxy 
     */
    setProxy(proxy) {
        this.proxy.deinit();
        this.proxy = proxy;
        this.proxy.onValueChange = () => this.repaint();
    }

    /**
     * @param {AudioParameter} audioParameter 
     */
    attach(audioParameter) {
        this.setProxy(audioParameter.createProxy());
    }
}