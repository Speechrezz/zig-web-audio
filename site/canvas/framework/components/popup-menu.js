import { Component } from "../component.js";
import { MouseEvent } from "../mouse-event.js";

export class PopupMenu extends Component {
    /** @type {bool} */
    isOpenFlag = false;

    /** @type {string[]} */
    menuItems = [];

    /** @type {number} */
    itemHeight = 32;

    /** @type {null | number} */
    overrideWidth = null;

    /** @type {null | number} */
    highlightedIndex = null;

    /** @type {null | (index: null | number) => void} */
    onSelectedChanged = null;

    /** @type {import("../mouse-event.js").GlobalMouseListener} */
    globalMouseListener;

    /** @type {Component[]} */
    componentGroup = [];

    constructor() {
        super();

        this.globalMouseListener = (eventType, mouseAction) => {
            if (eventType === "mouseDown")
                this.globalMouseDown();
        };
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bounds = this.getLocalBounds();

        ctx.fillStyle = "oklch(96.7% 0.003 264.542)";
        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

        ctx.fillStyle = "oklch(13% 0.028 261.692)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "16px system-ui";
        for (let i = 0; i < this.menuItems.length; i++) {
            if (this.highlightedIndex === i) {
                const tempFillStyle = ctx.fillStyle;
                ctx.fillStyle = "oklch(87.2% 0.01 258.338)";
                ctx.fillRect(0, i * this.itemHeight, bounds.width, this.itemHeight);
                ctx.fillStyle = tempFillStyle;
            }

            const menuItem = this.menuItems[i];
            ctx.fillText(menuItem, bounds.getCenterX(), (i + 0.5) * this.itemHeight);
        }

        bounds.reduce(0.5, 0.5);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "oklch(55.1% 0.027 264.364)";
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    isOpen() {
        return this.isOpenFlag;
    }

    /**
     * @param {Component} component 
     */
    addComponentToGroup(component) {
        this.componentGroup.push(component);
    }

    /**
     * @param {Component} component 
     */
    removeComponentToGroup(component) {
        const index = this.componentGroup.indexOf(component);
        if (index === -1) return;

        this.componentGroup.splice(index, 1);
    }

    /**
     * @param {Component} component 
     */
    showMenuAtComponent(component) {
        component.addGlobalComponent(this);
        component.addGlobalMouseListener(this.globalMouseListener);
        
        const parentBounds = component.getGlobalBounds();
        parentBounds.translate(0, parentBounds.height);
        parentBounds.height = Math.max(this.itemHeight, this.itemHeight * this.menuItems.length);
        if (this.overrideWidth !== null)
            parentBounds.width = this.overrideWidth;

        this.setBounds(parentBounds);

        this.isOpenFlag = true;
        this.repaint();
    }

    hideMenu() {
        const tempParent = this.parentComponent;

        this.parentComponent.removeGlobalMouseListener(this.globalMouseListener);
        this.parentComponent.removeChildComponent(this);
        this.isOpenFlag = false;

        tempParent.repaint();
    }

    /**
     * @param {number} x 
     * @param {number} y 
     */
    pointToItemIndex(x, y) {
        const bounds = this.getLocalBounds();
        if (!bounds.contains(x, y))
            return null;

        return Math.floor(y / this.itemHeight);        
    }

    /** @param {MouseEvent} ev */
    mouseMove(ev) {
        const itemIndex = this.pointToItemIndex(ev.x, ev.y);
        if (itemIndex === this.highlightedIndex) return;

        this.highlightedIndex = itemIndex;
        this.repaint();
    }

    /** @param {MouseEvent} ev */
    mouseUp(ev) {
        const itemIndex = this.pointToItemIndex(ev.x, ev.y);
        if (this.onSelectedChanged !== null) {
            this.onSelectedChanged(itemIndex);
        }

        this.hideMenu();
    }

    /** @param {MouseEvent} ev */
    mouseExit(ev) {
        if (this.highlightedIndex === null) return;

        this.highlightedIndex = null;
        this.repaint();
    }

    globalMouseDown() {
        if (this.isMouseOverOrDragging()) return;

        for (const component of this.componentGroup) {
            if (component.isMouseOverOrDragging()) return;
        }

        this.hideMenu();
    }
}