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

        navigator.requestMIDIAccess().then((midiAccess) => this.onMidiSuccess(midiAccess), (msg) => this.onMidiFailure(msg));
    }

    /**
     * @param {MIDIAccess} midiAccess 
     */
    onMidiSuccess(midiAccess) {
        console.log("MIDI ready!");
        this.midiAccess = midiAccess;
        this.startLoggingMidiInput();
    }

    onMidiFailure(msg) {
        console.error(`Failed to get MIDI access: ${msg}`);
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