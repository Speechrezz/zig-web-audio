import { Component } from "./component.js";
import { ValueTooltip } from "./components/value-tooltip.js";

export class TooltipController {
    /** @type {Component} */
    rootComponent;

    /** @type {ValueTooltip} */
    valueTooltip = new ValueTooltip;

    /** @type {() => CanvasRenderingContext2D} */ // @ts-ignore
    getCtx;

    /**
     * @param {Component} rootComponent 
     */
    constructor(rootComponent) {
        this.rootComponent = rootComponent;
    }

    /**
     * Call this after all other components to ensure tooltips are always on top.
     */
    initialize() {
        this.rootComponent.addChildComponent(this.valueTooltip);
    }

    /**
     * @param {Component} relativeTo 
     */
    showValueTooltip(relativeTo) {
        const bounds = relativeTo.getGlobalBounds();
        bounds.translate(0, bounds.height);
        bounds.height = 24;
        this.valueTooltip.setBounds(bounds);
        this.valueTooltip.visibleFlag = true;
    }

    /**
     * @param {string} text 
     */
    setValueTooltipText(text) {
        this.valueTooltip.setText(this.getCtx(), text);
    }

    hideValueTooltip() {
        this.valueTooltip.setVisible(false);
    }
}