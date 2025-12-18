/**
 * @global
 * @type {MIDIAccess | null}
 */
let midi = null; // global MIDIAccess object

/**
 * @global
 * @type {AudioWorkletNode | null}
 */
let audioWorkletNode = null;

export const BLOCK_SIZE = 128;

/**
 * @param {AudioWorkletNode} workletNode 
 */
export function initializeMIDI(workletNode) {
  audioWorkletNode = workletNode;
  navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
}

/**
 * @param {MIDIAccess} midiAccess 
 */
function onMIDISuccess(midiAccess) {
  console.log("MIDI ready!");
  midi = midiAccess; // store in the global (in real usage, would probably keep in an object instance)
  startLoggingMIDIInput(midi);
}

function onMIDIFailure(msg) {
  console.error(`Failed to get MIDI access - ${msg}`);
}

/**
 * @param {MIDIAccess} midiAccess 
 */
function startLoggingMIDIInput(midiAccess) {
  midiAccess.inputs.forEach((entry) => {
    entry.onmidimessage = onMIDIMessage;
  });
}

/**
 * @param {MIDIMessageEvent} e 
 */
function onMIDIMessage(e) {
  if (audioWorkletNode.context.state === "running") {
    const adjustedTimeStamp = midiTimestampToContextFrame(e.timeStamp);

    const [status, data1, data2] = e.data;
    sendMidiMessageSamples(repackMidiEvent(status, data1, data2), adjustedTimeStamp);
  }

  //prettyLog(e);
}

/**
 * 
 * @param {*} packedEvent 
 * @param {BigInt} timeStampSeconds Time since start of the audio context (in seconds)
 */
export function sendMidiMessageSeconds(packedEvent, timeStampSeconds) {
  const sampleRate = audioWorkletNode.context.sampleRate;
  sendMidiMessageSamples(packedEvent, Math.floor(sampleRate * timeStampSeconds))
}

/**
 * 
 * @param {*} packedEvent 
 * @param {BigInt} timeStampSamples Time since start of the audio context (in samples)
 */
export function sendMidiMessageSamples(packedEvent, timeStampSamples) {
  audioWorkletNode.port.postMessage({
    type: "midi",
    data: packedEvent,
    time: timeStampSamples,
  });
}

/**
 * @param {number} timeStampMs 
 */
function midiTimestampToContextFrame(timeStampMs) {
  const audioContext = audioWorkletNode.context;

  const { performanceTime, contextTime } = audioContext.getOutputTimestamp();
  const eventCtxTimeSec = contextTime + (timeStampMs - performanceTime) * 1e-3;

  return Math.max(0, BLOCK_SIZE + Math.floor(eventCtxTimeSec * audioContext.sampleRate));
}

export function getContextTime() {
  const audioContext = audioWorkletNode.context;
  const { performanceTime, contextTime } = audioContext.getOutputTimestamp();
  return contextTime + BLOCK_SIZE / audioContext.sampleRate;
}

// MIDI Channel Voice event type nibbles
export const MidiEventType = Object.freeze({
  NoteOff:        0x8, // 0x8n
  NoteOn:         0x9, // 0x9n
  PolyAftertouch: 0xA, // 0xAn
  ControlChange:  0xB, // 0xBn
  ProgramChange:  0xC, // 0xCn (only 1 data byte)
  ChannelPressure:0xD, // 0xDn (only 1 data byte)
  PitchBend:      0xE, // 0xEn (2 data bytes: LSB, MSB)
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
 * @param {MIDIMessageEvent} e 
 */
function prettyLog(e) {
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

// layout per event: [status, data1, data2, frameOffset]

function repackMidiEvent(status, d1, d2) {
  const packed =
    ((d2 & 0xff) << 16) |
    ((d1 & 0xff) << 8)  |
    (status & 0xff);
  return packed;
}