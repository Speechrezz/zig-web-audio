import { AppCommand, AppEvent } from "./app-event.js";
import { EventRouter } from "./event-router.js";

export class KeyboardListener {
    /**
     * @type {EventRouter}
     */
    eventRouter;

    /**
     * @type {Boolean}
     */
    isMac;

    /**
     * @param {EventRouter} eventRouter 
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

        e.preventDefault();
        this.eventRouter.handleEvent(new AppEvent(appCommand));
    }

    /**
     * @param {KeyboardEvent} e 
     */
    keyboardEventToAppCommand(e) {
        const key = e.key.toLocaleLowerCase();
        if (this.isPrimaryModifierDown(e)) {
            switch (key) {
                case 'c':
                    console.log("copy!");
                    return AppCommand.copy;
                case 'v':
                    console.log("paste!");
                    return AppCommand.paste;
            }
        }
        else {
            switch (key) {
                case 'delete':
                    console.log("delete!");
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

