import { AudioEvent, InstrumentDetailsList } from "../../audio/audio-constants.js";
import { AppContext } from "../app-context.js";

export class InstrumentsSection {
    /** @type {AppContext} */
    context;    
    
    /** @type {HTMLButtonElement} */
    addInstrumentButton;

    /** @type {HTMLDivElement} */
    addInstrumentContents;

    /** @type {HTMLDivElement} */
    instrumentList;

    /**
     * @param {AppContext} context 
     */
    constructor(context) {
        this.context = context;
        this.addInstrumentButton = document.getElementById("add-instrument-button");
        this.addInstrumentContents = document.getElementById("add-instrument-contents");
        this.instrumentList = document.getElementById("instrument-list");
        this.addInstrumentButton.onclick = () => this.addInstrumentClicked();

        this.context.playbackEngine.addListener(AudioEvent.InstrumentsChanged, () => this.instrumentsChanged());
        this.context.playbackEngine.addListener(AudioEvent.InstrumentSelected, () => this.updateSelectedInstrument());
        window.addEventListener("pointerdown", (e) => this.windowClicked(e));

        this.initializeDropdown();
        this.instrumentsChanged();
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
        this.instrumentList.replaceChildren();

        for (let i = 0; i < this.context.playbackEngine.instruments.length; i++) {
            const instrument = this.context.playbackEngine.instruments[i];

            const div = document.createElement("div");
            div.classList.add("instrument-section");
            div.onclick = (e) => this.instrumentClicked(e, i);

            const span = document.createElement("span");
            span.innerHTML = instrument.name;
            div.appendChild(span);

            const deleteButton = document.createElement("button");
            deleteButton.innerHTML = "x";
            deleteButton.onclick = (e) => this.deleteInstrumentClicked(e, i);
            div.appendChild(deleteButton);

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
        this.context.playbackEngine.addInstrument(instrumentType);
        this.addInstrumentContents.classList.remove("flex");
    }

    /**
     * @param {PointerEvent} e 
     * @param {number} index Instrument index
     */
    instrumentClicked(e, index) {
        if (e.target.tagName === "BUTTON") return;

        this.context.playbackEngine.selectInstrument(index);
    }

    /**
     * @param {PointerEvent} e 
     * @param {number} index Instrument index
     */
    deleteInstrumentClicked(e, index) {
        this.context.playbackEngine.removeInstrument(index);
    }

    updateSelectedInstrument() {
        const childNodes = this.instrumentList.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
            const node = childNodes[i];
            if (i === this.context.playbackEngine.selectedInstrumentIndex) {
                node.classList.add("instrument-selected");
            }
            else {
                node.classList.remove("instrument-selected");
            }
        }
    }
}