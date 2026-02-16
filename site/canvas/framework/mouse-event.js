/**
 * @readonly
 * @enum {number}
 */
export const MouseAction = Object.freeze({
    none: 0,
    primary: 1,   // Primary mouse click
    secondary: 2, // Secondary mouse click
    select: 3,    // Selecting
    scroll: 4,    // Mouse scrolling
    translate: 5, // Translating view (like middle-mouse click)
    magnify: 6,   // Zooming in/out
});

/**
 * @typedef {"mouseDown" | "mouseUp" | "mouseMove"} GlobalMouseEventType
 */

/** 
 * @typedef {((GlobalMouseEventType, mouseAction: MouseAction) => void)} GlobalMouseListener
 */

/**
 * @readonly
 * @enum {number}
 */
export const MouseActionPolicy = Object.freeze({
    ignorePropagate: 0,  // Can NOT handle; keep searching children
    acceptPropagate: 1,  // CAN handle, but children get priority if they can
    acceptBlock: 2,      // CAN handle and prevents searching children
});

export class MouseEvent {
    x = 0;
    y = 0;
    globalX = 0;
    globalY = 0;

    /** @type {MouseAction} */
    mouseAction = MouseAction.none;

    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} globalX 
     * @param {number} globalY 
     * @param {MouseAction} mouseAction 
     */
    constructor(x = 0, y = 0, globalX = 0, globalY = 0, mouseAction = MouseAction.none) {
        this.x = x;
        this.y = y;
        this.globalX = globalX;
        this.globalY = globalY;
        this.mouseAction = mouseAction;
    }
}

export class MouseScrollEvent {
    x = 0;
    y = 0;
    globalX = 0;
    globalY = 0;

    deltaX = 0;
    deltaY = 0;

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @param {number} globalX 
     * @param {number} globalY 
     * @param {number} deltaX 
     * @param {number} deltaY 
     */
    constructor(x, y, globalX, globalY, deltaX, deltaY) {
        this.x = x;
        this.y = y;
        this.globalX = globalX;
        this.globalY = globalY;
        this.deltaX = deltaX;
        this.deltaY = deltaY;
    }
}