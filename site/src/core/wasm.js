/**
 * @param {Uint8Array} mem 
 */
export function decodeUtf8(mem) {
    let s = "";
    for (let i = 0; i < mem.length; i++) {
        s += String.fromCharCode(mem[i]);
    }
    return s;
}

/**
 * @param {BigInt} x 
 */
export function unpackSlice(x) {
    // WebAssembly i64 typically comes to JS as a BigInt.
    const len = Number((x >> 32n) & 0xffffffffn);
    const ptr = Number(x & 0xffffffffn);
    return { ptr, len };
}

export class WasmContainer {
    /** @type {WebAssembly.Instance} */ // @ts-ignore
    instance;

    /** @type {WebAssembly.Module} */ // @ts-ignore
    module;

    /** @type {any} */
    exports;

    /**
     * @param {Response | Promise<Response>} response 
     * @param {WebAssembly.Imports} importObject 
     */
    async initialize(response, importObject = { env: {}}) {
        /**
         * @param {number} ptr 
         * @param {number} len 
         */
        importObject.env.consoleLogBinding = (ptr, len) => {
            console.log(this.getWasmString(ptr, len));
        };

        const instantiated = await WebAssembly.instantiateStreaming(response, importObject);
        this.instance = instantiated.instance;
        this.module = instantiated.module;
        this.exports = this.instance.exports
    }

    /**
     * Reads string from WASM memory. Converts from UTF8 to UTF16.
     * Creates a copy of the string, meaning the string can be safely freed after this function call.
     * @param {number} ptr 
     * @param {number} len 
     */
    getWasmString(ptr, len) {
        const mem = new Uint8Array(this.exports.memory.buffer, ptr, len);
        return decodeUtf8(mem);
    }
}