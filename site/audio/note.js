export class Note {
    /**
     * Unique note ID (used for undo management)
     * @type {number}
     */
    id;
    
    /**
     * Position of the start of the note in beats 
     * @type {number}
     */
    beatStart;

    /**
     * Length of the note in beats
     * @type {number}
     */
    beatLength;

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
     * @param {number} beatStart Position of note start in beats 
     * @param {number} beatLength Length of note in beats
     * @param {number} noteNumber MIDI note number
     * @param {number} velocity Normalized velocity 0..1
     * @param {number} channel MIDI channel
     */
    constructor(id, beatStart, beatLength, noteNumber, velocity, channel) {
        this.id = id;
        this.beatStart = beatStart;
        this.beatLength = beatLength;
        this.noteNumber = noteNumber;
        this.velocity = velocity;
        this.channel = channel;
    }

    /**
     * @param {number} beatStart Position of note start in beats 
     * @param {number} beatLength Length of note in beats
     * @param {number} noteNumber MIDI note number
     * @param {number} velocity Normalized velocity 0..1
     * @param {number} channel MIDI channel
     */
    static create(beatStart, beatLength, noteNumber, velocity = 0.8, channel = 0) {
        return new Note(-1, beatStart, beatLength, noteNumber, velocity, channel)
    }

    /**
     * @param {number} beatStart Position of note start in beats 
     * @param {number} beatLength Length of note in beats
     * @param {number} noteNumber MIDI note number
     * @param {number} velocity MIDI velocity 0..127
     * @param {number} channel MIDI channel
     */
    static createFromMidi(beatStart, beatLength, noteNumber, velocity = 100, channel = 0) {
        return new Note(-1, beatStart, beatLength, noteNumber, velocity / 127, channel)
    }

    clone() {
        const newNote = new Note(this.beatStart, this.beatLength, this.noteNumber, 0, this.channel);
        newNote.velocity = this.velocity;
        newNote.id = this.id;
        return newNote;
    }

    /**
     * @param {Note} note 
     * @returns {Note}
     */
    static clone(note) {
        return {...note};
    }

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
     */
    static getBeatStop(note) {
        return note.beatStart + note.beatLength;
    }
}