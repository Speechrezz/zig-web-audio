import { AppContext } from "../../../app/app-context.js";
import { InstrumentEvent } from "../../../audio/audio-constants.js";
import { Component } from "../../framework/component.js";
import { DeviceWrapper } from "./device-wrapper.js";

export class DevicePanelSection extends Component {
    /** @type {AppContext} */
    context;

    /** @type {DeviceWrapper[]} */
    deviceList = [];

    /**
     * @param {AppContext} context 
     */
    constructor(context) {
        super();
        this.context = context;

        this.context.instruments.addListener(InstrumentEvent.InstrumentSelected, () => this.instrumentSelected());
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bounds = this.getLocalBounds();
        const selectedInstrument = this.context.instruments.getSelected();

        ctx.fillStyle = "oklch(96.7% 0.003 264.542)";
        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

        ctx.fillStyle = "oklch(70.7% 0.022 261.325)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "24px system-ui";
        ctx.fillText(selectedInstrument ? "TODO: Device Panel" : "No instrument selected...", bounds.getCenterX(), bounds.getCenterY());

        ctx.strokeStyle = "oklch(87.2% 0.01 258.338)";
        ctx.beginPath();
        ctx.moveTo(0, bounds.y + 0.5);
        ctx.lineTo(bounds.getRight(), bounds.y + 0.5);
        ctx.stroke();
    }

    resized() {
        this.updateDeviceBounds();
        this.repaint();
    }

    instrumentSelected() {
        for (const device of this.deviceList)
            this.removeChildComponent(device);
        this.deviceList.length = 0;

        const selectedInstrument = this.context.instruments.getSelected();
        if (selectedInstrument) {
            const device = new DeviceWrapper(this.context);
            device.setName(selectedInstrument.name);
            this.addChildComponent(device);

            this.deviceList.push(device);
        }

        this.updateDeviceBounds();
        this.repaint();
    }

    updateDeviceBounds() {
        const bounds = this.getLocalBounds();
        bounds.reduce(8, 8);
        
        for (const device of this.deviceList) {
            device.setBounds(bounds.removeFromLeft(320));
            bounds.removeFromLeft(8);
        }
    }
}