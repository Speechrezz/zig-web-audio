export class ClipboardManager {
    /**
     * @type {any}
     */
    contents = null;

    /**
     * @type {string | null}
     */
    type = null;

    /**
     * @param {string} type 
     * @param {string} contents 
     */
    setClipboard(type, contents) {
        this.type = type;
        this.contents = contents;
    }

    getClipboard() {
        return this.contents;
    }

    getType() {
        return this.type;
    }
}