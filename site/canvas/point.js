export class Point {
    x = 0;
    y = 0;

    /**
     * @param {Number} x 
     * @param {Number} y 
     */
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    /**
     * @param {Point} other 
     */
    eql(other) {
        return this.x === other.x && this.y === other.y;
    }

    /**
     * Sets current Point equal to other point.
     * @param {Point} other 
     */
    set(other) {
        this.x = other.x;
        this.y = other.y;
    }

    /**
     * Binary add (returns new `Point`).
     * @param {Point} other 
     */
    add(other) {
        return new Point(this.x + other.x, this.y + other.y);
    }

    /**
     * In-place add (adds to current `Point`).
     * @param {Point} other 
     */
    addFrom(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }
}