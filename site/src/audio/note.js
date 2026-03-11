export class Note {
    /**
     * Unique note ID (used for undo management)
     * @type {number}
     */
    id;
    
    /**
     * Position of the start of the note in PPQ time units 
     * @type {number}
     */
    timeStart;

    /**
     * Length of the note in PPQ time units
     * @type {number}
     */
    timeLength;

    /**
     * MIDI note number
     * @type {number}
     */
    noteNumber;

    /**
     * Velocity (normalized 0..1)
     * @type {number}
     */
    velocity;

    /**
     * MIDI channel
     * @type {number}
     */
    channel;

    /**
     * @param {number} id Unique note ID
     * @param {number} timeStart Position of note start in PPQ 
     * @param {number} timeLength Length of note in PPQ
     * @param {number} noteNumber MIDI note number
     * @param {number} velocity Normalized velocity 0..1
     * @param {number} channel MIDI channel
     */
    constructor(id, timeStart, timeLength, noteNumber, velocity, channel) {
        this.id = id;
        this.timeStart = timeStart;
        this.timeLength = timeLength;
        this.noteNumber = noteNumber;
        this.velocity = velocity;
        this.channel = channel;
    }

    /**
     * @param {number} timeStart Position of note start in PPQ 
     * @param {number} timeLength Length of note in PPQ
     * @param {number} noteNumber MIDI note number
     * @param {number} velocity Normalized velocity 0..1
     * @param {number} channel MIDI channel
     */
    static create(timeStart, timeLength, noteNumber, velocity = 0.8, channel = 0) {
        return new Note(-1, timeStart, timeLength, noteNumber, velocity, channel)
    }

    /**
     * @param {number} timeStart Position of note start in PPQ 
     * @param {number} timeLength Length of note in PPQ
     * @param {number} noteNumber MIDI note number
     * @param {number} velocity MIDI velocity 0..127
     * @param {number} channel MIDI channel
     */
    static createFromMidi(timeStart, timeLength, noteNumber, velocity = 100, channel = 0) {
        return new Note(-1, timeStart, timeLength, noteNumber, velocity / 127, channel)
    }

    /**
     * @param {Note} note 
     * @returns {Note}
     */
    static clone(note) {
        return {...note};
    }

    /**
     * @param {any} json 
     */
    static deserialize(json) {
        return new Note(json.id, json.beatStart, json.beatLength, json.noteNumber, json.velocity, json.channel);
    }

    /**
     * @param {Note} note 
     */
    static getMidiVelocity(note) {
        return note.velocity * 127.0;
    }

    /**
     * @param {Note} note 
     * @returns Note stop position in PPQ time units
     */
    static getTimeStop(note) {
        return note.timeStart + note.timeLength;
    }
}

export class NoteEvent {
    noteNumber = 0;
    velocity = 0;
    channel = 0;
    timestampPpq = 0;
    isNoteOn = true;

    /**
     * @param {number} timestampPpq 
     * @param {boolean} isNoteOn 
     * @param {number} noteNumber 
     * @param {number} velocity 
     * @param {number} channel 
     */
    constructor(timestampPpq, isNoteOn, noteNumber, velocity, channel = 0) {
        this.noteNumber = noteNumber;
        this.velocity = velocity;
        this.channel = channel;
        this.timestampPpq = timestampPpq;
        this.isNoteOn = isNoteOn;
    }

    /**
     * @param {NoteEvent} noteEvent 
     */
    static getMidiVelocity(noteEvent) {
        return noteEvent.velocity * 127.0;
    }

    /**
     * @param {NoteEvent} noteEvent 
     * @returns {NoteEvent}
     */
    static clone(noteEvent) {
        return {...noteEvent};
    }
}
