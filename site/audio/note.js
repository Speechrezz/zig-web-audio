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
     * @param {number} beatStart Position of note start in beats 
     * @param {number} beatLength Length of note in beats
     * @param {number} noteNumber MIDI note number
     * @param {number} velocity MIDI velocity 0..127
     * @param {number} channel MIDI channel
     */
    constructor(beatStart, beatLength, noteNumber, velocity = 100, channel = 0) {
        this.beatStart = beatStart;
        this.beatLength = beatLength;
        this.noteNumber = noteNumber;
        this.velocity = velocity / 127.0; // Normalize
        this.channel = channel;
    }

    clone() {
        const newNote = new Note(this.beatStart, this.beatLength, this.noteNumber, 0, this.channel);
        newNote.velocity = this.velocity;
        newNote.id = this.id;
        return newNote;
    }

    static deserialize(json) {
        const newNote = new Note(json.beatStart, json.beatLength, json.noteNumber, 0, json.channel);
        newNote.velocity = json.velocity;
        newNote.id = json.id;
        return newNote;
    }

    getMidiVelocity() {
        return this.velocity * 127.0;
    }

    getBeatStop() {
        return this.beatStart + this.beatLength;
    }
}