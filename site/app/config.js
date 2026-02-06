const PITCH_MIN = 21;  // A0
const PITCH_MAX = 108; // C8
const NUM_PITCHES = PITCH_MAX - PITCH_MIN + 1;

const BASE_BEAT_WIDTH = 32;
const BASE_NOTE_HEIGHT = 20;
const BASE_LENGTH_IN_BEATS = 64;

export class Config {
    pitchMin = PITCH_MIN;
    pitchMax = PITCH_MAX;
    numPitches = NUM_PITCHES;

    beatWidth = BASE_BEAT_WIDTH;   // px
    noteHeight = BASE_NOTE_HEIGHT; // px
    lengthInBeats = BASE_LENGTH_IN_BEATS;

    zoomLevelX = 1;
    zoomLevelY = 1;

    /**
     * @type {(() => void)[]}
     */
    zoomListeners = [];

    constructor() {}

    /**
     * @param {Number} newZoomLevel 
     */
    setZoomLevelX(newZoomLevel) {
        this.zoomLevelX = newZoomLevel;

        this.beatWidth = Math.round(this.zoomLevelX * BASE_BEAT_WIDTH);
    }

    /**
     * @param {Number} newZoomLevel 
     */
    setZoomLevelY(newZoomLevel) {
        this.zoomLevelY = newZoomLevel;

        this.noteHeight = Math.round(this.zoomLevelY * BASE_NOTE_HEIGHT);
    }

    /**
     * @param {(() => void)} callback
     */
    addZoomListener(callback) {
        this.zoomListeners.push(callback);
    }

    /**
     * @param {(PlayHead) => void} callback 
     */
    removeZoomListener(callback) {
        const index = this.zoomListeners.findIndex((c) => c === callback);
        this.zoomListeners.splice(index, 1);
    }

    notifyZoomListeners() {
        for (const callback of this.zoomListeners) {
            callback();
        }
    }

    /**
     * @param {Number} noteNumber 
     * @returns `true` if MIDI note number corresponds to a black key
     */
    isBlackKey(noteNumber) {
        const pc = noteNumber % 12;
        return pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10;
    }

    calculateWidth() {
        return this.lengthInBeats * this.beatWidth;
    }

    calculateHeight() {
        return this.numPitches * this.noteHeight;
    }
}