export const MouseAction = Object.freeze({
    none: 0,
    draw: 1,
    drag: 2,
    remove: 3,
    select: 4,
});

export class MouseEvent {
    x = 0;
    y = 0;
    globalX = 0;
    globalY = 0;
    mouseAction = MouseAction.none;

    constructor(x = 0, y = 0, globalX = 0, globalY = 0, mouseAction = MouseAction.none) {
        this.x = x;
        this.y = y;
        this.globalX = globalX;
        this.globalY = globalY;
        this.mouseAction = mouseAction;
    }
}