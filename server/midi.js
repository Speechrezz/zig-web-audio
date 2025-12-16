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
    console.log("adjustedTimeStamp:", adjustedTimeStamp);

    const [status, data1, data2] = e.data;
    audioWorkletNode.port.postMessage({
      type: "midi",
      data: packMidiEvent(status, data1, data2),
      time: adjustedTimeStamp,
    });
  }

  prettyLog(e);
}

/**
 * @param {number} timeStampMs 
 */
function midiTimestampToContextFrame(timeStampMs) {
  const audioContext = audioWorkletNode.context;

  const { performanceTime, contextTime } = audioContext.getOutputTimestamp();
  console.log("getOutputTimestamp():", { performanceTime, contextTime }, "timeStampMs:", timeStampMs);
  const eventCtxTimeSec = contextTime + (timeStampMs - performanceTime) * 1e-3;

  return Math.max(0, Math.floor(eventCtxTimeSec * audioContext.sampleRate));
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

function packMidiEvent(status, d1, d2) {
  const packed =
    ((d2 & 0xff) << 16) |
    ((d1 & 0xff) << 8)  |
    (status & 0xff);
  return packed;
}