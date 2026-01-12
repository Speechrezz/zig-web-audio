import { getAudioWorkletNode } from "../../audio/audio.js";
import { WorkletMessageType } from "../../audio/worklet-message.js";

export const InstrumentType = Object.freeze({
    SineSynth: {id: 1, name: "Sine Synth"},
    SawSynth: {id: 2, name: "Saw Synth"},
    DrumPad: {id: 3, name: "Drum Pad"},
});

export class InstrumentsSection {
    /** @type {HTMLButtonElement} */
    addInstrumentButton;

    /** @type {HTMLDivElement} */
    addInstrumentContents;

    constructor() {
        this.addInstrumentButton = document.getElementById("add-instrument-button");
        this.addInstrumentContents = document.getElementById("add-instrument-contents");
        this.addInstrumentButton.onclick = () => this.addInstrumentClicked();

        window.addEventListener("pointerdown", (e) => this.windowClicked(e));

        for (const instrumentType of Object.values(InstrumentType)) {
            const button = document.createElement('button');
            button.classList.add("dropdown-item");
            button.innerHTML = instrumentType.name;
            button.onclick = (e) => this.instrumentDropdownItemClicked(e, instrumentType.id);
            
            const div = document.createElement('div');
            div.appendChild(button);

            this.addInstrumentContents.appendChild(div);
        }
    }

    addInstrumentClicked() {
        this.addInstrumentContents.classList.toggle("flex");
    }

    /**
     * @param {PointerEvent} e 
     */
    windowClicked(e) {
        if (e.target === this.addInstrumentButton) return;
        if (this.addInstrumentContents.contains(e.target)) return;
        
        this.addInstrumentContents.classList.remove("flex");
    }

    /**
     * @param {PointerEvent} e 
     * @param {number} instrumentId
     */
    instrumentDropdownItemClicked(e, instrumentId) {
        sendAddInstrument(instrumentId);
        this.addInstrumentContents.classList.remove("flex");
    }
}

/**
 * @param {number} instrumentId 
 */
export function sendAddInstrument(instrumentId) {
    getAudioWorkletNode().port.postMessage({
        type: WorkletMessageType.addInstrument,
        instrumentId: instrumentId,
    });
}