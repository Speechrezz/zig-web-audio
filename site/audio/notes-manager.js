import { AppTransaction, UndoManager } from "../app/undo-manager.js";
import { Note, PlaybackEngine } from "./playback-engine.js";

const UNDO_ID = "notes-manager";
const UndoType = Object.freeze({
    addNotes: "addNotes",
    removeNotes: "removeNotes",
    moveNotes: "movesNotes", 
})

export class NotesManager {
    /** @type {PlaybackEngine} */
    playbackEngine;

    /** @type {UndoManager} */
    undoManager;

    /** @type {Note[]} */
    removedNotesBuffer = [];

    /** @type {number} */
    gestureInstrumentIndex = 0;

    /** @type {(() => void)[]} */
    listenerList = [];

    /**
     * @param {PlaybackEngine} playbackEngine 
     * @param {UndoManager} undoManager 
     */
    constructor(playbackEngine, undoManager) {
        this.playbackEngine = playbackEngine;
        this.undoManager = undoManager;

        this.undoManager.addListener(UNDO_ID, this);
    }

    /**
     * @param {number} instrumentIndex 
     * @param {Note[]} notes 
     * @param {boolean} newNotes `true` if the notes being added are brand-new.
     */
    addNotes(instrumentIndex, notes, newNotes = true) {
        const instrument = this.playbackEngine.instruments[instrumentIndex];

        for (const note of notes) {
            if (newNotes) {
                note.id = instrument.getNextNoteId();
            }

            instrument.notes.push(note);
        }

        if (newNotes) {
            this.undoManager.push(new AppTransaction(
                UNDO_ID, 
                UndoType.addNotes, 
                {
                    instrumentIndex: instrumentIndex,
                    notes: cloneNotes(notes),
                }
            ));
        }
    }

    /**
     * @param {number} instrumentIndex 
     * @param {Note[]} notes 
     * @param {boolean} addToUndo `true` if this remove event should be communicated to the undo manager.
     */
    removeNotes(instrumentIndex, notes, addToUndo = true) {
        const instrument = this.playbackEngine.instruments[instrumentIndex];

        for (const note of notes) {
            const instrumentNoteIndex = instrument.notes.indexOf(note);
            instrument.notes.splice(instrumentNoteIndex, 1);
        }

        if (addToUndo) {
            this.undoManager.push(new AppTransaction(
                UNDO_ID, 
                UndoType.removeNotes, 
                {
                    instrumentIndex: instrumentIndex,
                    notes: cloneNotes(notes),
                }
            ));
        }
    }

    removeNotesGestureBegin(instrumentIndex) {
        this.gestureInstrumentIndex = instrumentIndex;
        this.removedNotesBuffer.length = 0;
    }

    /**
     * @param {Note} note 
     */
    removeNotesGestureStep(note) {
        this.removedNotesBuffer.push(note);
        this.removeNotes(this.gestureInstrumentIndex, [note], false);
    }

    removeNotesGestureEnd() {
        if (this.removedNotesBuffer.length === 0) return;

        this.undoManager.push(new AppTransaction(
            UNDO_ID, 
            UndoType.removeNotes, 
            {
                instrumentIndex: this.gestureInstrumentIndex,
                notes: cloneNotes(this.removedNotesBuffer),
            }
        ));
    }

    /**
     * @param {number} instrumentIndex 
     * @param {Note[]} noteDiffs 
     */
    moveNotesGestureEnd(instrumentIndex, noteDiffs) {
        this.undoManager.push(new AppTransaction(
            UNDO_ID, 
            UndoType.moveNotes, 
            {
                instrumentIndex: instrumentIndex,
                notes: cloneNotes(noteDiffs),
            }
        ));
    }

    /**
     * Override to handle undo events.
     * @param {AppTransaction} transaction 
     */
    undo(transaction) {
        /** @type {number} */
        const instrumentIndex = transaction.diff.instrumentIndex;
        const instrument = this.playbackEngine.instruments[instrumentIndex];
        /** @type {Note[]} */
        const notesDiff = transaction.diff.notes;
        
        console.log("[undo]: instrumentIndex=", instrumentIndex, ", notesDiff=", notesDiff, ", transaction.type=", transaction.type);

        switch (transaction.type) {
            case UndoType.addNotes: {
                for (const noteDiff of notesDiff) {
                    const note = instrument.notes.find((v) => v.id === noteDiff.id);
                    if (note !== undefined) {
                        this.removeNotes(instrumentIndex, [note], false);   
                    }
                }

                break;
            }
            case UndoType.removeNotes: {
                this.addNotes(instrumentIndex, cloneNotes(notesDiff), false);
                break;
            }
            case UndoType.moveNotes: {
                for (const noteDiff of notesDiff) {
                    const note = instrument.notes.find((v) => v.id === noteDiff.id);
                    if (note === undefined) continue;

                    note.beatStart  -= noteDiff.beatStart;
                    note.beatLength -= noteDiff.beatLength;
                    note.noteNumber -= noteDiff.noteNumber;
                }

                break;
            }
        }

        for (const listener of this.listenerList) {
            listener();
        }
    }

    /**
     * Override to handle redo events.
     * @param {AppTransaction} transaction 
     */
    redo(transaction) {
        /** @type {number} */
        const instrumentIndex = transaction.diff.instrumentIndex;
        const instrument = this.playbackEngine.instruments[instrumentIndex];
        /** @type {Note[]} */
        const notesDiff = transaction.diff.notes;

        console.log("[redo]: instrumentIndex=", instrumentIndex, ", notesDiff=", notesDiff, ", transaction.type=", transaction.type);
        
        switch (transaction.type) {
            case UndoType.addNotes: {
                this.addNotes(instrumentIndex, cloneNotes(notesDiff), false);
                break;
            }
            case UndoType.removeNotes: {
                for (const noteDiff of notesDiff) {
                    const note = instrument.notes.find((v) => v.id === noteDiff.id);
                    if (note !== undefined) {
                        this.removeNotes(instrumentIndex, [note], false);   
                    }
                }

                break;
            }
            case UndoType.moveNotes: {
                for (const noteDiff of notesDiff) {
                    const note = instrument.notes.find((v) => v.id === noteDiff.id);
                    if (note === undefined) continue;

                    note.beatStart  += noteDiff.beatStart;
                    note.beatLength += noteDiff.beatLength;
                    note.noteNumber += noteDiff.noteNumber;
                }

                break;
            }
        }

        for (const listener of this.listenerList) {
            listener();
        }
    }
}

export function cloneNotes(notes) {
    /** @type {Note[]} */
    const cloned = [];

    for (const note of notes) {
        cloned.push(note.clone());
    }

    return cloned;
}