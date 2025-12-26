import { WorkletMessageType } from "./worklet-message.js";
import { getAudioContext, getAudioWorkletNode } from "./audio.js";

/**
 * @param {*} packedEvent 
 * @param {BigInt} timeStampSeconds Time since start of the audio context (in seconds)
 */
export function sendMidiMessageSeconds(packedEvent, timeStampSeconds) {
    const sampleRate = getAudioContext().sampleRate;
    sendMidiMessageSamples(packedEvent, Math.floor(sampleRate * timeStampSeconds))
}

/**
 * @param {*} packedEvent 
 * @param {BigInt} timeStampSamples Time since start of the audio context (in samples)
 */
export function sendMidiMessageSamples(packedEvent, timeStampSamples) {
    getAudioWorkletNode().port.postMessage({
        type: WorkletMessageType.midi,
        data: packedEvent,
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

/**
 * Packs a MIDI Channel Voice message into a 32-bit unsigned integer:
 *   bits  0.. 7: status
 *   bits  8..15: data1
 *   bits 16..23: data2
 *   bits 24..31: 0
 *
 * @param {number} eventTypeNibble - 0x8..0xE (e.g. MidiEventType.NoteOn)
 * @param {number} noteNumberOrData1 - for note events: note number (0..127); otherwise data1
 * @param {number} velocityOrData2 - for note events: velocity (0..127); otherwise data2 (or ignored for 1-data-byte types)
 * @param {number} channel - 0..15 (MIDI channels 1..16 correspond to 0..15)
 * @returns {number} packed 32-bit unsigned int
 */
export function packMidiEvent(eventTypeNibble, noteNumberOrData1, velocityOrData2, channel) {
    // Basic validation / clamping to MIDI bit-widths
    if (!Number.isInteger(eventTypeNibble) || eventTypeNibble < 0x8 || eventTypeNibble > 0xE) {
        throw new RangeError("eventTypeNibble must be an integer 0x8..0xE (Channel Voice).");
    }
    if (!Number.isInteger(channel) || channel < 0 || channel > 15) {
        throw new RangeError("channel must be 0..15.");
    }

    const status = ((eventTypeNibble & 0x0F) << 4) | (channel & 0x0F);

    const data1 = noteNumberOrData1 & 0x7F;

    // Some message types only have one data byte (Program Change, Channel Pressure)
    const oneDataByte = (eventTypeNibble === 0xC || eventTypeNibble === 0xD);

    const data2 = oneDataByte ? 0 : (velocityOrData2 & 0x7F);

    // Pack as status | (data1<<8) | (data2<<16)
    return (status | (data1 << 8) | (data2 << 16)) >>> 0; // >>>0 forces unsigned
}

/**
 * Combines MIDI event data into a single Number
 * @param {Number} status 
 * @param {Number} d1 
 * @param {Number} d2 
 * @returns Packed event
 */
export function repackMidiEvent(status, d1, d2) {
    const packed =
        ((d2 & 0xff) << 16) |
        ((d1 & 0xff) << 8) |
        (status & 0xff);
    return packed;
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