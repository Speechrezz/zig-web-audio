export class AppTransaction {
    /** @type {string} */
    listenerId;
    /** @type {string} */
    type;
    /** @type {any} */
    before;
    /** @type {any} */
    after;
    /** @type {number} */
    version;

    /**
     * @param {string} listenerId ID of undo/redo listener.
     * @param {string} type Transaction type.
     * @param {any} before Data related to the transaction, should be JSON stringify-able.
     * @param {any} after Data related to the transaction, should be JSON stringify-able.
     * @param {number} version Optional version identifier.
     */
    constructor(listenerId, type, before, after, version = 1) {
        this.listenerId = listenerId;
        this.type = type;
        this.before = before;
        this.after = after;
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

    /** @type {Object.<string, UndoListener>} */
    listeners = {};

    /**
     * @param {string} id Listener ID
     * @param {UndoListener} newListener 
     */
    addListener(id, newListener) {
        this.listeners[id] = newListener;
    }

    /**
     * @param {string} id Listener ID
     */
    removeListener(id) {
        delete this.listeners[id];
    }

    /**
     * @param {AppTransaction} transaction 
     */
    pushTransaction(transaction) {
        this.transactions.length = this.writeIndex; // Clear redos 

        this.transactions.push(transaction);
        this.writeIndex++;
    }

    undo() {
        const index = this.writeIndex - 1;
        if (index < 0) return;

        const transaction = this.transactions[index];
        const listener = this.listeners[transaction.listenerId];
        listener.undo(transaction);

        this.writeIndex--;
    }

    redo() {
        if (this.writeIndex === this.transactions.length) return;

        const transaction = this.transactions[this.writeIndex];
        const listener = this.listeners[transaction.listenerId];
        listener.redo(transaction);

        this.writeIndex++;
    }
}