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
    constructor(x, y, width, height) {
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
    hitTest(x, y) {
        return x >= this.x && x <= this.getRight() 
            && y >= this.y && this.y <= this.getBottom();
    }
}

export class Component {
    /**
     * Bounds, relative to parent.
     * @type {Rectangle}
     */
    bounds = new Rectangle;

    /**
     * `true` if current component should be drawn.
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

        return this.getLocalBounds().hitTest(x, y);
    }

    /**
     * 
     * @param {Number} x Relative to this component
     * @param {Number} y Relative to this component
     * @returns {Component | null}
     */
    getComponentAt(x, y) {
        x -= this.bounds.x;
        y -= this.bounds.y;

        if (this.visibleFlag && this.hitTest(x, y)) {
            for (const child of this.childComponents) {
                const subChild = child.getComponentAt(x - child.bounds.x, y - child.bounds.y);
                
                if (subChild !== null)
                    return subChild;
            }

            return this;
        }

        return null;
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
        const index = this.childComponents.findIndex((c) => c === childComponent);
        if (index === -1) return;

        childComponent.parentComponent = null;
        this.childComponents.splice(index, 1);
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
        if (this.childComponents.length === 0) return;

        ctx.save();

        // Localize coordinate system for this component
        ctx.translate(this.bounds.x, this.bounds.y);

        // Clip to the component bounds
        ctx.beginPath();
        ctx.rect(0, 0, this.bounds.width, this.bounds.height);
        ctx.clip();

        // Draw self (in local space)
        this.draw(ctx);

        // Draw children (also in this local space)
        for (const child of this.childComponents) {
            child.drawInternal(ctx);
        }

        ctx.restore();
    }
}