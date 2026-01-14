import { InstrumentTypes } from "../../audio/audio-constants.js";
import { PlaybackEngine } from "../../audio/playback-engine.js";

export class InstrumentsSection {
    /** @type {PlaybackEngine} */
    playbackEngine;
    
    /** @type {HTMLButtonElement} */
    addInstrumentButton;

    /** @type {HTMLDivElement} */
    addInstrumentContents;

    constructor() {
        this.addInstrumentButton = document.getElementById("add-instrument-button");
        this.addInstrumentContents = document.getElementById("add-instrument-contents");
        this.addInstrumentButton.onclick = () => this.addInstrumentClicked();

        window.addEventListener("pointerdown", (e) => this.windowClicked(e));

        for (const key in InstrumentTypes) {
            /** @type {InstrumentType} */
            const instrumentType = InstrumentTypes[key];

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
     * @param {string} instrumentKey
     */
    instrumentDropdownItemClicked(e, instrumentKey) {
        this.playbackEngine.addInstrument(instrumentKey);
        this.addInstrumentContents.classList.remove("flex");
    }
}