export class MouseEvent {
    x = 0;
    y = 0;
    globalX = 0;
    globalY = 0;

    constructor(x = 0, y = 0, globalX = 0, globalY = 0) {
        this.x = x;
        this.y = y;
        this.globalX = globalX;
        this.globalY = globalY;
    }
}