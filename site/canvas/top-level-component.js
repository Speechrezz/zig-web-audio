import { Component, Rectangle, Point } from "./component.js"
import { MouseAction, MouseEvent } from "./mouse-event.js";

export class TopLevelComponent extends Component {
    /**
     * @type {HTMLCanvasElement}
     */
    canvas;

    mouseAction = MouseAction.none;
    mouseDownButton = 0;

    /**
     * 
     * @param {HTMLCanvasElement} canvasElement 
     */
    constructor(canvasElement) {
        super();
        this.canvas = canvasElement;
        this.getGraphicsContext = () => this.canvas.getContext("2d");

        this.canvas.onpointerdown = (ev) => this.mouseDownInternal(ev);
        this.canvas.onpointerup   = (ev) => this.mouseUpInternal(ev);
        this.canvas.onpointermove = (ev) => this.mouseMoveInternal(ev);

        this.canvas.oncontextmenu = (ev) => ev.preventDefault();

        this.setBounds(new Rectangle(0, 0, this.canvas.width, this.canvas.height));
    }

    /**
     * @param {PointerEvent} ev 
     */
    pointerEventToMouseAction(ev) {
        if (ev.buttons === 0) return MouseAction.none;
        return ev.button + 1;
    }

    /**
     * @param {PointerEvent} ev 
     * @param {MouseAction} mouseAction
     */
    pointerEventToEventHandler(ev, mouseAction) {
        const componentWithCoords = this.getMouseEventHandler(ev.offsetX, ev.offsetY, mouseAction)
        if (componentWithCoords === null) return null

        const mouseEvent = new MouseEvent(
            componentWithCoords.x, 
            componentWithCoords.y, 
            ev.offsetX, 
            ev.offsetY,
            mouseAction,
        );

        return { component: componentWithCoords.component, mouseEvent: mouseEvent };
    }

    /**
     * @param {PointerEvent} ev 
     */
    mouseDownInternal(ev) {
        if (this.mouseAction !== MouseAction.none) return;
            
        this.canvas.setPointerCapture(ev.pointerId);

        const mouseAction = this.pointerEventToMouseAction(ev);
        this.mouseAction = mouseAction;
        this.mouseDownButton = ev.button;

        const componentWithEvent = this.pointerEventToEventHandler(ev, this.mouseAction);
        if (componentWithEvent === null) return;
        
        componentWithEvent.component.mouseDown(componentWithEvent.mouseEvent);
    }

    /**
     * @param {PointerEvent} ev 
     */
    mouseUpInternal(ev) {
        if (ev.button !== this.mouseDownButton) return;

        this.canvas.releasePointerCapture(ev.pointerId);

        const componentWithEvent = this.pointerEventToEventHandler(ev, this.mouseAction);
        this.mouseAction = MouseAction.none;

        if (componentWithEvent === null) return;
        componentWithEvent.component.mouseUp(componentWithEvent.mouseEvent);
    }

    /**
     * @param {PointerEvent} ev 
     */
    mouseMoveInternal(ev) {
        const componentWithEvent = this.pointerEventToEventHandler(ev, this.mouseAction);
        if (componentWithEvent === null) return;
        
        if (this.mouseAction === MouseAction.none)
            componentWithEvent.component.mouseMove(componentWithEvent.mouseEvent);
        else
            componentWithEvent.component.mouseDrag(componentWithEvent.mouseEvent);
    }
}

