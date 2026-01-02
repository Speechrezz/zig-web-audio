import { AppEvent } from "./app-event.js";

export class AppEventListener {
    /**
     * Specify which events this listener can handle.
     * @param {AppEvent} e 
     * @returns {number | null} Must return a `number` priority (higher = more priority) or `null` if can't handle. 
     */
    canHandleEvent(e) {}

    /**
     * Handle the `AppEvent`.
     * @param {AppEvent} e 
     */
    handleEvent(e) {}
}

export class AppEventRouter {
    /**
     * @type {AppEventListener[]}
     */
    eventListeners = [];
    
    /**
     * @param {AppEvent} appEvent 
     * @returns `true` if event was handled.
     */
    dispatchEvent(appEvent) {
        console.log("dispatchEvent!", appEvent);
        
        /** @type {AppEventListener | null} */
        let bestListener = null;
        /** @type {number | null} */
        let bestPriority = null;
        for (const eventListener of this.eventListeners) {
            const priority = eventListener.canHandleEvent(appEvent);
            if (priority === null) continue;

            if (bestPriority === null || priority > bestPriority) {
                bestListener = eventListener;
                bestPriority = priority;
            }
        }

        if (bestListener !== null) {
            bestListener.handleEvent(appEvent);
            return true;
        }

        return false;
    }

    /**
     * @param {AppEventListener} listener 
     */
    addListener(listener) {
        this.eventListeners.push(listener);
    }

    /**
     * @param {AppEventListener} listener 
     */
    removeListener(listener) {
        const index = this.eventListeners.indexOf(listener);
        this.eventListeners.splice(index, 1);
    }
}