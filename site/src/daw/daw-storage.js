/**
 * @typedef {{storageFn: () => void, entry: StorageEntry}} StorageRequest
 */

export class DawStorage {
    /** @type {StorageRequest[]} */
    requestQueue = [];

    /** @type {StorageEntry | null} */
    currentEntry = null;

    constructor() {}

    /**
     * Call to 
     * @param {StorageRequest} req 
     */
    pushRequest(req) {
        this.requestQueue.push(req);
        this.nextRequest();
    }

    /**
     * Only used internally
     * @returns `true` if next request has begun, `false` if an existing request is blocking
     */
    nextRequest() {
        if (this.currentEntry !== null) return false;
        if (this.requestQueue.length === 0) return false;

        const req = this.requestQueue.splice(0, 1)[0];
        this.currentEntry = req.entry;
        req.storageFn();

        return true;
    }

    /**
     * Call when save request has completed
     * @param {any} state 
     */
    finishedSave(state) {
        this.currentEntry?.callback(state, this.currentEntry?.ctx);
        this.currentEntry = null;
        this.nextRequest();
    }

    /**
     * Call when load request has completed
     * @param {boolean} success 
     */
    finishedLoad(success) {
        this.currentEntry?.callback(success, this.currentEntry?.ctx);
        this.currentEntry = null;
        this.nextRequest();
    }
}
