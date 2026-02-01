import { AudioEvent, InstrumentDetailsList, InstrumentEvent } from "../../audio/audio-constants.js";
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

        this.context.instruments.addListener(InstrumentEvent.InstrumentsChanged, () => this.instrumentsChanged());
        this.context.instruments.addListener(InstrumentEvent.InstrumentSelected, () => this.updateSelectedInstrument());
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
        const instruments = this.context.instruments.getList();

        for (let i = 0; i < instruments.length; i++) {
            const instrument = instruments[i];

            const div = document.createElement("div");
            div.classList.add("instrument-section");
            div.onclick = (e) => this.instrumentClicked(e, i);

            const header = document.createElement("div");
            header.classList.add("instrument-section-header");

            const span = document.createElement("span");
            span.innerHTML = instrument.name;
            header.appendChild(span);

            const deleteButton = document.createElement("button");
            deleteButton.innerHTML = "x";
            deleteButton.onclick = (e) => this.deleteInstrumentClicked(e, i);
            header.appendChild(deleteButton);

            div.appendChild(header);

            const gainParam = instrument.paramMap.get("gain");
            const gain = document.createElement("input");
            gain.type = "range";
            gain.min = "0";
            gain.max = "1";
            gain.step = "any";
            gain.value = gainParam.state.value_normalized;
            gain.classList.add("slider");

            gain.oninput = (ev) => {
                gainParam.set(ev.target.value, true);
            }

            div.appendChild(gain);

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
        this.context.instruments.addInstrument(-1, instrumentType);
        this.addInstrumentContents.classList.remove("flex");
    }

    /**
     * @param {PointerEvent} e 
     * @param {number} index Instrument index
     */
    instrumentClicked(e, index) {
        if (e.target.tagName === "BUTTON") return;
        if (e.target.tagName === "INPUT") return;

        this.context.instruments.selectInstrument(index);
    }

    /**
     * @param {PointerEvent} e 
     * @param {number} index Instrument index
     */
    deleteInstrumentClicked(e, index) {
        this.context.instruments.removeInstrument(index);
    }

    updateSelectedInstrument() {
        const childNodes = this.instrumentList.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
            const node = childNodes[i];
            if (i === this.context.instruments.selectedIndex) {
                node.classList.add("instrument-selected");
            }
            else {
                node.classList.remove("instrument-selected");
            }
        }
    }
}