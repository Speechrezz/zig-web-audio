import { Component } from "./component.js"
import { Rectangle } from "./rectangle.js";
import { MouseAction, MouseEvent, MouseScrollEvent } from "./mouse-event.js";

export class TopLevelComponent extends Component {
    /** @type {HTMLCanvasElement} */
    canvas;

    /** @type {MouseAction} */
    mouseAction = MouseAction.none;
    mouseDownButton = 0;

    /** @type {Component | null} */
    selectedComponent = null;

    /** @type {Component | null} */
    hoveredComponent = null;

    isRepaintPending = false;

    /**
     * 
     * @param {HTMLCanvasElement} canvasElement 
     */
    constructor(canvasElement) {
        super();
        this.canvas = canvasElement;

        this.canvas.onpointerdown = (ev) => this.mouseDownInternal(ev);
        this.canvas.onpointerup   = (ev) => this.mouseUpInternal(ev);
        this.canvas.onpointermove = (ev) => this.mouseMoveInternal(ev);

        this.canvas.oncontextmenu = (ev) => ev.preventDefault();

        this.canvas.onwheel = (ev) => this.mouseWheelInternal(ev);
    }

    canvasResized() {
        // TODO: This is a hacky way to workaround canvas getting all weird when zooming in/out.
        // There must be a better way...
        const dpr = window.devicePixelRatio || 1;
        const width = Math.round(this.canvas.width / dpr);
        const height = Math.round(this.canvas.height / dpr);

        this.setBounds(new Rectangle(0, 0, width, height))
        this.repaint();
    }

    /**
     * @param {PointerEvent} ev 
     */
    pointerEventToMouseAction(ev) {
        if (ev.buttons === 0) return MouseAction.none;

        if (ev.button === 0) {
            if (ev.ctrlKey) {
                return MouseAction.select;
            }
        }

        switch (ev.button) {
            case 0:
                return MouseAction.primary;
            case 1:
                return MouseAction.translate;
            case 2:
                return MouseAction.secondary;
        }

        return MouseAction.none;
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
     * @param {Component} component 
     * @param {MouseAction} mouseAction 
     * @returns MouseEvent
     */
    pointerEventToMouseEvent(ev, component, mouseAction) {
        const globalBounds = component.getGlobalBounds();

        const mouseEvent = new MouseEvent(
            ev.offsetX - globalBounds.x, 
            ev.offsetY - globalBounds.y, 
            ev.offsetX, 
            ev.offsetY,
            mouseAction,
        );

        return mouseEvent;
    }

    /**
     * @param {PointerEvent} ev 
     */
    mouseDownInternal(ev) {
        ev.preventDefault();
        this.canvas.focus();
        if (this.mouseAction !== MouseAction.none) return;
            
        this.canvas.setPointerCapture(ev.pointerId);

        const mouseAction = this.pointerEventToMouseAction(ev);
        this.mouseAction = mouseAction;
        this.mouseDownButton = ev.button;

        const componentWithEvent = this.pointerEventToEventHandler(ev, this.mouseAction);
        if (componentWithEvent === null) return;
        
        this.selectedComponent = componentWithEvent.component;
        this.selectedComponent.mouseOverFlag = true;
        this.selectedComponent.mouseDraggingFlag = true;

        componentWithEvent.component.mouseDown(componentWithEvent.mouseEvent);
    }

    /**
     * @param {PointerEvent} ev 
     */
    mouseUpInternal(ev) {
        ev.preventDefault();
        if (ev.button !== this.mouseDownButton) return;

        if (this.selectedComponent !== null) {
            const mouseEvent = this.pointerEventToMouseEvent(ev, this.selectedComponent, this.mouseAction);

            this.selectedComponent.mouseDraggingFlag = false;
            this.selectedComponent.mouseUp(mouseEvent);
        }

        this.mouseAction = MouseAction.none;
        this.selectedComponent = null;
        this.canvas.releasePointerCapture(ev.pointerId);

        // TODO: This will trigger `mouseMove` even if mouse has not moved.
        // But this is kind of necessary for the `mouseEnter` and `mouseExit` events to trigger.
        this.mouseMoveInternal(ev);
    }

    /**
     * @param {PointerEvent} ev 
     */
    mouseMoveInternal(ev) {
        ev.preventDefault();
        if (this.mouseAction === MouseAction.none) {
            const componentWithEvent = this.pointerEventToEventHandler(ev, this.mouseAction);
            if (componentWithEvent !== null) {
                if (componentWithEvent.component !== this.hoveredComponent) {
                    if (this.hoveredComponent) {
                        this.hoveredComponent.mouseExit(componentWithEvent);
                        this.hoveredComponent.mouseOverFlag = false;
                    }
                    
                    this.hoveredComponent = componentWithEvent.component;

                    if (this.hoveredComponent) {
                        this.hoveredComponent.mouseEnter(componentWithEvent);
                        this.hoveredComponent.mouseOverFlag = true;
                    }
                }
                
                componentWithEvent.component.mouseMove(componentWithEvent.mouseEvent);
            }
        }
        else {
            if (this.selectedComponent !== null) {
                const componentUnderCursor = this.getComponentAt(ev.offsetX, ev.offsetY);
                const mouseEvent = this.pointerEventToMouseEvent(ev, this.selectedComponent, this.mouseAction);

                this.selectedComponent.mouseOverFlag = this.selectedComponent === componentUnderCursor;
                this.selectedComponent.mouseDrag(mouseEvent);
            }
        }
    }

    /**
     * @param {WheelEvent} ev 
     */
    mouseWheelInternal(ev) {
        ev.preventDefault();

        if (ev.ctrlKey) {
            const componentWithCoords = this.getMouseEventHandler(ev.offsetX, ev.offsetY, MouseAction.magnify)
            if (componentWithCoords === null) return;

            const magnifyX = 2 ** (-ev.deltaX * 0.002);
            const magnifyY = 2 ** (-ev.deltaY * 0.002);

            const mouseScrollEvent = new MouseScrollEvent(
                componentWithCoords.x, 
                componentWithCoords.y, 
                ev.offsetX, 
                ev.offsetY,
                magnifyX,
                magnifyY,
            );

            componentWithCoords.component.mouseMagnify(mouseScrollEvent);
        }
        else {
            const componentWithCoords = this.getMouseEventHandler(ev.offsetX, ev.offsetY, MouseAction.scroll)
            if (componentWithCoords === null) return;

            const deltaScale = 0.75;

            const mouseScrollEvent = new MouseScrollEvent(
                componentWithCoords.x, 
                componentWithCoords.y, 
                ev.offsetX, 
                ev.offsetY,
                ev.deltaX * deltaScale,
                ev.deltaY * deltaScale,
            );

            componentWithCoords.component.mouseScroll(mouseScrollEvent);
        }
    }

    topLevelRepaint() {
        if (this.isRepaintPending === false) {
            this.isRepaintPending = true;

            requestAnimationFrame((timestamp) => {
                const ctx = this.canvas.getContext("2d");
                this.drawInternal(ctx);
                this.isRepaintPending = false;
            });
        }
    }
}

