/**
 * @readonly
 * @enum {number}
 */
export const InstrumentType = Object.freeze({
    SineSynth: 0,
    TriangleSynth: 1,
    WavetableSynth: 2,
});

/**
 * @readonly
 */
export const InstrumentDetailsList = Object.freeze([
    { name: "Sine Synth" },
    { name: "Triangle Synth" },
    { name: "Wavetable Synth" },
]);

/**
 * @readonly
 * @enum {number}
 */
export const AudioEvent = Object.freeze({
    PlayHead: 0,
    PlayStop: 1,
    MidiDeviceMessage: 2,
});

/**
 * @readonly
 * @enum
 */
export const InstrumentEvent = Object.freeze({
    InstrumentsChanged: 0,
    InstrumentSelected: 1,
});