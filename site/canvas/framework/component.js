import { MouseEvent, MouseAction, MouseActionPolicy, MouseScrollEvent } from "./mouse-event.js"
import { Rectangle } from "./rectangle.js";
import { Point } from "./point.js";

export class Component {
    /**
     * Bounds, relative to parent.
     * @type {Rectangle}
     */
    bounds = new Rectangle(0, 0, 0, 0);

    /**
     * Translation, relative to parent.
     * @type {Point}
     */
    translation = new Point(0, 0);

    /**
     * `true` if this component should be drawn.
     */
    visibleFlag = true;
    
    /**
     * @type {Component[]}
     */
    childComponents = [];

    /**
     * @type {Component | null}
     */
    parentComponent = null;

    /**
     * If `true`, then this component will intercept mouse events.
     */
    interceptsMouseEvents = true;

    mouseOverFlag = false;
    mouseDraggingFlag = false;


    // ---Virtual methods---

    /**
     * Destructor, call before deleting.
     */
    deinit() {
        if (this.parentComponent !== null) {
            this.parentComponent.removeChildComponent(this);
        }
    }

    /**
     * Override to draw component.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {}

    /**
     * Override to add custom behavior on bounds change.
     */
    resized() {}

    /**
     * Override to change the default hitbox.
     * @param {Number} x Relative to this component
     * @param {Number} y Relative to this component
     * @returns 
     */
    hitTest(x, y) {
        if (!this.interceptsMouseEvents) return false;

        return this.getLocalBounds().contains(x, y);
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
                return MouseActionPolicy.acceptPropagate;
            default:
                return MouseActionPolicy.ignorePropagate;
        }
    }

    /** @param {MouseEvent} ev */
    mouseDown(ev) {}
    /** @param {MouseEvent} ev */
    mouseUp(ev) {}
    /** @param {MouseEvent} ev */
    mouseEnter(ev) {}
    /** @param {MouseEvent} ev */
    mouseExit(ev) {}
    /** @param {MouseEvent} ev */
    mouseDrag(ev) {}
    /** @param {MouseEvent} ev */
    mouseMove(ev) {}
    /** @param {MouseEvent} ev */
    mouseClick(ev) {}
    /** @param {MouseScrollEvent} ev */
    mouseScroll(ev) {}
    /** @param {MouseScrollEvent} ev */
    mouseMagnify(ev) {}

    // ---Component methods---

    /**
     * 
     * @param {Number} x Relative to this component
     * @param {Number} y Relative to this component
     * @returns {Component | null}
     */
    getComponentAt(x, y) {
        if (this.visibleFlag && this.hitTest(x, y)) {
            for (const child of this.childComponents) {
                const subChild = child.getComponentAt(child.fromParentX(x), child.fromParentY(y));
                
                if (subChild !== null)
                    return subChild;
            }

            return this;
        }

        return null;
    }

    isMouseOver() {
        return this.mouseOverFlag;
    }

    isMouseOverOrDragging() {
        return this.mouseOverFlag || this.mouseDraggingFlag;
    }

    /**
     * @param {Component} childComponent 
     */
    addChildComponent(childComponent) {
        this.childComponents.push(childComponent);
        childComponent.parentComponent = this;
    }

    /**
     * @param {Component} childComponent 
     */
    removeChildComponent(childComponent) {
        const index = this.childComponents.indexOf(childComponent);
        if (index === -1) return;

        childComponent.parentComponent = null;
        this.childComponents.splice(index, 1);
    }

    /**
     * Gets top level component.
     * @returns {Component}
     */
    getTopLevelComponent() {
        if (this.parentComponent === null)
            return this;

        return this.parentComponent.getTopLevelComponent();
    }

    /**
     * Triggers global repaint.
     */
    repaint() {
        const topLevelComponent = this.getTopLevelComponent();
        if (typeof topLevelComponent.topLevelRepaint === 'function') {
            topLevelComponent.topLevelRepaint();
        }
    }

    /**
     * @param {Rectangle} newBounds 
     */
    setBounds(newBounds) {
        if (this.bounds.eql(newBounds)) return;

        this.bounds = newBounds;
        this.resized();
    }

    /**
     * @returns {Rectangle}
     */
    getLocalBounds() {
        const localBounds = this.bounds.clone();
        localBounds.x = 0;
        localBounds.y = 0;
        return localBounds;
    }


    // ---Internal methods---

    /**
     * Prepares/restores context state for drawing. DO NOT override.
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawInternal(ctx) {
        ctx.save();

        // Localize coordinate system for this component
        ctx.translate(this.toParentX(0), this.toParentY(0));

        // Clip to the component bounds
        ctx.beginPath();
        ctx.rect(0, 0, this.bounds.width, this.bounds.height);
        ctx.clip();

        // Draw self (in local space)
        this.draw(ctx);

        // Draw children (also in this local space)
        for (const child of this.childComponents) {
            if (child.visibleFlag) {
                child.drawInternal(ctx);
            }
        }

        ctx.restore();
    }

    /**
     * Converts x-coordinate from parent space to this Component's space.
     * @param {Number} x 
     * @returns x
     */
    fromParentX(x) {
        return x - this.bounds.x - this.translation.x;
    }

    /**
     * Converts y-coordinate from parent space to this Component's space.
     * @param {Number} y 
     * @returns y
     */
    fromParentY(y) {
        return y - this.bounds.y - this.translation.y;
    }

    /**
     * Converts x-coordinate to parent space from this Component's space.
     * @param {Number} x 
     * @returns x
     */
    toParentX(x) {
        return x + this.bounds.x + this.translation.x;
    }

    /**
     * Converts y-coordinate to parent space from this Component's space.
     * @param {Number} y 
     * @returns y
     */
    toParentY(y) {
        return y + this.bounds.y + this.translation.y;
    }

    /**
     * @param {Number} x Relative to this component
     * @param {Number} y Relative to this component
     * @param {MouseAction} mouseAction 
     * @returns {{component: Component, x: Number, y: Number} | null} Coordinates relative to target component
     */
    getMouseEventHandler(x, y, mouseAction) {
        if (!this.visibleFlag || !this.hitTest(x, y)) return null;

        const policy = this.canHandleMouseAction(mouseAction);
        if (policy === MouseActionPolicy.acceptBlock) {
            return {component: this, x: x, y: y};
        }
        
        for (let i = this.childComponents.length - 1; i >= 0; i--) {
            const child = this.childComponents[i];
            const subChild = child.getMouseEventHandler(child.fromParentX(x), child.fromParentY(y), mouseAction);
            
            if (subChild !== null)
                return subChild;
        }

        if (policy === MouseActionPolicy.acceptPropagate) {
            return {component: this, x: x, y: y};
        }
        if (policy === MouseActionPolicy.ignorePropagate) {
            return null;
        }

        // Should be unreachable
        console.error("[Component.getMouseEventHandler()] Reached unreachable code!");
    }

    /**
     * Returns this component's bounds relative to the top-level component.
     * @returns Global bounds
     */
    getGlobalBounds() {
        let globalBounds = this.getLocalBounds();
        let c = this;

        while (c.parentComponent !== null) {
            globalBounds.x += c.bounds.x + c.translation.x;
            globalBounds.y += c.bounds.y + c.translation.y;
            c = c.parentComponent;
        }   

        return globalBounds;
    }
}