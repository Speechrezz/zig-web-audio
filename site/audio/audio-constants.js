/**
 * @readonly
 * @enum {number}
 */
export const InstrumentType = Object.freeze({
    SineSynth: 0,
    SawSynth: 1,
});

/**
 * @readonly
 */
export const InstrumentDetailsList = Object.freeze([
    { name: "Sine Synth" },
    { name: "Saw Synth" },
]);

/**
 * @readonly
 * @enum {number}
 */
export const AudioEvent = Object.freeze({
    PlayHead: 0,
    InstrumentsChanged: 1,
    InstrumentSelected: 2,
});