/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import * as THREE from 'three';

// Robot Geometric Constants (Meters)
// Derived from standard Franka Emika Panda DH parameters and the paper.
const d1 = 0.333;
const d3 = 0.316;
const d5 = 0.384;
const dF = 0.107; // Flange
const a4 = 0.0825;
const a5 = -0.0825; // Note: Paper uses absolute value for some calcs, but DH is negative
const a7 = 0.088;

// Distance from Flange to End Effector. 
// In our MuJoCo scene, tcp is offset by 0.1m from the hand/flange connection point.
const dEE = 0.10; 

// Precomputed lengths
const LL24 = Math.sqrt(d3 * d3 + a4 * a4); 
const LL46 = Math.sqrt(d5 * d5 + a5 * a5); 

// Joint Limits (radians)
const Q_MIN = [-2.8973, -1.7628, -2.8973, -3.0718, -2.8973, -0.0175, -2.8973];
const Q_MAX = [ 2.8973,  1.7628,  2.8973, -0.0698,  2.8973,  3.7525,  2.8973];

/**
 * Analytical Inverse Kinematics Solver for Franka Emika Panda.
 * 
 * Based on: "Analytical Inverse Kinematics for Franka Emika Panda – a Geometrical Solver 
 * for 7-DOF Manipulators with Unconventional Design" by Yanhao He and Steven Liu.
 * 
 * @param transform Target transformation matrix (End Effector to World)
 * @param q7 Fixed redundancy parameter (Joint 7 angle)
 * @return Array of valid joint configurations [q1, q2, q3, q4, q5, q6, q7]
 */
export function calculateAnalyticalIK(transform: THREE.Matrix4, q7: number): number[][] {
    const validSolutions: number[][] = [];

    // --- Pre-calculation Setup ---
    
    // Extract Position and Rotation Basis from target transform
    const pEE = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    transform.decompose(pEE, quat, scale);
    const R = new THREE.Matrix4().makeRotationFromQuaternion(quat);
    
    const xEE = new THREE.Vector3();
    const yEE = new THREE.Vector3();
    const zEE = new THREE.Vector3();
    R.extractBasis(xEE, yEE, zEE);

    // 1. Calculate p7 (Wrist Center / Origin of Frame 7)
    // The paper performs calculations relative to the wrist.
    // p7 = pEE - (dF + dEE) * zEE
    // This moves strictly backwards along the EE Z-axis.
    const p7 = pEE.clone().sub(zEE.clone().multiplyScalar(dF + dEE));

    // 2. Calculate p6 (Origin of Frame 6)
    // We need the x-axis of Frame 6.
    // Due to the fixed offset between Flange and EE (pi/4) and joint 7 rotation:
    // alpha = pi/4 - q7. 
    // x6 expressed in EE frame is [cos(alpha), sin(alpha), 0].
    const alpha = Math.PI / 4 - q7;
    const x6_EE = new THREE.Vector3(Math.cos(alpha), Math.sin(alpha), 0);
    const x6 = x6_EE.clone().applyMatrix4(R); // Transform to World Frame

    // p6 = p7 - a7 * x6
    const p6 = p7.clone().sub(x6.clone().multiplyScalar(a7));

    // 3. Solve q4 (Elbow Angle)
    // Consider Triangle O2-O4-O6
    const p2 = new THREE.Vector3(0, 0, d1); // Origin of Frame 2 (Shoulder)
    const p2p6 = p6.clone().sub(p2);
    const L26 = p2p6.length();

    // Check reachability (triangle inequality)
    if (L26 > LL24 + LL46 || L26 < Math.abs(LL24 - LL46)) {
        return []; // Target out of reach for this q7
    }

    // Law of cosines to find internal angle at O4 (gamma)
    const cosGamma = (LL24 * LL24 + LL46 * LL46 - L26 * L26) / (2 * LL24 * LL46);
    // Clamp for numerical stability
    const gamma = Math.acos(Math.max(-1, Math.min(1, cosGamma)));

    // Constant geometry angles
    const angle1 = Math.atan2(d3, a4); 
    const angle2 = Math.atan2(d5, Math.abs(a5));

    // Calculate q4
    // Usually two solutions (elbow up/down), but paper notes one is restricted.
    // We strictly follow Eq 11 form.
    const q4 = angle1 + angle2 + gamma - 2 * Math.PI;

    // Check q4 limit immediately
    if (q4 < Q_MIN[3] || q4 > Q_MAX[3]) return [];

    // 4. Solve q6 (Two cases: B1, B2)
    // We calculate the orientation of Frame 6 to determine q6.
    // Frame 6 basis: x6 (known), y6 = -zEE, z6 = x6 cross y6.
    const y6 = zEE.clone().negate();
    const z6 = new THREE.Vector3().crossVectors(x6, y6);
    
    // Calculate geometric angles for q6 logic
    const cosAlpha = (L26 * L26 + LL46 * LL46 - LL24 * LL24) / (2 * L26 * LL46);
    const ang_O2O6O4 = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));
    
    // Angle HO6O4 is complementary to angle2 in the triangle HO4O6
    const ang_HO6O4 = Math.PI / 2 - angle2;
    const ang_O2O6H = ang_O2O6O4 + ang_HO6O4;

    // Vector algebra to solve q6 (Eq 19)
    // We project O2O6 (which is -p2p6?? No p6-p2) onto the plane normal to z6?
    // Actually we project p6-p2 into Frame 6.
    const vec_O2O6_world = p6.clone().sub(p2);
    const x_inv = x6.dot(vec_O2O6_world);
    const y_inv = y6.dot(vec_O2O6_world);
    // Eq 19: sqrt(x^2 + y^2) * sin(q6 + phi) = L * cos(ang)
    const LHS_amp = Math.sqrt(x_inv * x_inv + y_inv * y_inv);
    const RHS = L26 * Math.cos(ang_O2O6H);

    if (Math.abs(RHS) > LHS_amp) return []; // Should not happen if reachable

    const phi = Math.atan2(y_inv, x_inv);
    const psi = Math.asin(Math.max(-1, Math.min(1, RHS / LHS_amp)));

    // Two potential solutions for q6
    const q6_candidates = [
        Math.PI - psi - phi,
        psi - phi
    ];

    for (let q6 of q6_candidates) {
        // Normalize q6 to range
        q6 = normalizeAngle(q6);
        if (q6 < Q_MIN[5] || q6 > Q_MAX[5]) continue;

        // 5. Solve q1, q2 (Cases C1, C2)
        // We need vector O2P. P is the intersection of axis 5 and 3?
        // Using Eq 26 from paper.
        
        // z5 in Frame 6
        const z5_6 = new THREE.Vector3(Math.sin(q6), Math.cos(q6), 0);
        // z5 in World
        const z5 = x6.clone().multiplyScalar(z5_6.x)
                     .add(y6.clone().multiplyScalar(z5_6.y))
                     .add(z6.clone().multiplyScalar(z5_6.z));
        
        // Calculate length PO6
        const ang_O2O4O6 = gamma;
        const ang_O2O4O3 = angle1;
        const ang_O2O6P = ang_O2O6H;
        
        // Eq 24
        const ang_O2PO6 = ang_O2O6O4 + ang_O2O4O6 + ang_O2O4O3 - ang_O2O6P - Math.PI / 2;
        
        // Eq 25: Law of Sines on O2-P-O6
        // |PO6| = |O2O6| * sin(ang_PO2O6) / sin(ang_O2PO6) ?
        // Sum of angles = PI. ang_PO2O6 = PI - ang_O2PO6 - ang_O2O6P.
        const ang_PO2O6 = Math.PI - ang_O2PO6 - ang_O2O6P;
        const len_PO6 = L26 * Math.sin(ang_PO2O6) / Math.sin(ang_O2PO6);

        // Vector O2P = O2O6 + O6P. 
        // O6P direction is along -z5 (from O6 to P along axis 5)
        const vec_O2P = vec_O2O6_world.clone().sub(z5.clone().multiplyScalar(len_PO6));

        // Solutions for q1, q2
        // C1
        const q1_1 = Math.atan2(vec_O2P.y, vec_O2P.x);
        const q2_1 = Math.acos(Math.max(-1, Math.min(1, vec_O2P.z / vec_O2P.length())));
        
        // C2
        const q1_2 = Math.atan2(-vec_O2P.y, -vec_O2P.x);
        const q2_2 = -Math.acos(Math.max(-1, Math.min(1, vec_O2P.z / vec_O2P.length())));

        const pairs = [[q1_1, q2_1], [q1_2, q2_2]];

        for (const [rawQ1, rawQ2] of pairs) {
            const q1 = normalizeAngle(rawQ1);
            const q2 = normalizeAngle(rawQ2);

            if (q1 < Q_MIN[0] || q1 > Q_MAX[0]) continue;
            if (q2 < Q_MIN[1] || q2 > Q_MAX[1]) continue;

            // 6. Solve q3
            // x3 = y3 cross z3
            const y3 = new THREE.Vector3().crossVectors(vec_O2P, vec_O2O6_world).normalize();
            const z3 = vec_O2P.clone().normalize(); // z3 is along O2P
            const x3 = new THREE.Vector3().crossVectors(y3, z3);

            // Project x3 into Frame 2 to find angle q3
            // R_World_2 = RotZ(q1) * RotX(-90) * RotZ(q2)
            const m1 = new THREE.Matrix4().makeRotationZ(q1);
            const m2 = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
            const m3 = new THREE.Matrix4().makeRotationZ(q2);
            const R2 = m1.multiply(m2).multiply(m3);
            
            const R2_inv = R2.clone().invert();
            const x3_in_2 = x3.clone().applyMatrix4(R2_inv);
            
            let q3 = Math.atan2(x3_in_2.z, x3_in_2.x);
            q3 = normalizeAngle(q3);
            if (q3 < Q_MIN[2] || q3 > Q_MAX[2]) continue;

            // 7. Solve q5
            // pH = p6 - d5 * z5
            const pH = p6.clone().sub(z5.clone().multiplyScalar(d5));
            // p4 = p2 + d3*z3 + a4*x3
            const p4 = p2.clone().add(z3.clone().multiplyScalar(d3)).add(x3.clone().multiplyScalar(a4));
            
            const HO4 = p4.clone().sub(pH);
            
            // Transform HO4 to Frame 6
            const R6 = new THREE.Matrix4().makeBasis(x6, y6, z6);
            const HO4_6 = HO4.clone().applyMatrix4(R6.clone().invert());
            
            // Rotate into Frame 5 (relative to 6 is just rotX(90)rotZ(q6))
            const c6 = Math.cos(q6);
            const s6 = Math.sin(q6);
            // x component in frame 5
            const x5s = c6 * HO4_6.x - s6 * HO4_6.y;
            const y5s = -HO4_6.z;
            
            let q5 = -Math.atan2(y5s, x5s);
            q5 = normalizeAngle(q5);
            if (q5 < Q_MIN[4] || q5 > Q_MAX[4]) continue;

            validSolutions.push([q1, q2, q3, q4, q5, q6, q7]);
        }
    }

    return validSolutions;
}

function normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
}
