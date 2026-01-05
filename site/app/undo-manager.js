import { AppEventRouter } from "./app-event-router.js";
import { AppCommand, AppEvent } from "./app-event.js";

export class AppTransaction {
    /** @type {string} */
    listenerId;
    /** @type {string} */
    type;
    /** @type {any} */
    diff;
    /** @type {number} */
    version;

    /**
     * @param {string} listenerId ID of undo/redo listener.
     * @param {string} type Transaction type.
     * @param {any} diff Data related to the transaction, should be JSON stringify-able.
     * @param {number} version Optional version identifier.
     */
    constructor(listenerId, type, diff, version = 1) {
        this.listenerId = listenerId;
        this.type = type;
        this.diff = diff;
        this.version = version;
    }
}

export class UndoListener {
    /**
     * Override to handle undo events.
     * @param {AppTransaction} transaction 
     */
    undo(transaction) {}
    /**
     * Override to handle undo events.
     * @param {AppTransaction} transaction 
     */
    redo(transaction) {}
}

export class UndoManager {
    /** @type {AppTransaction[]} */
    transactions = [];
    writeIndex = 0;

    /** @type {Map<string, UndoListener} */
    listeners = new Map();

    /**
     * @param {AppEventRouter} eventRouter 
     */
    constructor(eventRouter) {
        eventRouter.addListener(this);
    }

    /**
     * @param {string} id Listener ID
     * @param {UndoListener} newListener 
     */
    addListener(id, newListener) {
        this.listeners.set(id, newListener);
    }

    /**
     * @param {string} id Listener ID
     */
    removeListener(id) {
        this.listeners.delete(id);
    }

    /**
     * @param {AppTransaction} transaction 
     */
    push(transaction) {
        this.transactions.length = this.writeIndex; // Clear redos 

        this.transactions.push(transaction);
        this.writeIndex++;
    }

    undo() {
        console.log("undo...");
        const index = this.writeIndex - 1;
        if (index < 0) return;

        const transaction = this.transactions[index];
        const listener = this.listeners.get(transaction.listenerId);
        listener.undo(transaction);

        this.writeIndex--;
    }

    redo() {
        console.log("redo...");
        if (this.writeIndex === this.transactions.length) return;

        const transaction = this.transactions[this.writeIndex];
        const listener = this.listeners.get(transaction.listenerId);
        listener.redo(transaction);

        this.writeIndex++;
    }

    /**
     * Specify which events this listener can handle.
     * @param {AppEvent} appEvent 
     * @returns {number | null} Must return a `number` priority (higher = more priority) or `null` if can't handle. 
     */
    canHandleEvent(appEvent) {
        switch (appEvent.command) {
            case AppCommand.undo:
            case AppCommand.redo:
                return 0;
        }

        return null;
    }

    /**
     * Handle the `AppEvent`.
     * @param {AppEvent} appEvent 
     */
    handleEvent(appEvent) {
        switch (appEvent.command) {
            case AppCommand.undo:
                this.undo();
                break;
            case AppCommand.redo:
                this.redo();
                break;
        }
    }
}