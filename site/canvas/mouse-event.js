/**
 * @readonly
 * @enum {number}
 */
export const MouseAction = Object.freeze({
    none: 0,
    draw: 1,
    move: 2,
    remove: 3,
    select: 4,
});

/**
 * @readonly
 * @enum {number}
 */
export const MouseActionPolicy = Object.freeze({
    ignorePropogate: 0,  // Can NOT handle; keep searching children
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