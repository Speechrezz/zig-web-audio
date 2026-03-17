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
 * @param {string} str 
 * @param {Uint8Array} mem 
 */
export function encodeUtf8(str, mem) {
    const encoder = new TextEncoder();
    encoder.encodeInto(str, mem);
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

    /**
     * @param {BigInt} packed 
     */
    wasmSliceToString(packed) {
        const slice = unpackSlice(packed);
        const string = this.getWasmString(slice.ptr, slice.len);
        this.freeWasmString(slice);
        return string;
    }

    /**
     * @param {string} str 
     */
    allocAndCopyToWasmString(str) {
        const len = str.length;
        /** @type {number} */
        const ptr = this.exports.allocString(str.length);
        const mem = new Uint8Array(this.exports.memory.buffer, ptr, len);

        encodeUtf8(str, mem);
        return {ptr, len};
    }

    /**
     * @param {{ptr: number, len: number}} slice 
     */
    freeWasmString(slice) {
        this.exports.freeString(slice.ptr, slice.len);
    }
}