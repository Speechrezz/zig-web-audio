import { AppContext } from "../../../app/app-context.js";
import { Device } from "../../../audio/device.js";
import { Component } from "../../framework/component.js";
import { Knob } from "../../framework/components/knob.js";
import { Rectangle } from "../../framework/rectangle.js";

export class DeviceWrapper extends Component {
    /** @type {AppContext} */
    context;

    /** @type {Device} */
    device;

    /** @type {Knob[]} */
    knobs = [];

    headerBounds = new Rectangle;
    deviceBounds = new Rectangle;

    /**
     * @param {AppContext} context 
     * @param {Device} device 
     */
    constructor(context, device) {
        super();

        this.context = context;
        this.device = device;

        for (const param of this.device.params.list) {
            const knob = new Knob;
            knob.attach(param);
            this.addChildComponent(knob);
            this.knobs.push(knob);
        }
    }

    deinit() {
        for (const knob of this.knobs) {
            knob.deinit();
        }
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const bounds = this.getLocalBounds();

        ctx.fillStyle = "oklch(98.5% 0.002 247.839)";
        ctx.beginPath();
        ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 4);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.roundRect(this.headerBounds.x, this.headerBounds.y, this.headerBounds.width, this.headerBounds.height, [4, 0, 0, 4]);
        ctx.fill();

        ctx.save();
        ctx.translate(this.headerBounds.getCenterX(), this.headerBounds.getCenterY());
        ctx.rotate(-Math.PI / 2);

        ctx.fillStyle = "oklch(44.6% 0.03 256.802)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "16px system-ui";
        ctx.fillText(this.device.spec.name, 0, 0);

        ctx.restore();

        ctx.strokeStyle = "oklch(87.2% 0.01 258.338)";
        ctx.beginPath();
        ctx.moveTo(this.headerBounds.getRight(), this.headerBounds.y);
        ctx.lineTo(this.headerBounds.getRight(), this.headerBounds.getBottom());
        ctx.stroke();

        ctx.fillStyle = "oklch(44.6% 0.03 256.802)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "16px system-ui";
        ctx.fillText("TODO: Parameters go here", this.deviceBounds.getCenterX(), this.deviceBounds.getCenterY());

        bounds.reduce(0.5, 0.5);
        ctx.strokeStyle = "oklch(87.2% 0.01 258.338)";
        ctx.beginPath();
        ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 4);
        ctx.stroke();
    }

    resized() {
        const bounds = this.getLocalBounds();

        this.headerBounds = bounds.removeFromLeft(32);
        this.deviceBounds = bounds;

        const knobWidth = 64;
        const knobHeight = knobWidth + 16;
        const knobBounds = this.deviceBounds.clone().removeFromTop(knobHeight);

        for (const knob of this.knobs) {
            knob.setBounds(knobBounds.removeFromLeft(knobWidth).withSizeKeepingCenter(knobWidth - 8, knobHeight - 8));
        }
    }
}