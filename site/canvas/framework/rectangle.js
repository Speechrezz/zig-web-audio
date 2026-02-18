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

    getCenterX() {
        return this.x + this.width * 0.5;
    }

    getCenterY() {
        return this.y + this.height * 0.5;
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
     * @param {number} x 
     */
    setRight(x) {
        this.x += this.width - x;
        this.width = x;
    }

    /**
     * @param {number} y 
     */
    setTop(y) {
        this.y += this.height - y;
        this.height = y;
    }

    /**
     * @param {Number} x 
     */
    removeFromTop(height) {
        const removed = new Rectangle(
            this.x,
            this.y,
            this.width,
            height,
        );

        this.y += height;
        this.height -= height;

        return removed;
    }

    /**
     * @param {Number} x 
     */
    removeFromBottom(height) {
        const removed = new Rectangle(
            this.x,
            this.y + this.height - height,
            this.width,
            height,
        );

        this.height -= height;

        return removed;
    }

    /**
     * @param {Number} width 
     */
    removeFromLeft(width) {
        const removed = new Rectangle(
            this.x,
            this.y,
            width,
            this.height,
        );

        this.x += width;
        this.width -= width;

        return removed;
    }

    /**
     * @param {Number} width 
     */
    removeFromRight(width) {
        const removed = new Rectangle(
            this.x + this.width - width,
            this.y,
            width,
            this.height,
        );

        this.width -= width;

        return removed;
    }

    /**
     * @param {number} x 
     * @param {number} y 
     * @returns 
     */
    reduced(x, y) {
        return new Rectangle(
            this.x + x,
            this.y + y,
            this.width - 2 * x,
            this.height - 2 * y,
        );
    }

    /**
     * @param {number} x 
     * @param {number} y 
     */
    reduce(x, y) {
        this.x += x;
        this.y += y;
        this.width -= 2 * x;
        this.height -= 2 * y;
    }

    /**
     * @param {number} width 
     * @param {number} height 
     */
    withSizeKeepingCenter(width, height) {
        return new Rectangle(
            this.getCenterX() - width * 0.5,
            this.getCenterY() - height * 0.5,
            width,
            height,
        );
    }

    floor() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        this.width = Math.floor(this.width);
        this.height = Math.floor(this.height);
    }

    round() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        this.width = Math.round(this.width);
        this.height = Math.round(this.height);
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