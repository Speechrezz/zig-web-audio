/**
 * @typedef {object} FormatterSpec
 * @property {string} type
 * @property {number} decimals
 * @property {any} [ctx]
 */

/**
 * @typedef {object} RangeSpec
 * @property {string} type
 * @property {number} start
 * @property {number} end
 * @property {any} [ctx]
 */

/**
 * @typedef {object} ParameterSpecJson
 * @property {FormatterSpec} formatter
 * @property {RangeSpec} range
 */