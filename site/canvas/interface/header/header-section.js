import { AppContext } from "../../../app/app-context.js";
import { Component } from "../../framework/component.js";
import { Button } from "../../framework/components/button.js";
import { ComboBox } from "../../framework/components/combo-box.js";
import { NumberBox } from "../../framework/components/number-box.js";
import { MouseAction, MouseActionPolicy } from "../../framework/mouse-event.js";
import { Rectangle } from "../../framework/rectangle.js";

export class HeaderSection extends Component {
    /** @type {AppContext} */
    context;

    playButton = new Button("Play");
    stopButton = new Button("Stop");
    tempoBox = new NumberBox;

    /**
     * @param {AppContext} context 
     */
    constructor(context) {
        super();
        this.context = context;

        this.addChildComponent(this.playButton);
        this.addChildComponent(this.stopButton);
        this.addChildComponent(this.tempoBox);

        this.playButton.onClick = () => this.context.playbackEngine.play();
        this.stopButton.onClick = () => this.context.playbackEngine.stop();

        this.tempoBox.valueToText = (value) => `${Math.round(value)} BPM`;
        this.tempoBox.valueMin = 20;
        this.tempoBox.valueMax = 600;
        this.tempoBox.value = 120;

        this.tempoBox.onChange = () => this.context.playbackEngine.setTempo(this.tempoBox.value);
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bounds = this.getLocalBounds();

        ctx.fillStyle = "oklch(98.5% 0.002 247.839)";
        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

        ctx.fillStyle = "oklch(55.1% 0.027 264.364)";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = "24px system-ui";
        ctx.fillText("Chordic", bounds.x + 8, bounds.getCenterY());
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
        const buttonWidth = 96;
        const buttonHeight = 32;
        const margin = 8;

        const totalWidth = 3 * buttonWidth + 2 * margin;
        const bounds = this.getLocalBounds().withSizeKeepingCenter(totalWidth, buttonHeight);

        this.playButton.setBounds(bounds.removeFromLeft(buttonWidth));
        bounds.removeFromLeft(margin);
        this.stopButton.setBounds(bounds.removeFromLeft(buttonWidth));
        bounds.removeFromLeft(margin);
        this.tempoBox.setBounds(bounds.removeFromLeft(buttonWidth));
    }
}