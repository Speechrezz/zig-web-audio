import { AppTransaction, UndoManager } from "../app/undo-manager.js";
import { Note } from "../audio/note.js";

const UNDO_ID = "notes-manager";
const UndoType = Object.freeze({
    addNotes: "addNotes",
    removeNotes: "removeNotes",
    moveNotes: "movesNotes", 
});

export class NotesController {
    /** @type {TrackAtFn} */
    trackAt;

    /** @type {UndoManager} */
    undoManager;

    /** @type {Note[]} */
    removedNotesBuffer = [];

    /** @type {number} */
    gestureTrackIndex = 0;

    /** @type {() => void} */
    pianoRollCallback = () => {};

    /**
     * @param {UndoManager} undoManager 
     * @param {TrackAtFn} trackAt 
     */
    constructor(undoManager, trackAt) {
        this.trackAt = trackAt;
        this.undoManager = undoManager;

        this.undoManager.addListener(UNDO_ID, this);
    }

    /**
     * @param {number} trackIndex 
     * @param {Note[]} notes 
     * @param {boolean} newNotes `true` if the notes being added are brand-new.
     */
    addNotes(trackIndex, notes, newNotes = true) {
        const track = this.trackAt(trackIndex);

        for (const note of notes) {
            if (newNotes) {
                note.id = track.getNextNoteId();
            }

            track.notes.push(note);
        }

        if (newNotes) {
            this.undoManager.push(new AppTransaction(
                UNDO_ID, 
                UndoType.addNotes, 
                {
                    trackIndex: trackIndex,
                    notes: cloneNotes(notes),
                }
            ));
        }
    }

    /**
     * @param {number} trackIndex 
     * @param {Note[]} notes 
     * @param {boolean} addToUndo `true` if this remove event should be communicated to the undo manager.
     */
    removeNotes(trackIndex, notes, addToUndo = true) {
        const track = this.trackAt(trackIndex);

        for (const note of notes) {
            const trackNoteIndex = track.notes.indexOf(note);
            track.notes.splice(trackNoteIndex, 1);
        }

        if (addToUndo) {
            this.undoManager.push(new AppTransaction(
                UNDO_ID, 
                UndoType.removeNotes, 
                {
                    trackIndex: trackIndex,
                    notes: cloneNotes(notes),
                }
            ));
        }
    }

    /**
     * @param {number} trackIndex 
     */
    removeNotesGestureBegin(trackIndex) {
        this.gestureTrackIndex = trackIndex;
        this.removedNotesBuffer.length = 0;
    }

    /**
     * @param {Note} note 
     */
    removeNotesGestureStep(note) {
        this.removedNotesBuffer.push(note);
        this.removeNotes(this.gestureTrackIndex, [note], false);
    }

    removeNotesGestureEnd() {
        if (this.removedNotesBuffer.length === 0) return;

        this.undoManager.push(new AppTransaction(
            UNDO_ID, 
            UndoType.removeNotes, 
            {
                trackIndex: this.gestureTrackIndex,
                notes: cloneNotes(this.removedNotesBuffer),
            }
        ));
    }

    /**
     * @param {number} trackIndex 
     * @param {Note[]} noteDiffs 
     */
    moveNotesGestureEnd(trackIndex, noteDiffs) {
        this.undoManager.push(new AppTransaction(
            UNDO_ID, 
            UndoType.moveNotes, 
            {
                trackIndex: trackIndex,
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
        const trackIndex = transaction.diff.trackIndex;
        const track = this.trackAt(trackIndex);
        /** @type {Note[]} */
        const notesDiff = transaction.diff.notes;
        
        console.log("[undo]: trackIndex=", trackIndex, ", notesDiff=", notesDiff, ", transaction.type=", transaction.type);

        switch (transaction.type) {
            case UndoType.addNotes: {
                for (const noteDiff of notesDiff) {
                    const note = track.notes.find((v) => v.id === noteDiff.id);
                    if (note !== undefined) {
                        this.removeNotes(trackIndex, [note], false);   
                    }
                }

                break;
            }
            case UndoType.removeNotes: {
                this.addNotes(trackIndex, cloneNotes(notesDiff), false);
                break;
            }
            case UndoType.moveNotes: {
                for (const noteDiff of notesDiff) {
                    const note = track.notes.find((v) => v.id === noteDiff.id);
                    if (note === undefined) continue;

                    note.timeStart  -= noteDiff.timeStart;
                    note.timeLength -= noteDiff.timeLength;
                    note.noteNumber -= noteDiff.noteNumber;
                }

                break;
            }
        }

        this.pianoRollCallback();
    }

    /**
     * Override to handle redo events.
     * @param {AppTransaction} transaction 
     */
    redo(transaction) {
        /** @type {number} */
        const trackIndex = transaction.diff.trackIndex;
        const track = this.trackAt(trackIndex);
        /** @type {Note[]} */
        const notesDiff = transaction.diff.notes;

        console.log("[redo]: trackIndex=", trackIndex, ", notesDiff=", notesDiff, ", transaction.type=", transaction.type);
        
        switch (transaction.type) {
            case UndoType.addNotes: {
                this.addNotes(trackIndex, cloneNotes(notesDiff), false);
                break;
            }
            case UndoType.removeNotes: {
                for (const noteDiff of notesDiff) {
                    const note = track.notes.find((v) => v.id === noteDiff.id);
                    if (note !== undefined) {
                        this.removeNotes(trackIndex, [note], false);   
                    }
                }

                break;
            }
            case UndoType.moveNotes: {
                for (const noteDiff of notesDiff) {
                    const note = track.notes.find((v) => v.id === noteDiff.id);
                    if (note === undefined) continue;

                    note.timeStart  += noteDiff.timeStart;
                    note.timeLength += noteDiff.timeLength;
                    note.noteNumber += noteDiff.noteNumber;
                }

                break;
            }
        }

        this.pianoRollCallback();
    }
}

/**
 * @param {Note[]} notes 
 */
export function cloneNotes(notes) {
    return structuredClone(notes);
}