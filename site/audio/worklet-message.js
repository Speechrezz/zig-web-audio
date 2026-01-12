/**
 * @readonly
 * @enum {string}
 */
export const WorkletMessageType = Object.freeze({
    // --MIDI--
    midi: "midi",
    stopAllNotes: "stopAllNotes",
    
    // --Instrument--
    addInstrument: "addInstrument",
    removeInstrument: "removeInstrument",
    clearInstruments: "clearInstruments",
});