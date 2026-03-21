/**
 * @readonly
 * @enum {string}
 */
export const WorkletMessageType = Object.freeze({
    // --MIDI--
    midi: "midi",
    stopAllNotes: "stopAllNotes",

    // --Global--
    saveState: "saveState",
    loadState: "loadState",
    
    // --Track--
    addInstrument: "addInstrument",
    removeTrack: "removeInstrument",
    clearTracks: "clearInstruments",
    saveTrackState: "saveTrackState",
    loadTrackState: "loadTrackState",

    // --Parameter--
    setParameterValueNormalized: "setParameter",
});