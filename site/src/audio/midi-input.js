import { PlaybackEngine } from "./playback-engine.js";
import { prettyLogMidiEvent, MidiEvent } from "./midi.js";

export class MidiInput {
    /**
     * @type {MIDIAccess}
     */
    midiAccess;

    /**
     * @type {PlaybackEngine}
     */
    playbackEngine;

    debugPrintFlag = false;

    /**
     * @param {PlaybackEngine} playbackEngine 
     */
    constructor(playbackEngine) {
        this.playbackEngine = playbackEngine;

        if ('requestMIDIAccess' in navigator)
            navigator.requestMIDIAccess().then((midiAccess) => this.onMidiSuccess(midiAccess), (msg) => this.onMidiFailure(msg));
        else
            console.warn("[MidiInput] This browser does NOT support MIDI input.");
    }

    /**
     * @param {MIDIAccess} midiAccess 
     */
    onMidiSuccess(midiAccess) {
        console.log("[MidiInput] MIDI ready!");
        this.midiAccess = midiAccess;
        this.startLoggingMidiInput();
    }

    onMidiFailure(msg) {
        console.error(`[MidiInput] Failed to get MIDI access: ${msg}`);
    }

    startLoggingMidiInput() {
        this.midiAccess.inputs.forEach((entry) => {
            entry.onmidimessage = (e) => this.onMidiMessage(e);
        });
    }

    /**
     * @param {MIDIMessageEvent} e 
     */
    onMidiMessage(e) {
        const [status, data1, data2] = e.data;
        this.playbackEngine.sendMidiMessageFromDevice(new MidiEvent(status, data1, data2), e.timeStamp);

        if (this.debugPrintFlag) {
            prettyLogMidiEvent(e);
        }
    }
}