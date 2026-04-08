/**
 * AudioParameter spec
 * @typedef {object} ParameterSpecFull
 * @property {number} container_ptr
 * @property {number} index
 * @property {string} id
 * @property {string} name
 * @property {{formatter: any, range: any}} spec
 * @property {number} value_default
 */

/**
 * AudioParameterContainer spec
 * @typedef {object} ParameterContainerSpecFull
 * @property {number} ptr
 * @property {ParameterSpecFull[]} list
 */

/**
 * @typedef {{
 *   ptr: number,
 *   id: string,
 *   name: string,
 *   parameters: any,
 * } & Object<string, any>} AudioProcessorSpec
 */