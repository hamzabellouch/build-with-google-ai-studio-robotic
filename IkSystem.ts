/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { calculateAnalyticalIK } from './FrankaAnalyticalIK';
import { MujocoData, MujocoModel, MujocoModule } from './types';

function squaredDistance(arr1: number[], arr2: number[]) {
    let sum = 0;
    for (let i = 0; i < arr1.length; i++) {
        sum += (arr1[i] - arr2[i]) ** 2;
    }
    return sum;
}

/**
 * IkSystem
 * Handles Inverse Kinematics calculations using the analytical solver.
 */
export class IkSystem {
    target: THREE.Group;
    control: TransformControls;
    
    calculating = false;
    gripperSiteId = -1;
    
    private qNeutral = [0, -0.785, 0, -2.356, 0, 1.571, 0.785]; // Preferred "home" pose
    
    // Joint 7 parameters for redundancy resolution
    // We scan q7 to find the global optimum closest to current/neutral
    private readonly q7Min = -2.8973;
    private readonly q7Max = 2.8973;
    private readonly q7Step = 0.1; 

    constructor(mujoco: MujocoModule, camera: THREE.Camera, domElement: HTMLElement, orbitControls: OrbitControls) {
        this.target = new THREE.Group();
        this.target.name = "IK Target";
        
        // Visual aid for target
        const axes = new THREE.AxesHelper(0.2);
        this.target.add(axes);
        
        this.control = new TransformControls(camera, domElement);
        this.control.addEventListener('dragging-changed', (event) => {
            const e = event as unknown as { value: boolean };
            orbitControls.enabled = !e.value;
        });
        this.control.attach(this.target);
    }
    
    init(mjModel: MujocoModel, isDouble: boolean) {
        // Reset internal state if needed
    }
    
    syncToSite(mjData: MujocoData) {
        if (this.gripperSiteId === -1) return;
        // Get site position and rotation from MuJoCo
        const sitePos = mjData.site_xpos.subarray(this.gripperSiteId * 3, this.gripperSiteId * 3 + 3);
        const siteMat = mjData.site_xmat.subarray(this.gripperSiteId * 9, this.gripperSiteId * 9 + 9);
        
        this.target.position.set(sitePos[0], sitePos[1], sitePos[2]);
        
        const m = new THREE.Matrix4().set(
            siteMat[0], siteMat[1], siteMat[2], 0,
            siteMat[3], siteMat[4], siteMat[5], 0,
            siteMat[6], siteMat[7], siteMat[8], 0,
            0, 0, 0, 1
        );
        this.target.quaternion.setFromRotationMatrix(m);
    }

    /**
     * Solves IK for a specific Cartesian pose.
     * Returns the joint angles (array of 7 numbers) or null if no solution found.
     */
    solve(pos: THREE.Vector3, quat: THREE.Quaternion, currentQ: number[]): number[] | null {
        // Construct transformation matrix
        this.target.position.copy(pos);
        this.target.quaternion.copy(quat);
        this.target.updateMatrixWorld();
        const transform = this.target.matrixWorld;

        // --- Redundancy Resolution Strategy ---
        // 1. Try solution with current q7 (fastest, keeps continuity)
        // 2. If valid, refine locally.
        // 3. If not, scan full range.

        // Weights for cost function: 
        // Minimize (Distance to Current Joints) + (Distance to Neutral Joints)
        const alpha = 1.0; // Continuity weight
        const beta = 0.05;  // Neutrality weight

        let bestSolution: number[] | null = null;
        let minCost = Infinity;

        // Helper to check and update best
        const processCandidateQ7 = (q7: number) => {
             const solutions = calculateAnalyticalIK(transform, q7);
             for (const sol of solutions) {
                 const distCurrent = squaredDistance(sol, currentQ);
                 const distNeutral = squaredDistance(sol, this.qNeutral);
                 const cost = alpha * distCurrent + beta * distNeutral;
                 
                 if (cost < minCost) {
                     minCost = cost;
                     bestSolution = sol;
                 }
             }
        };

        // 1. Try current q7
        const currentQ7 = currentQ[6];
        processCandidateQ7(currentQ7);

        // 2. If no solution or to optimize, scan nearby
        // Simple optimization: Scan range around currentQ7
        const searchRange = 0.5;
        for (let q7 = Math.max(this.q7Min, currentQ7 - searchRange); q7 <= Math.min(this.q7Max, currentQ7 + searchRange); q7 += this.q7Step) {
            processCandidateQ7(q7);
        }

        // 3. Fallback: If still no solution, scan entire range (global search)
        if (!bestSolution) {
             for (let q7 = this.q7Min; q7 <= this.q7Max; q7 += this.q7Step * 2) {
                 processCandidateQ7(q7);
             }
        }

        return bestSolution;
    }
    
    update(mjModel: MujocoModel, mjData: MujocoData) {
        if (!this.calculating) return;
        
        // Prepare current state
        const currentQ = [];
        for(let i=0; i<7; i++) currentQ.push(mjData.qpos[i]);

        // Solve
        const solution = this.solve(this.target.position, this.target.quaternion, currentQ);
        
        if (solution) {
            // Apply solution to control
            for(let i=0; i<7; i++) {
                mjData.ctrl[i] = solution[i];
            }
        }
    }
    
    setCalculating(enabled: boolean) {
        this.calculating = enabled;
    }
    
    setGizmoVisible(visible: boolean) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.control as any).visible = this.control.enabled = visible;
    }
    
    setTargetVisible(visible: boolean) {
        this.target.visible = visible;
    }
    
    setMode(mode: string) {
        // Only freeform implemented
    }
    
    isActuatorIkControlled(id: number) {
        return id >= 0 && id < 7;
    }
    
    dispose() {
        this.control.dispose();
    }
}
