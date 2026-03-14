export class MoreMath {
    /**
     * @param {number} value 
     * @param {number} min 
     * @param {number} max 
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * @param {number} t Interpolation amount (between 0 and 1)
     * @param {number} a Start value
     * @param {number} b End value
     */
    static lerp(t, a, b) {
        return a + (b - a) * t;
    }

    /**
     * @param {number} value
     * @param {number} a Start value
     * @param {number} b End value
     */
    static invLerp(value, a, b) {
        return (value - a) / (b - a);
    }
}