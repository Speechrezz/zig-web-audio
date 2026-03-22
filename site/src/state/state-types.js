/**
 * @typedef {(state: any, ctx: any) => void} StorageSaveCallback
 */

/**
 * @typedef {object} StorageSaveEntry
 * @property {StorageSaveCallback} callback
 * @property {any} ctx
 */

/**
 * @typedef {(success: boolean, ctx: any) => void} StorageLoadCallback
 */

/**
 * @typedef {object} StorageLoadEntry
 * @property {StorageLoadCallback} callback
 * @property {any} ctx
 */