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
    removeTrack: "removeInstrument",
    clearTracks: "clearInstruments",

    // --Parameter--
    setParameterValue: "setParameter",
});