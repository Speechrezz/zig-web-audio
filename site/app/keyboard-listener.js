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
    }

    /**
     * @param {KeyboardEvent} e 
     */
    onKeyDown(e) {
        console.log("KeyboardEvent:", e);
        
        const appCommand = this.keyboardEventToAppCommand(e);
        if (appCommand === null) return;

        if (this.eventRouter.dispatchEvent(new AppEvent(appCommand))) {
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
                case 'c':
                    return AppCommand.copy;
                case 'v':
                    return AppCommand.paste;
            }
        }
        else {
            switch (key) {
                case 'delete':
                    return AppCommand.delete;
            }
        }

        return null
    }

    /**
     * @param {KeyboardEvent} e 
     * @returns `true` if 'CTRL' is held down on Windows/Linux or 'CMD' on MacOS
     */
    isPrimaryModifierDown(e) {
        return this.isMac ? e.metaKey : e.ctrlKey;
    } 
}

