import { AppContext } from "../../../app/app-context.js";
import { InstrumentDetailsList, InstrumentEvent } from "../../../audio/audio-constants.js";
import { Component } from "../../framework/component.js";
import { Button } from "../../framework/components/button.js";
import { PopupMenu } from "../../framework/components/popup-menu.js";
import { MouseAction, MouseActionPolicy } from "../../framework/mouse-event.js";
import { Rectangle } from "../../framework/rectangle.js";

export class InstrumentsSection extends Component {
    /** @type {AppContext} */
    context;

    /** @type {Rectangle} */
    headerBounds;

    /** @type {Button} */
    addInstrumentButton = new Button("+");

    /** @type {PopupMenu} */
    addInstrumentDropdown = new PopupMenu();

    /**
     * @param {AppContext} context 
     */
    constructor(context) {
        super();
        this.context = context;

        this.addInstrumentButton.onClick = () => this.openInstrumentsDropdown();
        this.addChildComponent(this.addInstrumentButton);
        
        this.initializeDropdown();
        this.addInstrumentDropdown.onSelectedChanged = (index) => this.instrumentDropdownItemClicked(index);
        this.addInstrumentDropdown.addComponentToGroup(this.addInstrumentButton);

        this.context.instruments.addListener(InstrumentEvent.InstrumentsChanged, () => this.instrumentsChanged());
        this.context.instruments.addListener(InstrumentEvent.InstrumentSelected, () => this.updateSelectedInstrument());

        this.instrumentsChanged();
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bounds = this.getLocalBounds();

        ctx.fillStyle = "oklch(13% 0.028 261.692)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 24px system-ui";
        ctx.fillText("Instruments", this.headerBounds.getCenterX(), this.headerBounds.getCenterY());

        ctx.strokeStyle = "oklch(70.7% 0.022 261.325)";
        ctx.lineWidth = 2;
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

        ctx.strokeRect(this.headerBounds.x, this.headerBounds.y, this.headerBounds.width, this.headerBounds.height);
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

    resized() {
        const bounds = this.getLocalBounds();
        this.headerBounds = bounds.removeFromTop(48);

        bounds.removeFromTop(16);
        this.addInstrumentButton.setBounds(bounds.removeFromTop(48).reduced(8, 0));
    }

    initializeDropdown() {
        for (const instrumentDetails of InstrumentDetailsList)
        {
            this.addInstrumentDropdown.menuItems.push(instrumentDetails.name);
        }
    }

    openInstrumentsDropdown() {
        if (this.addInstrumentDropdown.isOpen())
            this.addInstrumentDropdown.hideMenu();
        else
            this.addInstrumentDropdown.showMenuAtComponent(this.addInstrumentButton);
    }

    /**
     * @param {null | number} index 
     */
    instrumentDropdownItemClicked(index) {
        if (index === null) return;
        this.context.instruments.addInstrument(-1, index);
    }

    instrumentsChanged() {
        console.log("instrumentsChanged");
    }

    updateSelectedInstrument() {
        console.log("updateSelectedInstrument");
    }
}