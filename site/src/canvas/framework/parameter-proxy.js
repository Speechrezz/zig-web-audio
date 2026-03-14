export class ParameterProxy {
    /** @type {any} */
    ctx = {};

    /** @type {() => void} */
    deinit = () => {};

    /** @type {(value: number) => string} */
    textFromValue = (value) => `${value}`;

    /** @type {(text: string) => number} */
    valueFromText = (text) => Number(text);

    /** @type {(value: number) => number} */
    toNormalizedValue = (value) => value;

    /** @type {(value: number) => number} */
    fromNormalizedValue = (value) => value;

    /** @type {(value: number) => void} */
    setValue = (value) => {};

    /** @type {(value: number) => void} */
    setNormalizedValue = (value) => {};

    value = 0;
    valueNormalized = 0;
    valueMin = 0;
    valueMax = 1;
    valueDefault = 0;

    /**
     * @param {number} value 
     */
    setValueInternal(value) {
        this.value = value;
        this.valueNormalized = this.toNormalizedValue(value);
    }

    /**
     * @param {number} value 
     */
    setNormalizedValueInternal(value) {
        this.valueNormalized = value;
        this.value = this.fromNormalizedValue(value);
    }
}