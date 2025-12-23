import { MouseEvent, MouseAction, MouseActionPolicy } from "./mouse-event.js"

export class Point {
    x = 0;
    y = 0;

    /**
     * 
     * @param {Number} x 
     * @param {Number} y 
     */
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    /**
     * @param {Point} other 
     */
    eql(other) {
        return this.x === other.x && this.y === other.y;
    }

    /**
     * Sets current Point equal to other point.
     * @param {Point} other 
     */
    set(other) {
        this.x = other.x;
        this.y = other.y;
    }

    /**
     * Binary add (returns new `Point`).
     * @param {Point} other 
     */
    add(other) {
        return new Point(this.x + other.x, this.y + other.y);
    }

    /**
     * In-place add (adds to current `Point`).
     * @param {Point} other 
     */
    addFrom(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }
}

export class Rectangle {
    x = 0;
    y = 0;
    width = 0;
    height = 0;

    /**
     * 
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} width 
     * @param {Number} height 
     */
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    getRight() {
        return this.x + this.width;
    }

    getBottom() {
        return this.y + this.height;
    }

    /**
     * @param {Number} x 
     * @param {Number} y 
     */
    translate(x, y) {
        this.x += x;
        this.y += y;
    }

    /**
     * 
     * @param {Point} point 
     */
    translatePoint(point) {
        this.x += point.x;
        this.y += point.y;
    }

    /**
     * 
     * @param {Rectangle} other 
     */
    eql(other) {
        return this.x === other.x
            && this.y === other.y
            && this.width  === other.width
            && this.height === other.height;
    }

    clone() {
        return new Rectangle(this.x, this.y, this.width, this.height);
    }

    /**
     * 
     * @param {Number} x 
     * @param {Number} y 
     * @returns `true` if the point is inside the rectangle
     */
    contains(x, y) {
        return x >= this.x && x <= this.getRight() 
            && y >= this.y && y <= this.getBottom();
    }

    /**
     * Checks whether this rectangle intersects another rectangle
     * @param {Rectangle} other
     * @returns {boolean}
     */
    intersects(other) {
        return !(
            this.x + this.width  <= other.x ||  // this is left of other
            this.x >= other.x + other.width ||  // this is right of other
            this.y + this.height <= other.y ||  // this is above other
            this.y >= other.y + other.height    // this is below other
        );
    }
}

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

    /**
     * Top level component MUST implement this.
     * @type {(() => CanvasRenderingContext2D) | null}
     */
    getGraphicsContext = null;


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
    resize() {}

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
            case MouseAction.draw:
                return MouseActionPolicy.acceptPropagate;
            default:
                return MouseActionPolicy.ignorePropogate;
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
        const ctx = topLevelComponent.getGraphicsContext();
        this.getTopLevelComponent().drawInternal(ctx);
    }

    /**
     * 
     * @param {Rectangle} newBounds 
     */
    setBounds(newBounds) {
        if (this.bounds.eql(newBounds)) return;

        this.bounds = newBounds;
        this.resize();
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
        
        for (const child of this.childComponents) {
            const subChild = child.getMouseEventHandler(child.fromParentX(x), child.fromParentY(y), mouseAction);
            
            if (subChild !== null)
                return subChild;
        }

        if (policy === MouseActionPolicy.acceptPropagate) {
            return {component: this, x: x, y: y};
        }
        if (policy === MouseActionPolicy.ignorePropogate) {
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