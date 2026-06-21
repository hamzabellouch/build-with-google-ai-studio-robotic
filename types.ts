/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


/**
 * DetectType defines the detection modes available in the application.
 */
export type DetectType = '2D bounding boxes' | 'Points';

/**
 * LogEntry represents a record of a vision model interaction.
 */
export interface LogEntry {
  id: string;
  timestamp: Date;
  imageSrc: string;
  prompt: string;
  fullPrompt: string;
  type: string;
  result: unknown; 
  requestData: unknown; 
}

/**
 * Interface for the result item from detection.
 */
export interface DetectedItem {
  box_2d?: number[];
  point?: number[];
  label?: string;
  [key: string]: unknown;
}

/**
 * Minimal interface for MuJoCo Model to avoid 'any'.
 */
export interface MujocoModel {
  nbody: number;
  ngeom: number;
  nsite: number;
  nu: number;
  njnt: number;
  name_siteadr: Int32Array;
  name_actuatoradr: Int32Array;
  name_bodyadr: Int32Array;
  names: Int8Array;
  jnt_qposadr: Int32Array;
  actuator_trnid: Int32Array;
  geom_group: Int32Array;
  geom_type: Int32Array;
  geom_size: Float64Array; 
  geom_pos: Float64Array;
  geom_quat: Float64Array;
  geom_matid: Int32Array;
  mat_rgba: Float32Array;
  geom_rgba: Float32Array;
  geom_dataid: Int32Array;
  mesh_vertadr: Int32Array;
  mesh_vertnum: Int32Array;
  mesh_faceadr: Int32Array;
  mesh_facenum: Int32Array;
  mesh_vert: Float32Array;
  mesh_face: Int32Array;
  geom_bodyid: Int32Array;
  delete: () => void;
  [key: string]: unknown;
}

/**
 * Minimal interface for MuJoCo Data to avoid 'any'.
 */
export interface MujocoData {
  time: number;
  qpos: Float64Array;
  ctrl: Float64Array;
  xfrc_applied: Float64Array;
  xpos: Float64Array;
  xquat: Float64Array;
  ncon: number;
  contact: unknown;
  site_xpos: Float64Array;
  site_xmat: Float64Array;
  delete: () => void;
  [key: string]: unknown;
}

/**
 * Minimal interface for the MuJoCo WASM Module.
 */
export interface MujocoModule {
  MjModel: { loadFromXML: (path: string) => MujocoModel; [key: string]: unknown };
  MjData: new (model: MujocoModel) => MujocoData;
  MjvOption: new () => { delete: () => void; [key: string]: unknown };
  mj_forward: (m: MujocoModel, d: MujocoData) => void;
  mj_step: (m: MujocoModel, d: MujocoData) => void;
  mj_resetData: (m: MujocoModel, d: MujocoData) => void;
  mjtGeom: Record<string, number | {value: number}>;
  FS: {
      writeFile: (path: string, content: string | Uint8Array) => void;
      mkdir: (path: string) => void;
      unmount: (path: string) => void;
  };
  [key: string]: unknown;
}
