import { AppContext } from "../../../app/app-context.js";
import { InstrumentEvent } from "../../../audio/audio-constants.js";
import { Component } from "../../framework/component.js";
import { Button } from "../../framework/components/button.js";
import { MouseAction, MouseActionPolicy } from "../../framework/mouse-event.js";
import { Rectangle } from "../../framework/rectangle.js";

export class InstrumentsSection extends Component {
    /** @type {AppContext} */
    context;

    /** @type {Rectangle} */
    headerBounds;

    /** @type {Button} */
    addInstrumentButton;

    /**
     * @param {AppContext} context 
     */
    constructor(context) {
        super();
        this.context = context;

        this.addInstrumentButton = new Button();
        this.addInstrumentButton.onClick = () => console.log("Add instrument clicked!");
        this.addChildComponent(this.addInstrumentButton);

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
        ctx.font = "24px serif";
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

    instrumentsChanged() {
        console.log("instrumentsChanged");
    }

    updateSelectedInstrument() {
        console.log("updateSelectedInstrument");
    }
}