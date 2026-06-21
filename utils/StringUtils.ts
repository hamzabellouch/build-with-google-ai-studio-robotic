/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { MujocoModel } from "../types";

/**
 * Utils: String decoding helper.
 * MuJoCo, being a C++ engine, stores strings as null-terminated byte arrays in its WASM memory.
 * This helper reads those bytes until it hits a 0 (null terminator) and converts them to a JS string.
 */

// Reads a string from a given memory address in the low-level MuJoCo model
export function getName(mjModel: MujocoModel, address: number): string {
    let name = '';
    let idx = address;
    // Loop until we find the null terminator (0), WITH SAFETY LIMIT.
    // If memory is corrupted, we don't want an infinite loop freezing the browser.
    let safety = 0;
    while (mjModel.names[idx] !== 0 && safety < 100) {
        name += String.fromCharCode(mjModel.names[idx++]);
        safety++;
    }
    return name;
}
