import { InstrumentDetailsList } from "../../audio/audio-constants.js";
import { PlaybackEngine } from "../../audio/playback-engine.js";

export class InstrumentsSection {
    /** @type {PlaybackEngine} */
    playbackEngine;
    
    /** @type {HTMLButtonElement} */
    addInstrumentButton;

    /** @type {HTMLDivElement} */
    addInstrumentContents;

    /**
     * @param {PlaybackEngine} playbackEngine 
     */
    constructor(playbackEngine) {
        this.playbackEngine = playbackEngine;
        this.addInstrumentButton = document.getElementById("add-instrument-button");
        this.addInstrumentContents = document.getElementById("add-instrument-contents");
        this.addInstrumentButton.onclick = () => this.addInstrumentClicked();

        window.addEventListener("pointerdown", (e) => this.windowClicked(e));

        this.initializeDropdown();
    }

    initializeDropdown() {
        for (let i = 0; i < InstrumentDetailsList.length; i++)
        {
            const instrumentDetails = InstrumentDetailsList[i];
            
            const button = document.createElement("button");
            button.classList.add("dropdown-item");
            button.innerHTML = instrumentDetails.name;
            button.onclick = (e) => this.instrumentDropdownItemClicked(e, i);
            
            const div = document.createElement("div");
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
     * @param {number} instrumentType
     */
    instrumentDropdownItemClicked(e, instrumentType) {
        this.playbackEngine.addInstrument(instrumentType);
        this.addInstrumentContents.classList.remove("flex");
    }
}