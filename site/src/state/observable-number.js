export class ObservableNumber {
    /** @type {number} */
    value;

    /**
     * @type {((value: number) => void)[]}
     */
    listeners = [];

    constructor(initialValue = 0) {
        this.value = initialValue;
    }

    /**
     * @param {number} value 
     */
    setValue(value) {
        if (this.value !== value) {
            this.value = value;
            this.notifyListeners(value);
        }
    }

    /**
     * @param {(value: number) => void} callback 
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * @param {(value: number) => void} callback 
     */
    removeListener(callback) {
        const index = this.listeners.findIndex((c) => c === callback);
        this.listeners.splice(index, 1);
    }

    /**
     * @param {number} value 
     */
    notifyListeners(value) {
        for (const callback of this.listeners) {
            callback(value);
        }
    }
}