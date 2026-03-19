/**
 * @readonly
 * @enum {string}
 */
export const WorkletMessageType = Object.freeze({
    // --MIDI--
    midi: "midi",
    stopAllNotes: "stopAllNotes",
    
    // --Track--
    addInstrument: "addInstrument",
    removeTrack: "removeInstrument",
    clearTracks: "clearInstruments",
    saveTrackState: "saveTrackState",

    // --Parameter--
    setParameterValueNormalized: "setParameter",
});