import { MoreMath } from "../../core/math.js";

export class ParameterProxy {
    /** @type {any} */
    ctx = {};

    /** @type {() => void} */
    deinit = () => {};

    /** @type {(value: number) => string} */
    textFromValue = (value) => value.toFixed(2);

    /** @type {(text: string) => number} */
    valueFromText = (text) => Number(text);

    /** @type {(value: number) => number} */
    toNormalizedValue = (value) => this.clampNormalized(MoreMath.invLerp(value, this.valueMin, this.valueMax));

    /** @type {(value: number) => number} */
    fromNormalizedValue = (value) => this.clampValue(MoreMath.lerp(value, this.valueMin, this.valueMax));

    /** @type {(value: number) => void} */
    setValue = (value) => this.setValueInternal(value);

    /** @type {(value: number) => void} */
    setNormalizedValue = (value) => this.setNormalizedValueInternal(value);

    /** @type {() => void} */
    onValueChange = () => {};

    value = 0;
    valueNormalized = 0;
    valueMin = 0;
    valueMax = 1;
    valueDefault = 0;

    name = "";

    /**
     * @param {number} value 
     */
    setValueInternal(value) {
        this.value = this.clampValue(value);
        this.valueNormalized = this.toNormalizedValue(value);
        this.onValueChange();
    }

    /**
     * @param {number} value 
     */
    setNormalizedValueInternal(value) {
        this.valueNormalized = this.clampNormalized(value);
        this.value = this.fromNormalizedValue(value);
        this.onValueChange();
    }

    /**
     * @param {number} value 
     */
    clampValue(value) {
        return MoreMath.clamp(value, this.valueMin, this.valueMax);
    }

    /**
     * @param {number} value 
     */
    clampNormalized(value) {
        return MoreMath.clamp(value, 0, 1);
    }
}