import { Config } from "../app/config.js";
import { Track, TracksContainer } from "./track.js";
import { sendMidiMessageSeconds, sendMidiMessageSamples, sendStopAllNotes, MidiEventType, MidiEvent } from "./midi.js"
import { getAudioContext, getContextTime, getBlockSize, isAudioContextRunning, toAudibleTime } from "./audio.js"
import { AudioEvent } from "./audio-constants.js";
import { Note, NoteEvent } from "./note.js";
import { MoreMath } from "../core/math.js";

export class PlayHead {
    /** @type {Config} */
    config;

    // ---Project info---
    bpm = 120;
    isPlaying = false;

    // ---Position info---
    positionInBeats = 0;      // Current PlayHead position
    timePassedSec = 0;        // Time since started playing
    timePassedSteps = 0;      // Steps since started playing
    contextTimeStart = 0;     // Audio context time when started playing
    startPositionInBeats = 0; // Position where PlayHead should start playing

    // ---Internal info used by PlaybackEngine---
    timePerStepSec = 1 / 60.0;
    anchorInSec = 0;
    anchorInBeats = 0;

    /**
     * @param {Config} config 
     */
    constructor(config) {
        this.config = config;
    }

    /**
     * @param {number} timePassedSec 
     * @returns 
     */
    getPositionInBeats(timePassedSec) {
        const deltaTimeSec = timePassedSec - this.anchorInSec;
        return (this.anchorInBeats + this.secondsToBeats(deltaTimeSec)) % this.config.lengthInBeats;
    }

    /**
     * @returns {number} Time since audio context started in seconds
     */
    getContextTimeSec() {
        return this.contextTimeStart + this.timePassedSec;
    }

    /**
     * @param {number} beats Number of beats
     * @returns {number} Time in seconds
     */
    beatsToSeconds(beats) {
        return beats * 60.0 / this.bpm;
    }

    /**
     * @param {number} seconds Time in seconds
     * @returns {number} Number of beats
     */
    secondsToBeats(seconds) {
        return seconds * this.bpm / 60.0;
    }

    getBeatsPerStep() {
        return this.secondsToBeats(this.timePerStepSec);
    }
}

export class PlaybackEngine {
    /** @type {Config} */
    config;

    /** @type {PlayHead} */
    playHead;

    /** @type {TracksContainer} */
    tracks;

    /** @type {(() => void)[][]} */
    audioEventListeners = [];

    /**
     * Helps mitigate jitter
     */
    lookAheadSec = 0.1;


    /**
     * @param {Config} config 
     * @param {TracksContainer} tracks 
     */
    constructor(config, tracks) {
        this.config = config;
        this.playHead = new PlayHead(config);
        this.tracks = tracks;

        // Initialize listeners list
        for (const key of Object.keys(AudioEvent)) {
            this.audioEventListeners.push([]);
        }
    }

    /**
     * @param {AudioEvent} eventType 
     * @param {() => void} callback 
     */
    addListener(eventType, callback) {
        this.audioEventListeners[eventType].push(callback);
    }

    /**
     * @param {AudioEvent} eventType 
     * @param {() => void} callback 
     */
    removeListener(eventType, callback) {
        const listeners = this.audioEventListeners[eventType];
        const index = listeners.indexOf(callback);
        listeners.splice(index, 1);
    }

    /**
     * @param {AudioEvent} eventType 
     */
    notifyListeners(eventType) {
        const listeners = this.audioEventListeners[eventType];
        for (const callback of listeners) {
            callback();
        }
    }

    /**
     * @param {number} bpm 
     */
    setTempo(bpm) {
        bpm = MoreMath.clamp(bpm, 60, 600);
        if (bpm === this.playHead.bpm) return;

        this.playHead.anchorInSec = this.playHead.timePassedSec;
        this.playHead.anchorInBeats = this.playHead.positionInBeats;

        this.playHead.bpm = bpm;
    }

    /**
     * @param {number} positionInBeats 
     * @param {boolean} shouldQuantize 
     */
    setPlayHeadPosition(positionInBeats, shouldQuantize = true) {
        const playHead = this.playHead;

        let positionInPpq;
        if (shouldQuantize)
            positionInPpq = this.config.roundBeatsToNearestSnapPpq(positionInBeats);
        else
            positionInPpq = this.config.beatsToPpq(positionInBeats);

        positionInPpq = Math.min(Math.max(positionInPpq, 0), this.config.lengthInPpq);
        positionInBeats = this.config.ppqToBeats(positionInPpq);

        if (playHead.positionInBeats === positionInBeats) return;

        playHead.positionInBeats = positionInBeats;
        playHead.startPositionInBeats = positionInBeats;

        if (playHead.isPlaying) {
            playHead.anchorInSec = playHead.timePassedSec;
            playHead.anchorInBeats = playHead.positionInBeats;
            this.sendStopAllNotes();
        }

        this.notifyListeners(AudioEvent.PlayHead);
    }

    play() {
        const playHead = this.playHead;
        if (playHead.isPlaying) return;

        playHead.timePassedSec   = 0;
        playHead.timePassedSteps = 0;
        playHead.anchorInBeats   = playHead.positionInBeats;
        playHead.anchorInSec     = 0;
        playHead.contextTimeStart = getContextTime();
        playHead.isPlaying = true;
        this.notifyListeners(AudioEvent.PlayStop);

        this.timer = setInterval(() => this.step(), playHead.timePerStepSec * 1e3);
        this.step();
    }

    pause() {
        this.playHead.isPlaying = false;

        this.sendStopAllNotes();
        clearInterval(this.timer);
        this.notifyListeners(AudioEvent.PlayHead);
        this.notifyListeners(AudioEvent.PlayStop);
    }

    /**
     * Toggles play/pause states.
     * @returns `true` if now playing.
     */
    playPause() {
        if (this.playHead.isPlaying) {
            this.pause();
            return false;
        }
        
        this.play();
        return true;
    }

    stop() {
        const playHead = this.playHead;

        const shouldResetPosition = playHead.positionInBeats === playHead.startPositionInBeats;
        if (shouldResetPosition)
            playHead.startPositionInBeats = 0;

        playHead.positionInBeats = playHead.startPositionInBeats;
        playHead.timePassedSec   = 0;
        playHead.timePassedSteps = 0;
        playHead.anchorInBeats   = playHead.positionInBeats;
        playHead.anchorInSec     = 0;
        playHead.isPlaying = false;

        this.sendStopAllNotes();
        clearInterval(this.timer);
        this.notifyListeners(AudioEvent.PlayHead);
        this.notifyListeners(AudioEvent.PlayStop);
    }

    /**
     * Toggles play/stop states.
     * @returns `true` if now playing.
     */
    playStop() {
        if (this.playHead.isPlaying) {
            this.stop();
            return false;
        }
        
        this.play();
        return true;
    }

    step() {
        const playHead = this.playHead;
        
        const nextTimePassedSec = getContextTime() - playHead.contextTimeStart
        const nextPositionInBeats = playHead.getPositionInBeats(nextTimePassedSec);

        const positionInPpq = this.config.beatsToPpqPrecise(playHead.positionInBeats);
        const nextPositionInPpq = this.config.beatsToPpqPrecise(nextPositionInBeats);

        for (const track of this.tracks.getList()) {
            const noteStartEvents = this.getNoteStartInInterval(track, positionInPpq, nextPositionInPpq);
            const noteEvents = this.getNoteStopInInterval(track, positionInPpq, nextPositionInPpq);
            noteEvents.push(...noteStartEvents);
            noteEvents.sort((a, b) => a.timestampPpq - b.timestampPpq); // Ascending

            for (const noteEvent of noteEvents) {
                this.sendNoteEvent(track, noteEvent);
            }
        }

        this.notifyListeners(AudioEvent.PlayHead);
        
        playHead.positionInBeats = nextPositionInBeats;
        playHead.timePassedSec = nextTimePassedSec;
    }

    sendStopAllNotes() {
        for (const track of this.tracks.getList()) {
            track.activeNotes.length = 0;
            track.queuedNoteEvents.length = 0;
        }

        sendStopAllNotes();
    }

    /**
     * @param {Track} track 
     * @param {NoteEvent} noteEvent 
     */
    sendNoteEvent(track, noteEvent) {
        const playHeadTimeSec = this.playHead.getContextTimeSec() + this.lookAheadSec;

        const beatOffset = this.config.ppqToBeats(noteEvent.timestampPpq) - this.playHead.positionInBeats;
        const eventTimeSec = playHeadTimeSec + this.playHead.beatsToSeconds(beatOffset);

        let midiEvent;
        if (noteEvent.isNoteOn) {
            midiEvent = MidiEvent.newNote(MidiEventType.NoteOn, noteEvent.noteNumber, NoteEvent.getMidiVelocity(noteEvent), noteEvent.channel);
            track.noteStart(noteEvent.noteNumber, noteEvent.channel);
        } 
        else {
            midiEvent = MidiEvent.newNote(MidiEventType.NoteOff, noteEvent.noteNumber, NoteEvent.getMidiVelocity(noteEvent), noteEvent.channel);
            track.noteStop(noteEvent.noteNumber, noteEvent.channel);
        }

        sendMidiMessageSeconds(track.index, midiEvent, eventTimeSec);
    }

    /**
     * @param {Track} track 
     * @param {number} ppqStart 
     * @param {number} ppqEnd 
     * @returns {NoteEvent[]}
     */
    getNoteStartInInterval(track, ppqStart, ppqEnd) {
        /**
         * @type {NoteEvent[]}
         */
        let noteEvents = [];

        const lengthInPpq = this.config.lengthInPpq;
        const notes = track.notes;
        const queuedEvents = track.queuedNoteEvents;

        for (const note of notes) {
            const noteStop = Note.getTimeStop(note);
            if (ppqStart <= ppqEnd) {
                if (note.timeStart >= ppqStart && note.timeStart < ppqEnd) {
                    noteEvents.push(new NoteEvent(note.timeStart, true, note.noteNumber, note.velocity, note.channel));
                    queuedEvents.push(new NoteEvent(noteStop, false, note.noteNumber, note.velocity, note.channel));
                }
            } else {
                const isInProjectLength = note.timeStart >= 0 && note.timeStart < lengthInPpq;
                const isInInterval = note.timeStart < ppqEnd || note.timeStart >= ppqStart;
                if (isInProjectLength && isInInterval) {
                    const adjustedNoteStart = note.timeStart + lengthInPpq;
                    noteEvents.push(new NoteEvent(adjustedNoteStart, true, note.noteNumber, note.velocity, note.channel));
                    queuedEvents.push(new NoteEvent(noteStop, false, note.noteNumber, note.velocity, note.channel));
                }
            }
        }

        return noteEvents;
    }

    /**
     * @param {Track} track 
     * @param {number} ppqStart 
     * @param {number} ppqEnd 
     * @returns {NoteEvent[]}
     */
    getNoteStopInInterval(track, ppqStart, ppqEnd) {
        /**
         * @type {NoteEvent[]}
         */
        let noteEvents = [];

        const queuedEvents = track.queuedNoteEvents;

        let i = 0;
        while (i < queuedEvents.length) {
            const noteEvent = queuedEvents[i];
            const noteStop = noteEvent.timestampPpq % this.config.lengthInPpq;

            if (ppqStart <= ppqEnd) {
                if (noteStop >= ppqStart && noteStop < ppqEnd) {
                    noteEvent.timestampPpq = noteStop;
                    noteEvents.push(noteEvent);
                    queuedEvents.splice(i, 1);
                    continue;
                }
            } else {
                if (noteStop < ppqEnd || noteStop >= ppqStart) {
                    noteEvent.timestampPpq = noteStop + this.config.lengthInPpq;
                    noteEvents.push(noteEvent);
                    queuedEvents.splice(i, 1);
                    continue;
                }
            }

            i++;
        }

        return noteEvents;
    }

    /**
     * @param {MidiEvent} midiEvent MIDI event
     * @param {number | undefined} timestampMs MIDI event timestamp
     */
    sendMidiMessageFromDevice(midiEvent, timestampMs = undefined) {
        if (!isAudioContextRunning()) return;
        const audioContext = /** @type {AudioContext} */ (getAudioContext());

        const track = this.tracks.getSelected();
        if (track === null) return;

        if (timestampMs !== undefined) {
            const sampleRate = audioContext.sampleRate;
            const audibleTimeSec = toAudibleTime(timestampMs);
            const blockSize = getBlockSize();
            const adjustedTimestamp = Math.max(0, blockSize + Math.floor(audibleTimeSec * sampleRate));
            sendMidiMessageSamples(track.index, midiEvent, adjustedTimestamp);
        }
        else {
            const adjustedTimestamp = getContextTime() + this.lookAheadSec;
            sendMidiMessageSeconds(track.index, midiEvent, adjustedTimestamp);
        }

        if (midiEvent.isNoteOn()) {
            track.noteStart(midiEvent.getNoteNumber(), midiEvent.getChannel());
        }
        else if (midiEvent.isNoteOff()) {
            track.noteStop(midiEvent.getNoteNumber(), midiEvent.getChannel());
        }

        this.notifyListeners(AudioEvent.MidiDeviceMessage);
    }

    /**
     * Used to let user preview a note (i.e. when they are drawing a note in the piano roll).
     * @param {number} noteNumber MIDI note number
     */
    sendPreviewMidiNote(noteNumber) {
        if (!isAudioContextRunning() || this.playHead.isPlaying) return;

        const track = this.tracks.getSelected();
        if (track === null) return;

        const noteOnEvent  = MidiEvent.newNote(MidiEventType.NoteOn,  noteNumber, 60, 0);
        const noteOffEvent = MidiEvent.newNote(MidiEventType.NoteOff, noteNumber, 60, 0);

        const playHeadTimeSec = getContextTime() + this.lookAheadSec;

        const lengthInSec = 0.15;
        const noteOnTime = playHeadTimeSec;
        const noteOffTime = noteOnTime + lengthInSec;

        sendMidiMessageSeconds(track.index, noteOnEvent,  noteOnTime);
        sendMidiMessageSeconds(track.index, noteOffEvent, noteOffTime);
    }
}