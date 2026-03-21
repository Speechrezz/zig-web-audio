import { AppContext } from "../../../app/app-context.js";
import { AudioEvent } from "../../../audio/audio-constants.js";
import { postWorkletMessage } from "../../../audio/audio.js";
import { WorkletMessageType } from "../../../audio/worklet-message.js";
import { Component } from "../../framework/component.js";
import { Button } from "../../framework/components/button.js";
import { NumberBox } from "../../framework/components/number-box.js";
import { MouseAction, MouseActionPolicy } from "../../framework/mouse-event.js";

export class HeaderSection extends Component {
    /** @type {AppContext} */
    context;

    playButton = new Button("Play");
    stopButton = new Button("Stop");
    tempoBox = new NumberBox;

    saveButton = new Button("Save"); // TEMP

    /**
     * @param {AppContext} context 
     */
    constructor(context) {
        super();
        this.context = context;

        this.addChildComponent(this.playButton);
        this.addChildComponent(this.stopButton);
        this.addChildComponent(this.saveButton);
        this.addChildComponent(this.tempoBox);

        this.playButton.onClick = () => this.context.playbackEngine.playPause();
        this.stopButton.onClick = () => this.context.playbackEngine.stop();
        this.saveButton.onClick = () => {
            postWorkletMessage({type: WorkletMessageType.saveState}); 
        };

        this.context.playbackEngine.addListener(AudioEvent.PlayStop, () => {
            const isPlaying = this.context.playbackEngine.playHead.isPlaying
            this.playButton.setName(isPlaying ? "Pause" : "Play");
        });

        this.initTempoBox();
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
        ctx.font = "600 24px system-ui";
        ctx.fillText("Chordic", bounds.x + 8, bounds.getCenterY());

        ctx.strokeStyle = "oklch(87.2% 0.01 258.338)";
        ctx.beginPath();
        ctx.moveTo(0, bounds.getBottom() - 0.5);
        ctx.lineTo(bounds.getRight(), bounds.getBottom() - 0.5);
        ctx.stroke();
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
        const centerBounds = this.getLocalBounds().withSizeKeepingCenter(totalWidth, buttonHeight);

        this.playButton.setBounds(centerBounds.removeFromLeft(buttonWidth));
        centerBounds.removeFromLeft(margin);
        this.stopButton.setBounds(centerBounds.removeFromLeft(buttonWidth));
        centerBounds.removeFromLeft(margin);
        this.tempoBox.setBounds(centerBounds.removeFromLeft(buttonWidth));

        const rightBounds = this.getLocalBounds().removeFromRight(200).withSizeKeepingCenter(200, buttonHeight);
        rightBounds.removeFromRight(16);
        this.saveButton.setBounds(rightBounds.removeFromRight(buttonWidth));
    }

    initTempoBox() {
        const proxy = this.tempoBox.proxy;

        proxy.textFromValue = (value) => `${Math.round(value)} BPM`;
        proxy.valueMin = 60;
        proxy.valueMax = 600;
        proxy.value = 120;
        proxy.valueNormalized = proxy.toNormalizedValue(120);
        proxy.valueDefault = 120;

        proxy.setValue = (value) => {
            value = Math.round(value);
            proxy.setValueInternal(value);
        }

        proxy.setNormalizedValue = (value) => {
            proxy.value = Math.round(proxy.fromNormalizedValue(value));
            proxy.valueNormalized = proxy.toNormalizedValue(proxy.value);
            proxy.onValueChange();
        }

        this.tempoBox.dragCoefficient *= 0.2;
        this.tempoBox.scrollWheelScale *= 0.05;
        this.tempoBox.onChange = () => this.context.playbackEngine.setTempo(this.tempoBox.proxy.value);
    }
}