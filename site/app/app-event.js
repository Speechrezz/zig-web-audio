export const AppCommand = Object.freeze({
    none: "none",
    copy: "copy",
    paste: "paste",
    cut: "cut",
    undo: "undo",
    redo: "redo",
    selectAll: "selectAll",
    playPause: "playPause",
    delete: "delete",
});

export class AppEvent {
    /**
     * AppCommand 
     * @type {String}
     */
    command;

    /**
     * @param {String} command AppCommand 
     */
    constructor(command) {
        this.command = command;
    }
}