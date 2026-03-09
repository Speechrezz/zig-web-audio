import { AppContext } from "../../../app/app-context.js";
import { InstrumentDetailsList, InstrumentEvent } from "../../../audio/audio-constants.js";
import { Component } from "../../framework/component.js";
import { ComboBox } from "../../framework/components/combo-box.js";
import { MouseAction, MouseActionPolicy } from "../../framework/mouse-event.js";
import { Rectangle } from "../../framework/rectangle.js";
import { InstrumentControls } from "./instrument-controls.js";

export class InstrumentsSection extends Component {
    /** @type {AppContext} */
    context;

    /** @type {Rectangle} */
    headerBounds = null;

    /** @type {Rectangle} */
    instrumentsBounds = null;

    /** @type {ComboBox} */
    addInstrumentComboBox = new ComboBox("+");

    /** @type {InstrumentControls[]} */
    instrumentComponents = [];

    /**
     * @param {AppContext} context 
     */
    constructor(context) {
        super();
        this.context = context;

        this.addInstrumentComboBox.popupMenu.overrideWidth = 160;
        this.addChildComponent(this.addInstrumentComboBox);
        this.initializeDropdown();

        this.context.instruments.addListener(InstrumentEvent.InstrumentsChanged, () => this.instrumentsChanged());
        this.context.instruments.addListener(InstrumentEvent.InstrumentSelected, () => this.updateSelectedInstrument());

        this.instrumentsChanged();
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bounds = this.getLocalBounds();

        ctx.fillStyle = "oklch(98.5% 0.002 247.839)";
        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

        ctx.fillStyle = "oklch(13% 0.028 261.692)";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = "600 20px system-ui";
        ctx.fillText("Instruments", this.headerBounds.x + 8, this.headerBounds.getCenterY());
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
        this.headerBounds = bounds.removeFromTop(40);

        const addComboBoxBounds = this.headerBounds.reduced(8, 8).removeFromRight(24);
        this.addInstrumentComboBox.setBounds(addComboBoxBounds);

        this.instrumentsBounds = bounds;
        this.updateInstrumentBounds();
    }

    initializeDropdown() {
        const popupMenu = this.addInstrumentComboBox.popupMenu;
        for (const instrumentDetails of InstrumentDetailsList)
            popupMenu.menuItems.push(instrumentDetails.name);

        popupMenu.onSelectedChanged = (index) => this.instrumentDropdownItemClicked(index);
    }

    /**
     * @param {null | number} index 
     */
    instrumentDropdownItemClicked(index) {
        if (index === null) return;
        this.context.instruments.addInstrument(-1, index);
    }

    instrumentClicked(index) {
        this.context.instruments.selectInstrument(index);
    }

    instrumentsChanged() {
        const instruments = this.context.instruments.getList();
        this.clearInstruments();

        for (const instrument of instruments) {
            const component = new InstrumentControls(instrument);
            component.onDelete = (index) => this.deleteInstrument(index);
            component.onClick = (index) => this.instrumentClicked(index);

            this.instrumentComponents.push(component);
            this.addChildComponent(component);
        }

        this.updateSelectedInstrument();
        this.updateInstrumentBounds();
    }

    updateInstrumentBounds() {
        if (this.instrumentsBounds === null) return;
        
        const bounds = this.instrumentsBounds.reduced(8, 8);

        for (const component of this.instrumentComponents) {
            component.setBounds(bounds.removeFromTop(96));
            bounds.removeFromTop(8);
        }
    }

    updateSelectedInstrument() {
        const selectedIndex = this.context.instruments.selectedIndex;

        for (const component of this.instrumentComponents) {
            const isSelected = component.instrument.index === selectedIndex;
            component.setSelected(isSelected);
        }
    }

    /**
     * @param {number} index 
     */
    deleteInstrument(index) {
        this.context.instruments.removeInstrument(index);
    }

    clearInstruments() {
        for (const component of this.instrumentComponents) {
            component.deinit();
            this.removeChildComponent(component);
        }

        this.instrumentComponents.length = 0;
    }
}