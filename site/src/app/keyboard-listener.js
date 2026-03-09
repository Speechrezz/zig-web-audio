import { AppCommand, AppEvent } from "./app-event.js";
import { AppEventRouter } from "./app-event-router.js";

export class KeyboardListener {
    /**
     * @type {AppEventRouter}
     */
    eventRouter;

    /**
     * @type {Boolean}
     */
    isMac;

    /**
     * @param {AppEventRouter} eventRouter 
     */
    constructor(eventRouter) {
        this.eventRouter = eventRouter;

        this.isMac = navigator.userAgent.toLowerCase().includes("mac");

        window.addEventListener("keydown", (e) => this.onKeyDown(e), { capture: true });
        window.addEventListener("copy", (e) => this.onClipboardEvent(e));
        window.addEventListener("paste", (e) => this.onClipboardEvent(e));
        window.addEventListener("cut", (e) => this.onClipboardEvent(e));
    }

    /**
     * @param {KeyboardEvent | ClipboardEvent} domEvent
     * @param {AppEvent} appEvent 
     */
    dispatchEvent(domEvent, appEvent) {
        if (!this.isCanvasInFocus(document.activeElement)) return;

        if (this.eventRouter.dispatchEvent(appEvent)) {
            domEvent.preventDefault();
        }
    }

    /**
     * @param {KeyboardEvent} e 
     */
    onKeyDown(e) {
        const appCommand = this.keyboardEventToAppCommand(e);
        if (appCommand === null) return;

        if (this.dispatchEvent(e, new AppEvent(appCommand))) {
            e.preventDefault();
        }
    }

    /**
     * @param {KeyboardEvent} e 
     */
    keyboardEventToAppCommand(e) {
        const key = e.key.toLocaleLowerCase();
        if (this.isPrimaryModifierDown(e)) {
            switch (key) {
                case 'a':
                    return AppCommand.selectAll;
                case 'z':
                    return AppCommand.undo;
                case 'y':
                    return AppCommand.redo;
            }
        }
        else {
            switch (key) {
                case ' ': // space
                    return AppCommand.playPause;
                case 'delete':
                    return AppCommand.delete;
            }
        }

        return null
    }

    /**
     * @param {ClipboardEvent} e 
     */
    onClipboardEvent(e) {
        const appCommand = this.clipboardEventToAppCommand(e);
        if (appCommand === null) return;

        if (this.dispatchEvent(e, new AppEvent(appCommand))) {
            e.preventDefault();
        }
    }

    /**
     * @param {ClipboardEvent} e 
     */
    clipboardEventToAppCommand(e) {
        switch (e.type) {
            case "copy":
                return AppCommand.copy;
            case "paste":
                return AppCommand.paste;
            case "cut":
                return AppCommand.cut;
        }

        return null;
    }

    /**
     * @param {KeyboardEvent} e 
     * @returns `true` if 'CTRL' is held down on Windows/Linux or 'CMD' on MacOS
     */
    isPrimaryModifierDown(e) {
        return this.isMac ? e.metaKey : e.ctrlKey;
    }

    /**
     * @param {HTMLElement} targetElement 
     */
    isCanvasInFocus(targetElement) {
        return targetElement.id === "pianoroll"
    }
}

