import { AppEvent } from "./app-event.js";

export class EventRouter {
    /**
     * @param {AppEvent} appEvent 
     */
    handleEvent(appEvent) {
        console.log("handleEvent!", appEvent);
    }
}