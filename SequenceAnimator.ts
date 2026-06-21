/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import * as THREE from 'three';
import { IkSystem } from './IkSystem';
import { MujocoData, MujocoModel } from './types';

/**
 * SequenceAnimator
 * A simple state machine that automates the robot.
 * Uses Joint Space Interpolation: solves IK for the target Step and interpolates joint angles.
 */
export class SequenceAnimator {
    running = false;
    step = 0; // Current step index in the sequence
    names: string[];  // Human-readable names for each step
    
    private timer = 0;    // Time elapsed in current step
    private duration = 1.0;       // Total duration for current step
    
    private cubeIds: number[] = []; // MuJoCo body IDs of the cubes to pick up (for Live mode)
    private curCubeIdx = 0; // Which cube are we currently trying to pick?
    private droppedCount = 0; // How many cubes have been successfully stacked
    private trayId = -1;    // Body ID of the target tray
    
    // New: Explicit Target Positions (for Blind/ER mode)
    private targetPositions: THREE.Vector3[] = [];
    private markerIds: number[] = [];
    private useLivePosition = false;
    
    // Visual Interpolation start/end points (for the gizmo)
    private startPos = new THREE.Vector3(); 
    private startQuat = new THREE.Quaternion();
    private targetPos = new THREE.Vector3(); 
    private targetQuat = new THREE.Quaternion();
    
    // Joint Interpolation
    private startJoints: number[] = [];
    private targetJoints: number[] = [];
    
    private gripperVal = 0; // 0 = Open/Closed (dependent on model, usually 0=Closed, 255/0.08=Open)
    private isStacking = false;
    
    // Callback to notify app of completion of a single pickup (passes Body ID or Marker ID)
    private onPickupComplete?: (id: number) => void;
    // Callback to notify app when the entire sequence is finished
    private onFinished?: () => void;

    constructor() {
        this.names = ["Move over Cube", "Hover", "Open", "Lower", "Wait", "Grasp", "Wait", "Lift", "Move to Tray", "Lower", "Wait", "Release", "Wait", "Lift", "Return Home"];
    }

    // Initialize by finding the IDs of all cubes and the tray
    init(mjModel: MujocoModel, isStacking: boolean, getName: (addr: number) => string) {
        this.isStacking = isStacking;
        // Default initialization just scans the scene
        this.trayId = -1;
        for (let i = 0; i < mjModel.nbody; i++) {
            const n = getName(mjModel.name_bodyadr[i]);
            if (n === 'stack_base' || (!isStacking && n === 'tray')) this.trayId = i;
        }
    }

    /**
     * Start the sequence.
     * @param targets Can be an array of body IDs (number[]) OR an object with { positions, markerIds } for blind mode.
     */
    start(ikTarget: THREE.Object3D, mjData: MujocoData, ikSystem: IkSystem, 
          targets?: { positions: THREE.Vector3[], markerIds: number[] } | number[], 
          onPickupComplete?: (id: number) => void,
          onFinished?: () => void) {
        
        this.onPickupComplete = onPickupComplete;
        this.onFinished = onFinished;
        
        if (targets && !Array.isArray(targets) && 'positions' in targets) {
             // Static Positions Mode (ER/Blind)
             this.targetPositions = targets.positions;
             this.markerIds = targets.markerIds;
             this.useLivePosition = false;
             this.cubeIds = []; 
        } else {
             // Default / ID mode
             this.useLivePosition = true;
             if (Array.isArray(targets) && targets.length > 0) {
                 this.cubeIds = [...targets];
             } else {
                 this.cubeIds = [];
             }
        }

        // If `init` was called, `trayId` is set. 
        if (this.trayId === -1) return; // No drop zone

        // Safety check
        if (this.useLivePosition && this.cubeIds.length === 0) return;
        if (!this.useLivePosition && this.targetPositions.length === 0) return;
        
        this.running = true; 
        this.step = 0; 
        this.curCubeIdx = 0;
        // NOTE: We do NOT reset droppedCount here. It persists across pickup batches.
        
        this.gripperVal = 0;
        this.prepareStep(ikTarget, mjData, ikSystem);
    }

    stop() {
        this.running = false;
    }

    // Full reset (e.g. when simulation resets)
    reset() {
        this.running = false;
        this.step = 0;
        this.curCubeIdx = 0;
        this.droppedCount = 0;
        this.gripperVal = 0;
    }

    // Called every frame to smoothly move the joints towards destination
    update(dt: number, ikTarget: THREE.Object3D, mjData: MujocoData, gripperId: number, ikSystem: IkSystem) {
        if (!this.running) return;
        
        this.timer += dt;
        // Percentage complete of current step (0.0 to 1.0)
        const p = Math.min(this.timer / this.duration, 1.0);
        
        // Ease-in-out for smoother movement (Smoothstep)
        const ease = p * p * (3 - 2 * p); 
        
        // 1. Joint Space Interpolation
        // We interpolate the actuator commands (ctrl) directly.
        if (this.startJoints.length === 7 && this.targetJoints.length === 7) {
            for(let i=0; i<7; i++) {
                mjData.ctrl[i] = this.startJoints[i] + (this.targetJoints[i] - this.startJoints[i]) * ease;
            }
        }

        // 2. Visual Indicator Interpolation
        // Smart Circular/Cylindrical interpolation for the visual Gizmo
        // This prevents the gizmo from cutting through the robot base during large moves
        if (this.step === 8 || this.step === 0 || this.step === 14) { // Steps involving large moves across workspace
             // Cylindrical Interpolation: Radius, Theta, Z
             const startR = Math.sqrt(this.startPos.x * this.startPos.x + this.startPos.y * this.startPos.y);
             const targetR = Math.sqrt(this.targetPos.x * this.targetPos.x + this.targetPos.y * this.targetPos.y);
             const startTheta = Math.atan2(this.startPos.y, this.startPos.x);
             const targetTheta = Math.atan2(this.targetPos.y, this.targetPos.x);
             
             // Calculate shortest angular path
             const dTheta = targetTheta - startTheta;
             
             const curR = startR + (targetR - startR) * ease;
             const curTheta = startTheta + dTheta * ease;
             const curZ = this.startPos.z + (this.targetPos.z - this.startPos.z) * ease;
             
             ikTarget.position.set(curR * Math.cos(curTheta), curR * Math.sin(curTheta), curZ);
        } else {
             // Standard Linear Interpolation for small moves (up/down)
             ikTarget.position.lerpVectors(this.startPos, this.targetPos, ease);
        }
        
        ikTarget.quaternion.slerpQuaternions(this.startQuat, this.targetQuat, ease);
        
        // Apply gripper command
        if (gripperId !== -1) mjData.ctrl[gripperId] = this.gripperVal;
        
        // If step finished, move to next
        if (p >= 1.0) { 
            this.step++; 
            this.prepareStep(ikTarget, mjData, ikSystem); 
        }
    }

    // Sets up the start/end points and duration for the NEXT step in the sequence
    // AND Solves IK for the target step.
    prepareStep(ikTarget: THREE.Object3D, mjData: MujocoData, ikSystem: IkSystem) {
         // Start visual interpolation from where the gizmo is currently
         this.startPos.copy(ikTarget.position); 
         this.startQuat.copy(ikTarget.quaternion); 
         this.timer = 0;

         // Capture current joints as start
         this.startJoints = [];
         for(let i=0; i<7; i++) this.startJoints.push(mjData.qpos[i]);
         
         // Get current cube position
         const cPos = new THREE.Vector3();
         if (this.useLivePosition && this.curCubeIdx < this.cubeIds.length) {
             // Default mode: Look up physics body position
             const cId = this.cubeIds[this.curCubeIdx];
             cPos.set(mjData.xpos[cId*3], mjData.xpos[cId*3+1], mjData.xpos[cId*3+2]);
         } else if (!this.useLivePosition && this.curCubeIdx < this.targetPositions.length) {
             // Blind mode: Use provided coordinate
             cPos.copy(this.targetPositions[this.curCubeIdx]);
             // Adjust Z: The provided position is likely the surface hit (e.g. top of cube, Z=0.04).
             // The robot TCP (Tool Center Point) needs to be slightly lower to grasp the object securely.
             // We lower it by 2cm.
             cPos.z -= 0.02;
         }

         // Get tray position
         const tPos = new THREE.Vector3(mjData.xpos[this.trayId*3], mjData.xpos[this.trayId*3+1], mjData.xpos[this.trayId*3+2]);
         
         // Default gripper orientation (pointing down)
         const downQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0));
         
         // Calculate drop-off position (higher if stacking)
         const dropPos = tPos.clone();
         let hoverZ = tPos.z + 0.2; 
         let dropZ = tPos.z + 0.05;
         
         if (this.isStacking) {
             // 3x3 Grid Logic (on the floor of the tray)
             // Capacity per layer: 9 cubes (3 rows x 3 cols)
             // layerIdx: vertical layer (0, 1, 2...)
             // posInLayer: 0-8
             
             const layerIdx = Math.floor(this.droppedCount / 9);
             const posInLayer = this.droppedCount % 9;
             
             const row = Math.floor(posInLayer / 3); // 0, 1, 2 (Moves in X direction of tray local frame?)
             const col = posInLayer % 3;             // 0, 1, 2 (Moves in Y direction)
             
             // Offsets: Center is 0,0. Cube size ~0.02 + padding 0.02 -> 0.04 spacing?
             // Using 0.06 spacing for clearance.
             // (row - 1) gives -1, 0, 1
             
             const xOffset = (row - 1) * 0.06;
             const yOffset = (col - 1) * 0.06;
             
             dropPos.x += xOffset;
             dropPos.y += yOffset;
             
             // Base (0.005) + Cube Half (0.02) + Layer * Cube Height (0.04)
             // Plus a small drop offset (0.02) to release slightly above previous cube/floor
             // +0.04 buffer for stacking logic as per original code
             dropZ = 0.005 + 0.02 + (layerIdx * 0.04) + 0.02 + 0.04; 
             
             hoverZ = dropZ + 0.1; 
             dropPos.z = dropZ; 
         }
         
         // Speed multiplier
         const mul = this.isStacking ? 0.8 : 2.0;
         let useExplicitJoints = false;

         // THE SEQUENCE STATE MACHINE (Defines Cartesian Target)
         switch(this.step) {
            case 0: // Move above cube
                this.duration=2*mul; this.targetPos.set(cPos.x, cPos.y, this.startPos.z); this.targetQuat.copy(downQuat); this.gripperVal=0; break;
            case 1: // Lower to hover just above cube
                this.duration=2*mul; this.targetPos.set(cPos.x, cPos.y, cPos.z+0.2); this.targetQuat.copy(downQuat); this.gripperVal=0; break;
            case 2: // Open gripper fully
                this.duration=0.5*mul; this.targetPos.copy(ikTarget.position); this.targetQuat.copy(downQuat); this.gripperVal=255; break;
            case 3: // Lower onto cube
                this.duration=4*mul; this.targetPos.set(cPos.x, cPos.y, cPos.z); this.targetQuat.copy(downQuat); this.gripperVal=255; break;
            case 4: // Wait for physics to settle
                this.duration=2*mul; this.targetPos.copy(ikTarget.position); this.targetQuat.copy(downQuat); this.gripperVal=255; break;
            case 5: // Grasp (close)
                this.duration=0.5*mul; this.targetPos.copy(ikTarget.position); this.targetQuat.copy(downQuat); this.gripperVal=0; break;
            case 6: // Wait for grasp
                this.duration=1.0*mul; this.targetPos.copy(ikTarget.position); this.targetQuat.copy(downQuat); this.gripperVal=0; break;
            case 7: // Lift
                this.duration=2*mul; this.targetPos.set(cPos.x, cPos.y, cPos.z+0.2); this.targetQuat.copy(downQuat); this.gripperVal=0; break;
            case 8: // Move to Tray
                this.duration=8*mul; this.targetPos.set(dropPos.x, dropPos.y, hoverZ); this.targetQuat.copy(downQuat); this.gripperVal=0; break;
            case 9: // Lower to drop position
                this.duration=2*mul; this.targetPos.set(dropPos.x, dropPos.y, dropZ); this.targetQuat.copy(downQuat); this.gripperVal=0; break;
            case 10: // Wait
                this.duration=0.5*mul; this.targetPos.set(dropPos.x, dropPos.y, dropZ); this.targetQuat.copy(downQuat); this.gripperVal=0; break;
            case 11: // Release (Open)
                this.duration=0.5*mul; this.targetPos.set(dropPos.x, dropPos.y, dropZ); this.targetQuat.copy(downQuat); this.gripperVal=255; break;
            case 12: // Wait
                this.duration=1.0*mul; this.targetPos.set(dropPos.x, dropPos.y, dropZ); this.targetQuat.copy(downQuat); this.gripperVal=255; break;
            case 13: // Lift
                this.duration=2*mul; this.targetPos.set(dropPos.x, dropPos.y, hoverZ); this.targetQuat.copy(downQuat); this.gripperVal=255; break;
            
            case 14: // Check next or Return Home
                this.droppedCount++;
                
                // Notify completion for this item
                if (this.onPickupComplete) {
                    if (this.useLivePosition) {
                        this.onPickupComplete(this.cubeIds[this.curCubeIdx]);
                    } else {
                        this.onPickupComplete(this.markerIds[this.curCubeIdx]);
                    }
                }

                this.curCubeIdx++;
                
                // Check if more cubes
                if ((this.useLivePosition && this.curCubeIdx < this.cubeIds.length) || 
                    (!this.useLivePosition && this.curCubeIdx < this.targetPositions.length)) {
                    this.step = 0;
                    this.prepareStep(ikTarget, mjData, ikSystem);
                    return;
                }

                // No more cubes - Return to Home
                this.duration = 2.0;
                this.targetPos.set(0, 0, 0.45);
                this.targetQuat.setFromEuler(new THREE.Euler(Math.PI, 0, 0)); 
                this.gripperVal = 255;

                // EXPLICIT HOME JOINTS (Skip IK)
                // Matches MujocoSim.ts setInitialPose
                this.targetJoints = [1.707, -1.754, 0.003, -2.702, 0.003, 0.951, 2.490]; 
                useExplicitJoints = true;
                break;

            default:
                this.running = false;
                this.step = 0;
                this.curCubeIdx = 0;
                if (this.onFinished) this.onFinished();
                return; // Exit to avoid running IK solver again for invalid step
         }
         
         if (!useExplicitJoints) {
             // SOLVE IK for the NEW target pose
             const sol = ikSystem.solve(this.targetPos, this.targetQuat, this.startJoints);
             if (sol) {
                 this.targetJoints = sol;
             } else {
                 // If no solution, just stay put (safety)
                 this.targetJoints = [...this.startJoints];
                 console.warn(`IK failed for step ${this.step}`);
             }
         }
    }
}
