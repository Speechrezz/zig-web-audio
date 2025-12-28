import { WorkletMessageType } from "./worklet-message.js";
import { getAudioContext, getAudioWorkletNode } from "./audio.js";

/**
 * @param {MidiEvent} midiEvent 
 * @param {BigInt} timeStampSeconds Time since start of the audio context (in seconds)
 */
export function sendMidiMessageSeconds(midiEvent, timeStampSeconds) {
    const sampleRate = getAudioContext().sampleRate;
    sendMidiMessageSamples(midiEvent, Math.floor(sampleRate * timeStampSeconds))
}

/**
 * @param {MidiEvent} midiEvent 
 * @param {BigInt} timeStampSamples Time since start of the audio context (in samples)
 */
export function sendMidiMessageSamples(midiEvent, timeStampSamples) {
    getAudioWorkletNode().port.postMessage({
        type: WorkletMessageType.midi,
        data: midiEvent.toPacked(),
        time: timeStampSamples,
    });
}

// MIDI Channel Voice event type nibbles
export const MidiEventType = Object.freeze({
    NoteOff: 0x8, // 0x8n
    NoteOn: 0x9, // 0x9n
    PolyAftertouch: 0xA, // 0xAn
    ControlChange: 0xB, // 0xBn
    ProgramChange: 0xC, // 0xCn (only 1 data byte)
    ChannelPressure: 0xD, // 0xDn (only 1 data byte)
    PitchBend: 0xE, // 0xEn (2 data bytes: LSB, MSB)
});

export class MidiEvent {
    /** @type {Number} */
    status;
    /** @type {Number} */
    d1;
    /** @type {Number} */
    d2;

    /**
     * @param {Number} status 
     * @param {Number} d1 
     * @param {Number} d2 
     */
    constructor(status, d1, d2) {
        this.status = status & 0xFF;
        this.d1 = d1 & 0x7F;
        this.d2 = d2 & 0x7F;
    }

    /**
     * Packs a MIDI Channel Voice message into a 32-bit unsigned integer:
     *   bits  0.. 7: status
     *   bits  8..15: data1
     *   bits 16..23: data2
     *   bits 24..31: 0
     *
     * @param {Number} eventTypeNibble - 0x8..0xE (e.g. MidiEventType.NoteOn)
     * @param {Number} noteNumberOrData1 - for note events: note number (0..127); otherwise data1
     * @param {Number} velocityOrData2 - for note events: velocity (0..127); otherwise data2 (or ignored for 1-data-byte types)
     * @param {Number} channel - 0..15 (MIDI channels 1..16 correspond to 0..15)
     * @returns packed 32-bit unsigned int
     */
    static newEvent(eventTypeNibble, noteNumberOrData1, velocityOrData2, channel) {
        const status = ((eventTypeNibble & 0x0F) << 4) | (channel & 0x0F);
        const data1 = noteNumberOrData1 & 0x7F;

        // Some message types only have one data byte (Program Change, Channel Pressure)
        const oneDataByte = (eventTypeNibble === 0xC || eventTypeNibble === 0xD);
        const data2 = oneDataByte ? 0 : (velocityOrData2 & 0x7F);

        return new MidiEvent(status, data1, data2);
    }

    /** Upper nibble of status byte (0x8..0xE) */
    getType() {
        return (this.status >> 4) & 0x0F;
    }

    /** Channel index (0..15) */
    getChannel() {
        return this.status & 0x0F;
    }

    isNoteOn() {
        return this.getType() === MidiEventType.NoteOn;
    }

    isNoteOff() {
        return this.getType() === MidiEventType.NoteOff;
    }

    isNoteOnOrOff() {
        return this.isNoteOn() || this.isNoteOff();
    }

    /** MIDI note number (0..127) */
    getNoteNumber() {
        return this.d1;
    }

    /** Velocity (0..127) */
    getVelocity() {
        return this.d2;
    }

    /** Returns packed 32-bit representation */
    toPacked() {
        return (this.status | (this.d1 << 8) | (this.d2 << 16)) >>> 0;
    }

    clone() {
        return {...this};
    }
}

/**
 * @param {MIDIMessageEvent} e 
 */
export function prettyLogMidiEvent(e) {
    const [status, data1, data2] = e.data;
    const cmd = status >> 4;
    const ch = (status & 0x0f) + 1;
    const timeStamp = `${e.timeStamp.toFixed(3)} ms`;

    if (cmd === 0x9 && data2 > 0) {
        console.log(`Note On  ch ${ch}  note ${data1}  vel ${data2}  (${timeStamp})`);
    } else if (cmd === 0x8 || (cmd === 0x9 && data2 === 0)) {
        console.log(`Note Off ch ${ch}  note ${data1}          (${timeStamp})`);
    } else if (cmd === 0xB) {
        console.log(`CC      ch ${ch}  cc ${data1}  val ${data2}    (${timeStamp})`);
    } else if (cmd === 0xE) {
        const value = (data2 << 7) | data1; // pitch bend 0..16383, center 8192
        console.log(`Pitch   ch ${ch}  value ${value}        (${timeStamp})`);
    } else {
        console.log(`Raw     ch ${ch}  [${Array.from(e.data)}]       (${timeStamp})`);
    }
}