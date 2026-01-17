import { AudioEvent, InstrumentDetailsList } from "../../audio/audio-constants.js";
import { PlaybackEngine } from "../../audio/playback-engine.js";

export class InstrumentsSection {
    /** @type {PlaybackEngine} */
    playbackEngine;
    
    /** @type {HTMLButtonElement} */
    addInstrumentButton;

    /** @type {HTMLDivElement} */
    addInstrumentContents;

    /** @type {HTMLDivElement} */
    instrumentList;

    /**
     * @param {PlaybackEngine} playbackEngine 
     */
    constructor(playbackEngine) {
        this.playbackEngine = playbackEngine;
        this.addInstrumentButton = document.getElementById("add-instrument-button");
        this.addInstrumentContents = document.getElementById("add-instrument-contents");
        this.instrumentList = document.getElementById("instrument-list");
        this.addInstrumentButton.onclick = () => this.addInstrumentClicked();

        this.playbackEngine.addListener(AudioEvent.InstrumentsChanged, () => this.instrumentsChanged());
        this.playbackEngine.addListener(AudioEvent.InstrumentSelected, () => this.updateSelectedInstrument());
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

    instrumentsChanged() {
        console.log("instrumentChanged!", this.playbackEngine.instruments);

        this.instrumentList.replaceChildren();

        for (let i = 0; i < this.playbackEngine.instruments.length; i++) {
            const instrument = this.playbackEngine.instruments[i];

            const div = document.createElement("div");
            div.classList.add("instrument-section");
            div.innerHTML = instrument.name;
            div.onclick = (e) => this.instrumentClicked(e, i);

            this.instrumentList.appendChild(div);
        }

        this.updateSelectedInstrument();
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

    /**
     * @param {PointerEvent} e 
     * @param {number} index Instrument index
     */
    instrumentClicked(e, index) {
        this.playbackEngine.selectInstrument(index);
    }

    updateSelectedInstrument() {
        const childNodes = this.instrumentList.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
            const node = childNodes[i];
            if (i === this.playbackEngine.selectedInstrumentIndex) {
                node.classList.add("instrument-selected");
            }
            else {
                node.classList.remove("instrument-selected");
            }
        }
    }
}