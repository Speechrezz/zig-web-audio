export class Rectangle {
    x = 0;
    y = 0;
    width = 0;
    height = 0;

    /**
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} width 
     * @param {Number} height 
     */
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    getRight() {
        return this.x + this.width;
    }

    getBottom() {
        return this.y + this.height;
    }

    /**
     * @param {Number} x 
     * @param {Number} y 
     */
    translate(x, y) {
        this.x += x;
        this.y += y;
    }

    /**
     * @param {Point} point 
     */
    translatePoint(point) {
        this.x += point.x;
        this.y += point.y;
    }

    /**
     * @param {Number} x 
     */
    removeFromLeft(x) {
        const removed = new Rectangle(
            this.x,
            this.y,
            x,
            this.height,
        );

        this.x += x;
        this.width -= x;

        return removed;
    }

    /**
     * @param {Rectangle} other 
     */
    eql(other) {
        return this.x === other.x
            && this.y === other.y
            && this.width  === other.width
            && this.height === other.height;
    }

    clone() {
        return new Rectangle(this.x, this.y, this.width, this.height);
    }

    /**
     * @param {Number} x 
     * @param {Number} y 
     * @returns `true` if the point is inside the rectangle
     */
    contains(x, y) {
        return x >= this.x && x <= this.getRight() 
            && y >= this.y && y <= this.getBottom();
    }

    /**
     * Checks whether this rectangle intersects another rectangle
     * @param {Rectangle} other
     * @returns {boolean}
     */
    intersects(other) {
        return !(
            this.x + this.width  <= other.x ||  // this is left of other
            this.x >= other.x + other.width ||  // this is right of other
            this.y + this.height <= other.y ||  // this is above other
            this.y >= other.y + other.height    // this is below other
        );
    }
}