/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


/**
 * MatMath
 * A bare-bones linear algebra library tailored for the specific needs of our IK solver.
 * It handles matrix multiplication and solving linear systems (Ax = b).
 */

/**
 * Transpose a matrix (swap rows and columns)
 */
export function matTranspose(m: Float64Array, rows: number, cols: number) {
    const res = new Float64Array(cols * rows);
    for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
            res[c*rows + r] = m[r*cols + c];
        }
    }
    return res;
}

/**
 * Standard Matrix-Matrix multiplication: C = A * B
 */
export function matMul(A: Float64Array, B: Float64Array, m: number, n: number, p: number) {
    const C = new Float64Array(m * p);
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < p; j++) {
            let sum = 0.0;
            for (let k = 0; k < n; k++) sum += A[i*n + k] * B[k*p + j];
            C[i*p + j] = sum;
        }
    }
    return C;
}

/**
 * Matrix-Vector multiplication: res = A * v
 */
export function matVecMul(A: Float64Array, v: Float64Array | number[], m: number, n: number) {
    const res = new Float64Array(m);
    for (let i = 0; i < m; i++) {
        let sum = 0.0;
        for (let k = 0; k < n; k++) sum += A[i*n + k] * v[k];
        res[i] = sum;
    }
    return res;
}

/**
 * Solves Ax = b using Gaussian elimination with partial pivoting.
 * A_flat is the 'A' matrix flattened into a 1D array.
 */
export function solveLinearSystem(A_flat: Float64Array, b_flat: Float64Array, n: number) {
    // Unflatten A for easier indexing during elimination
    const A: number[][] = []; 
    const B = [...b_flat];
    for(let r=0; r<n; r++) {
        A[r] = Array.from(A_flat.slice(r*n, (r+1)*n));
    }
    const x = new Float64Array(n);
    
    // Forward elimination
    for (let i = 0; i < n; i++) {
        // Find pivot
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
        }
        // Swap rows
        const tempA = A[i]; A[i] = A[maxRow]; A[maxRow] = tempA;
        const tempB = B[i]; B[i] = B[maxRow]; B[maxRow] = tempB;
        
        // Eliminate below
        for (let k = i + 1; k < n; k++) {
            const factor = A[k][i] / A[i][i]; 
            B[k] -= factor * B[i];
            for (let j = i; j < n; j++) {
                A[k][j] -= factor * A[i][j];
            }
        }
    }
    // Back substitution
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0; for (let j = i + 1; j < n; j++) sum += A[i][j] * x[j];
        x[i] = (B[i] - sum) / A[i][i];
    }
    return x;
}
