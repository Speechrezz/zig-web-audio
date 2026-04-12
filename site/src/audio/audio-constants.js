/**
 * Enum of all processor kinds
 * @readonly
 * @enum {string}
 */
export const ProcessorKind = Object.freeze({
    SineSynth: "sineSynth",
    TriangleSynth: "triangleSynth",
    WavetableSynth: "wavetableSynth",
});

/**
 * @type {Readonly<Record<ProcessorKind, ProcessorDetails>>}
 * @readonly
 */
export const processorDetails = Object.freeze({
    [ProcessorKind.SineSynth]: {
        name: "Sine Synth",
    },
    [ProcessorKind.TriangleSynth]: {
        name: "Triangle Synth",
    },
    [ProcessorKind.WavetableSynth]: {
        name: "Wavetable Synth",
    },
});

/**
 * @readonly
 * @enum {number}
 */
export const AudioEvent = Object.freeze({
    PlayHead: 0,
    PlayStop: 1,
    MidiDeviceMessage: 2,
});
