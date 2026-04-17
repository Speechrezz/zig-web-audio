/**
 * AudioParameter spec
 * @typedef {object} ParameterSpecFull
 * @property {number} container_ptr
 * @property {number} index
 * @property {string} id
 * @property {string} name
 * @property {{formatter: any, range: any}} spec
 * @property {number} value
 * @property {number} value_normalized
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
 *   kind: string,
 *   name: string,
 *   id: number,
 *   parameters: any,
 * } & Object<string, any>} AudioProcessorSpec
 */


/**
 * @typedef {{ name: string }} ProcessorDetails
 */