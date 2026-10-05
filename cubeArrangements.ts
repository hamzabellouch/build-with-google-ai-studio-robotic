/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CubeArrangement {
  id: string;
  index: number;
  name: string;
  category: 'Geometric' | 'Curves & Waves' | 'Industrial' | 'Symbols' | 'Color Clustered' | 'Celestial' | 'Games & Classics';
  description: string;
  getPositions: () => Array<{ x: number; y: number }>;
}

/**
 * Validates and adjusts a list of 20 2D points to ensure:
 * 1. Reachable by Franka Panda (0.33m <= r <= 0.76m from (0,0))
 * 2. Doesn't intersect stacking base at (0.6, 0) with safe margin 0.22m
 * 3. Minimal overlap separation
 */
function sanitizePoints(rawPoints: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  const result: Array<{ x: number; y: number }> = [];
  const trayX = 0.6;
  const trayY = 0.0;
  const minTrayDist = 0.22;
  const minR = 0.34;
  const maxR = 0.75;
  const minSeparation = 0.045; // 4.5cm between 4cm cubes

  for (let i = 0; i < 20; i++) {
    const raw = rawPoints[i] || { x: -0.45 + (i % 5) * 0.08, y: -0.3 + Math.floor(i / 5) * 0.12 };
    let x = raw.x;
    let y = raw.y;

    // Check reach radius
    let r = Math.hypot(x, y);
    if (r < minR) {
      const angle = Math.atan2(y, x);
      x = minR * Math.cos(angle);
      y = minR * Math.sin(angle);
    } else if (r > maxR) {
      const angle = Math.atan2(y, x);
      x = maxR * Math.cos(angle);
      y = maxR * Math.sin(angle);
    }

    // Check tray clearance
    const distToTray = Math.hypot(x - trayX, y - trayY);
    if (distToTray < minTrayDist) {
      // Push point away from tray towards left or top/bottom
      const pushAngle = Math.atan2(y - trayY, x - trayX);
      x = trayX + minTrayDist * Math.cos(pushAngle);
      y = trayY + minTrayDist * Math.sin(pushAngle);
      // Re-clamp radius
      r = Math.hypot(x, y);
      if (r > maxR) {
        const a = Math.atan2(y, x);
        x = maxR * Math.cos(a);
        y = maxR * Math.sin(a);
      }
    }

    // Separation check against already placed points
    for (let attempt = 0; attempt < 25; attempt++) {
      let collided = false;
      for (const p of result) {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < minSeparation) {
          collided = true;
          // Nudge along normal
          const angle = Math.atan2(y - p.y, x - p.x) + (Math.random() - 0.5) * 0.4;
          x += Math.cos(angle) * (minSeparation - d + 0.01);
          y += Math.sin(angle) * (minSeparation - d + 0.01);
          break;
        }
      }
      if (!collided) break;
    }

    result.push({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) });
  }

  return result;
}

// Helper generators for 20 points
const makeRing = (r: number, startA = 0, arc = Math.PI * 2, cx = 0, cy = 0) => {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 20; i++) {
    const a = startA + (i / 20) * arc;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
};

const makeDualRings = (r1: number, n1: number, r2: number, n2: number) => {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n1; i++) {
    const a = (i / n1) * Math.PI * 2;
    pts.push({ x: r1 * Math.cos(a), y: r1 * Math.sin(a) });
  }
  for (let i = 0; i < n2; i++) {
    const a = (i / n2) * Math.PI * 2 + 0.2;
    pts.push({ x: r2 * Math.cos(a), y: r2 * Math.sin(a) });
  }
  return pts;
};

const makePolygon = (sides: number, radius: number, cx = -0.1, cy = 0) => {
  const pts: Array<{ x: number; y: number }> = [];
  const perSide = Math.ceil(20 / sides);
  const vertices: Array<{ x: number; y: number }> = [];
  for (let s = 0; s < sides; s++) {
    const a = (s / sides) * Math.PI * 2 - Math.PI / 2;
    vertices.push({ x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) });
  }
  for (let s = 0; s < sides && pts.length < 20; s++) {
    const v1 = vertices[s];
    const v2 = vertices[(s + 1) % sides];
    for (let k = 0; k < perSide && pts.length < 20; k++) {
      const t = k / perSide;
      pts.push({ x: v1.x + (v2.x - v1.x) * t, y: v1.y + (v2.y - v1.y) * t });
    }
  }
  return pts;
};

const makeGrid = (rows: number, cols: number, sx = 0.08, sy = 0.08, startX = -0.45, startY = -0.25) => {
  const pts: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (pts.length < 20) {
        pts.push({ x: startX + c * sx, y: startY + r * sy });
      }
    }
  }
  return pts;
};

const makeParametric = (fn: (t: number) => { x: number; y: number }, count = 20) => {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    pts.push(fn(t));
  }
  return pts;
};

// Raw definitions for 108 arrangements
export const CUBE_ARRANGEMENTS: CubeArrangement[] = [
  // ------------------------------------------
  // 1. GEOMETRIC & POLYGONS (16)
  // ------------------------------------------
  {
    id: 'arr-001',
    index: 1,
    name: 'Dual Concentric Rings',
    category: 'Geometric',
    description: 'Two concentric circles with 12 outer and 8 inner orbital positions.',
    getPositions: () => sanitizePoints(makeDualRings(0.68, 12, 0.44, 8))
  },
  {
    id: 'arr-002',
    index: 2,
    name: 'Equilateral Triangle Perimeter',
    category: 'Geometric',
    description: 'Crisp 3-sided triangular layout framing the robot workspace.',
    getPositions: () => sanitizePoints(makePolygon(3, 0.58, -0.05, 0))
  },
  {
    id: 'arr-003',
    index: 3,
    name: 'Perfect Hexagon Frame',
    category: 'Geometric',
    description: 'Regular 6-sided hexagonal honeycomb border around the arm base.',
    getPositions: () => sanitizePoints(makePolygon(6, 0.56, -0.08, 0))
  },
  {
    id: 'arr-004',
    index: 4,
    name: 'Octagonal Perimeter',
    category: 'Geometric',
    description: 'Symmetrical 8-sided geometric perimeter spanning 360 degrees.',
    getPositions: () => sanitizePoints(makePolygon(8, 0.58, -0.05, 0))
  },
  {
    id: 'arr-005',
    index: 5,
    name: 'Square Defensive Box',
    category: 'Geometric',
    description: 'Stately 4-sided square boundary perimeter surrounding the robot.',
    getPositions: () => sanitizePoints(makePolygon(4, 0.54, -0.08, 0))
  },
  {
    id: 'arr-006',
    index: 6,
    name: 'Diamond Rhombus',
    category: 'Geometric',
    description: 'Diamond boundary rotated 45 degrees relative to workspace axes.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      const r = 0.52 / (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a)));
      return { x: -0.08 + r * Math.cos(a) * 1.3, y: r * Math.sin(a) * 1.3 };
    }))
  },
  {
    id: 'arr-007',
    index: 7,
    name: 'Star of David Hexagram',
    category: 'Geometric',
    description: 'Two interlocking equilateral triangles forming a 6-pointed star.',
    getPositions: () => sanitizePoints([
      ...makePolygon(3, 0.52, -0.08, 0).slice(0, 10),
      ...makePolygon(3, 0.52, -0.08, 0).map(p => ({ x: p.x, y: -p.y })).slice(0, 10)
    ])
  },
  {
    id: 'arr-008',
    index: 8,
    name: 'Pentagram Five-Point Star',
    category: 'Geometric',
    description: 'Five-pointed star contour spanning the front hemisphere.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      const r = 0.48 + 0.16 * Math.cos(5 * a);
      return { x: -0.1 + r * Math.cos(a), y: r * Math.sin(a) };
    }))
  },
  {
    id: 'arr-009',
    index: 9,
    name: 'Elliptical Orbit Arc',
    category: 'Geometric',
    description: 'Wide planetary ellipse hugging the outer reach boundaries.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = (t - 0.5) * Math.PI * 1.8;
      return { x: -0.15 + 0.62 * Math.cos(a), y: 0.45 * Math.sin(a) };
    }))
  },
  {
    id: 'arr-010',
    index: 10,
    name: 'Radial Crosshair Spokes',
    category: 'Geometric',
    description: 'Four orthogonal cardinal arms pointing North, South, East, West.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.1, y: 0.38 + i * 0.07 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.1, y: -0.38 - i * 0.07 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.36 - i * 0.07, y: 0.0 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 0.18 + i * 0.06, y: 0.35 }))
    ])
  },
  {
    id: 'arr-011',
    index: 11,
    name: 'Astroid Hypocycloid',
    category: 'Geometric',
    description: 'Four-cusped hypocycloid curve producing an organic star contour.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      const r = 0.55;
      return {
        x: -0.08 + r * Math.pow(Math.cos(a), 3),
        y: r * Math.pow(Math.sin(a), 3)
      };
    }))
  },
  {
    id: 'arr-012',
    index: 12,
    name: 'Deltoid Tri-Cusp',
    category: 'Geometric',
    description: 'Three-cusped hypocycloid forming an aerodynamic triangular loop.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      return {
        x: -0.08 + 0.32 * (2 * Math.cos(a) + Math.cos(2 * a)),
        y: 0.32 * (2 * Math.sin(a) - Math.sin(2 * a))
      };
    }))
  },
  {
    id: 'arr-013',
    index: 13,
    name: 'Cardioid Boundary',
    category: 'Geometric',
    description: 'Mathematical cardioid curve generating a smooth heart-shaped orbit.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      const r = 0.32 * (1 - Math.cos(a));
      return { x: -0.15 - r * Math.cos(a), y: r * Math.sin(a) };
    }))
  },
  {
    id: 'arr-014',
    index: 14,
    name: 'Nephroid Double-Kidney',
    category: 'Geometric',
    description: 'Two-cusped epicycloid generating an elegant two-lobed silhouette.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      return {
        x: -0.08 + 0.28 * (3 * Math.cos(a) - Math.cos(3 * a)),
        y: 0.28 * (3 * Math.sin(a) - Math.sin(3 * a))
      };
    }))
  },
  {
    id: 'arr-015',
    index: 15,
    name: 'Decagon Ring',
    category: 'Geometric',
    description: '10-sided polygon with symmetrically paired dual vertices.',
    getPositions: () => sanitizePoints(makePolygon(10, 0.58, -0.05, 0))
  },
  {
    id: 'arr-016',
    index: 16,
    name: 'Concentric Dual Squares',
    category: 'Geometric',
    description: 'Inner 8-cube square and outer 12-cube square concentric frames.',
    getPositions: () => sanitizePoints([
      ...makePolygon(4, 0.42, -0.08, 0).slice(0, 8),
      ...makePolygon(4, 0.62, -0.08, 0).slice(0, 12)
    ])
  },

  // ------------------------------------------
  // 2. MATHEMATICAL CURVES & WAVES (16)
  // ------------------------------------------
  {
    id: 'arr-017',
    index: 17,
    name: 'Archimedean Golden Spiral',
    category: 'Curves & Waves',
    description: 'Coiling Archimedes spiral expanding from inner to outer reach limit.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 3.5;
      const r = 0.35 + t * 0.35;
      return { x: -0.08 + r * Math.cos(a), y: r * Math.sin(a) };
    }))
  },
  {
    id: 'arr-018',
    index: 18,
    name: 'Fermat Dual Spiral',
    category: 'Curves & Waves',
    description: 'Parabolic Fermat spiral with intertwining dual symmetrical branches.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const branch = t < 0.5 ? 0 : Math.PI;
      const subT = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      const r = 0.35 + Math.sqrt(subT) * 0.35;
      const a = subT * Math.PI * 2.2 + branch;
      return { x: -0.08 + r * Math.cos(a), y: r * Math.sin(a) };
    }))
  },
  {
    id: 'arr-019',
    index: 19,
    name: 'Sine Wave Ripple',
    category: 'Curves & Waves',
    description: 'Harmonic sinusoidal undulating curve across the robot front table.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const y = -0.5 + t * 1.0;
      const x = -0.45 + 0.16 * Math.sin(t * Math.PI * 3.5);
      return { x, y };
    }))
  },
  {
    id: 'arr-020',
    index: 20,
    name: 'Cosine Harmonic Standing Wave',
    category: 'Curves & Waves',
    description: 'Double harmonic oscillation with prominent standing wave nodes.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const y = -0.52 + t * 1.04;
      const x = -0.38 + 0.18 * Math.cos(t * Math.PI * 4);
      return { x, y };
    }))
  },
  {
    id: 'arr-021',
    index: 21,
    name: 'Lissajous Curve 3:2',
    category: 'Curves & Waves',
    description: 'Orthogonal harmonic oscillation with frequency ratio 3 to 2.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      return {
        x: -0.15 + 0.48 * Math.sin(3 * a),
        y: 0.42 * Math.sin(2 * a)
      };
    }))
  },
  {
    id: 'arr-022',
    index: 22,
    name: 'Lissajous Bowtie 2:1',
    category: 'Curves & Waves',
    description: 'Classic figure-8 bowtie pattern generated by 2:1 resonance.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      return {
        x: -0.18 + 0.46 * Math.sin(2 * a),
        y: 0.40 * Math.sin(a)
      };
    }))
  },
  {
    id: 'arr-023',
    index: 23,
    name: 'Lemniscate of Bernoulli',
    category: 'Curves & Waves',
    description: 'True lemniscate figure-eight curve across the front hemisphere.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      const scale = 0.52;
      const denom = 1 + Math.sin(a) * Math.sin(a);
      return {
        x: -0.18 + (scale * Math.cos(a)) / denom,
        y: (scale * Math.sin(a) * Math.cos(a)) / denom * 1.5
      };
    }))
  },
  {
    id: 'arr-024',
    index: 24,
    name: 'Rose Curve 4-Petal Clover',
    category: 'Curves & Waves',
    description: 'Rhodonea 4-petaled rose curve representing a lucky four-leaf clover.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      const r = 0.35 + 0.22 * Math.cos(2 * a);
      return { x: -0.08 + r * Math.cos(a), y: r * Math.sin(a) };
    }))
  },
  {
    id: 'arr-025',
    index: 25,
    name: 'Rose Curve 3-Petal Trifolium',
    category: 'Curves & Waves',
    description: 'Three-leaf clover rhodonea mathematical curve with 120° symmetry.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      const r = 0.36 + 0.22 * Math.cos(3 * a);
      return { x: -0.08 + r * Math.cos(a), y: r * Math.sin(a) };
    }))
  },
  {
    id: 'arr-026',
    index: 26,
    name: 'Damped Oscillator Wave',
    category: 'Curves & Waves',
    description: 'Decaying wave envelope modeling physical mechanical damping.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const y = -0.52 + t * 1.04;
      const amp = 0.24 * Math.exp(-2.2 * t);
      const x = -0.42 + amp * Math.sin(t * Math.PI * 6);
      return { x, y };
    }))
  },
  {
    id: 'arr-027',
    index: 27,
    name: 'Parabolic Ballistic Arc',
    category: 'Curves & Waves',
    description: 'Quadratic parabolic trajectory curve across the workspace.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const y = -0.48 + t * 0.96;
      const x = -0.22 - 0.7 * (y * y);
      return { x, y };
    }))
  },
  {
    id: 'arr-028',
    index: 28,
    name: 'Gaussian Bell Curve Distribution',
    category: 'Curves & Waves',
    description: 'Normal distribution probability density bell curve shape.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const y = -0.46 + t * 0.92;
      const x = -0.55 + 0.3 * Math.exp(-12 * (y * y));
      return { x, y };
    }))
  },
  {
    id: 'arr-029',
    index: 29,
    name: 'Cycloid Rolling Arch',
    category: 'Curves & Waves',
    description: 'Cycloidal arch generated by rolling wheel locus mechanics.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2.2 - 0.2;
      const r = 0.16;
      return {
        x: -0.55 + r * (1 - Math.cos(a)),
        y: -0.48 + r * (a - Math.sin(a)) * 0.8
      };
    }))
  },
  {
    id: 'arr-030',
    index: 30,
    name: 'Hyperbolic Spiral Tail',
    category: 'Curves & Waves',
    description: 'Inverting hyperbolic spiral asymptotically reaching toward infinity.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = 1.0 + t * Math.PI * 2.5;
      const r = Math.min(0.72, 0.45 + (1 / a) * 0.5);
      return { x: -0.08 + r * Math.cos(a), y: r * Math.sin(a) };
    }))
  },
  {
    id: 'arr-031',
    index: 31,
    name: 'Logarithmic Equiangular Spiral',
    category: 'Curves & Waves',
    description: 'Self-similar logarithmic spiral found in galaxies and nautilus shells.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 3.2;
      const r = 0.36 * Math.exp(0.22 * a);
      return { x: -0.08 + r * Math.cos(a), y: r * Math.sin(a) };
    }))
  },
  {
    id: 'arr-032',
    index: 32,
    name: 'Fourier Square Wave Synthesis',
    category: 'Curves & Waves',
    description: 'First two harmonic terms of square wave Fourier series.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const y = -0.5 + t * 1.0;
      const x = -0.42 + 0.15 * (Math.sin(t * Math.PI * 4) + (1 / 3) * Math.sin(3 * t * Math.PI * 4));
      return { x, y };
    }))
  },

  // ------------------------------------------
  // 3. INDUSTRIAL & ROBOTIC BENCHMARKS (16)
  // ------------------------------------------
  {
    id: 'arr-033',
    index: 33,
    name: 'Dual Assembly Conveyor Lines',
    category: 'Industrial',
    description: 'Two parallel production conveyor rows of 10 cubes each.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.52, y: -0.45 + i * 0.1 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.36, y: -0.45 + i * 0.1 }))
    ])
  },
  {
    id: 'arr-034',
    index: 34,
    name: 'Matrix 4x5 Pallet Grid',
    category: 'Industrial',
    description: 'Precision rectangular palletizing grid: 4 columns by 5 rows.',
    getPositions: () => sanitizePoints(makeGrid(4, 5, 0.09, 0.11, -0.58, -0.22))
  },
  {
    id: 'arr-035',
    index: 35,
    name: 'Staggered Brickwork Formation',
    category: 'Industrial',
    description: 'Interleaved brick bond formation optimized for automated packing.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.55, y: -0.25 + i * 0.12 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.45, y: -0.19 + i * 0.12 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.35, y: -0.25 + i * 0.12 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.25, y: -0.19 + i * 0.12 }))
    ])
  },
  {
    id: 'arr-036',
    index: 36,
    name: 'Warehouse Staging Bays',
    category: 'Industrial',
    description: 'Organized logistical dispatch bays arranged in dual flanks.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.52 + (i % 2) * 0.12, y: -0.5 + Math.floor(i / 2) * 0.11 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: 0.1 + (i % 2) * 0.11, y: 0.35 + Math.floor(i / 2) * 0.08 }))
    ])
  },
  {
    id: 'arr-037',
    index: 37,
    name: 'Industrial Zigzag Serpentine',
    category: 'Industrial',
    description: 'Continuous S-curve serpentine lane for conveyor sorting validation.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const row = Math.floor(t * 4);
      const frac = (t * 4) % 1;
      const x = -0.55 + row * 0.1;
      const y = (row % 2 === 0 ? -0.4 + frac * 0.8 : 0.4 - frac * 0.8);
      return { x, y };
    }))
  },
  {
    id: 'arr-038',
    index: 38,
    name: 'Chevron Arrowhead Fleet',
    category: 'Industrial',
    description: 'V-shaped aerodynamic chevron formation pointing forward.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.2 - i * 0.045, y: i * 0.055 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.2 - i * 0.045, y: -i * 0.055 }))
    ])
  },
  {
    id: 'arr-039',
    index: 39,
    name: 'Runway Centerline & Dual Flanks',
    category: 'Industrial',
    description: 'Aviation landing lights pattern with 8 centerline and 12 flank markers.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 8 }, (_, i) => ({ x: -0.42, y: -0.42 + i * 0.12 })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: -0.56, y: -0.35 + i * 0.14 })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: -0.28, y: -0.35 + i * 0.14 }))
    ])
  },
  {
    id: 'arr-040',
    index: 40,
    name: 'Circular Caliper Gauge',
    category: 'Industrial',
    description: 'Precision micrometer circular tick marks spanning 240 degrees.',
    getPositions: () => sanitizePoints(makeRing(0.55, -Math.PI * 0.8, Math.PI * 1.6, -0.05, 0))
  },
  {
    id: 'arr-041',
    index: 41,
    name: 'Outer Reach Envelope Boundary',
    category: 'Industrial',
    description: 'Cubes positioned at the outer 0.72m boundary to test max extension.',
    getPositions: () => sanitizePoints(makeRing(0.70, -Math.PI * 0.7, Math.PI * 1.4, -0.05, 0))
  },
  {
    id: 'arr-042',
    index: 42,
    name: 'Inner Reach Envelope Standoff',
    category: 'Industrial',
    description: 'Tight inner ring at 0.36m testing minimum arm retraction reach.',
    getPositions: () => sanitizePoints(makeRing(0.38, -Math.PI * 0.8, Math.PI * 1.6, -0.02, 0))
  },
  {
    id: 'arr-043',
    index: 43,
    name: 'Singularity Stress Arc',
    category: 'Industrial',
    description: 'Critical trajectory arc challenging wrist singularity boundaries.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = -Math.PI * 0.5 + t * Math.PI;
      const r = 0.42 + 0.28 * Math.sin(t * Math.PI);
      return { x: -0.1 + r * Math.cos(a), y: r * Math.sin(a) };
    }))
  },
  {
    id: 'arr-044',
    index: 44,
    name: 'Dual Slalom Obstacle Gates',
    category: 'Industrial',
    description: 'Two staggered slalom gate rows for collision avoidance benchmark.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.50, y: -0.45 + i * 0.10 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.32, y: -0.40 + i * 0.10 }))
    ])
  },
  {
    id: 'arr-045',
    index: 45,
    name: 'Radial Depth Gradient',
    category: 'Industrial',
    description: 'Four depth sectors stepping outward from 0.38m to 0.70m radius.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.38, y: -0.2 + i * 0.1 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.48, y: -0.25 + i * 0.12 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.58, y: -0.28 + i * 0.14 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.68, y: -0.30 + i * 0.15 }))
    ])
  },
  {
    id: 'arr-046',
    index: 46,
    name: 'Symmetrical Dual Wings',
    category: 'Industrial',
    description: 'Two balanced 10-cube symmetrical wings branching to the flanks.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.25 - i * 0.04, y: 0.22 + i * 0.045 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.25 - i * 0.04, y: -0.22 - i * 0.045 }))
    ])
  },
  {
    id: 'arr-047',
    index: 47,
    name: 'High-Density Forward Staging',
    category: 'Industrial',
    description: 'Compact 4x5 cluster situated right in the center grasp sweet spot.',
    getPositions: () => sanitizePoints(makeGrid(4, 5, 0.065, 0.065, -0.45, -0.15))
  },
  {
    id: 'arr-048',
    index: 48,
    name: 'Radial Spokes Starburst',
    category: 'Industrial',
    description: 'Five radial spokes projecting symmetrically from central workspace.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const spoke = Math.floor(t * 5);
      const sub = (t * 5) % 1;
      const angle = (spoke / 5) * Math.PI * 2;
      const r = 0.38 + sub * 0.30;
      return { x: -0.08 + r * Math.cos(angle), y: r * Math.sin(angle) };
    }))
  },

  // ------------------------------------------
  // 4. SYMBOLS & ICONIC SHAPES (16)
  // ------------------------------------------
  {
    id: 'arr-049',
    index: 49,
    name: 'Heart Silhouette',
    category: 'Symbols',
    description: 'Romantic heart silhouette arranged in the front table quadrant.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(a), 3);
      const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
      return { x: -0.35 + (y / 18) * 0.38, y: (x / 18) * 0.42 };
    }))
  },
  {
    id: 'arr-050',
    index: 50,
    name: 'Five-Point Star Emblem',
    category: 'Symbols',
    description: 'Clean patriotic 5-point star emblem with 10 alternating tips & valleys.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2 - Math.PI / 2;
      const r = 0.48 + 0.18 * Math.cos(5 * a);
      return { x: -0.08 + r * Math.cos(a), y: r * Math.sin(a) };
    }))
  },
  {
    id: 'arr-051',
    index: 51,
    name: 'Smiley Face Curve',
    category: 'Symbols',
    description: 'Joyful wide smile curve with dual accent eye coordinates.',
    getPositions: () => sanitizePoints([
      { x: -0.28, y: -0.22 }, { x: -0.28, y: -0.16 }, // Left eye
      { x: -0.28, y: 0.16 }, { x: -0.28, y: 0.22 },   // Right eye
      ...Array.from({ length: 16 }, (_, i) => {
        const a = Math.PI * 0.15 + (i / 15) * Math.PI * 0.7;
        return { x: -0.42 - 0.22 * Math.sin(a), y: 0.45 * Math.cos(a) };
      })
    ])
  },
  {
    id: 'arr-052',
    index: 52,
    name: 'Infinity Loop Symbol (∞)',
    category: 'Symbols',
    description: 'Continuous figure-eight infinity loop symbolizing perpetual cycles.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      return {
        x: -0.32 + 0.22 * Math.sin(a) * Math.cos(a) * 1.8,
        y: 0.44 * Math.sin(a)
      };
    }))
  },
  {
    id: 'arr-053',
    index: 53,
    name: 'Crescent Moon Arc',
    category: 'Symbols',
    description: 'Slender nocturnal crescent moon silhouette with tapering horns.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 12 }, (_, i) => {
        const a = -Math.PI * 0.5 + (i / 11) * Math.PI;
        return { x: -0.15 + 0.55 * Math.cos(a), y: 0.55 * Math.sin(a) };
      }),
      ...Array.from({ length: 8 }, (_, i) => {
        const a = Math.PI * 0.4 - (i / 7) * Math.PI * 0.8;
        return { x: -0.28 + 0.38 * Math.cos(a), y: 0.38 * Math.sin(a) };
      })
    ])
  },
  {
    id: 'arr-054',
    index: 54,
    name: 'Compass Rose 4-Point',
    category: 'Symbols',
    description: 'Navigational compass rose with elongated cardinal navigation points.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      const r = 0.42 + 0.24 * Math.pow(Math.abs(Math.cos(2 * a)), 2);
      return { x: -0.08 + r * Math.cos(a), y: r * Math.sin(a) };
    }))
  },
  {
    id: 'arr-055',
    index: 55,
    name: 'Anchor Marine Pattern',
    category: 'Symbols',
    description: 'Maritime anchor with central shaft, crossbar, and sweeping curved flukes.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 8 }, (_, i) => ({ x: -0.18 - i * 0.06, y: 0.0 })), // Shaft
      ...Array.from({ length: 4 }, (_, i) => ({ x: -0.28, y: -0.18 + i * 0.12 })), // Crossbar
      ...Array.from({ length: 8 }, (_, i) => { // Flukes arc
        const a = Math.PI * 0.15 + (i / 7) * Math.PI * 0.7;
        return { x: -0.58 + 0.15 * Math.sin(a), y: 0.32 * Math.cos(a) };
      })
    ])
  },
  {
    id: 'arr-056',
    index: 56,
    name: 'Lightning Bolt Zigzag',
    category: 'Symbols',
    description: 'Energetic high-voltage zigzag lightning strike across the table.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 7 }, (_, i) => ({ x: -0.20 - i * 0.04, y: 0.35 - i * 0.07 })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: -0.44 + i * 0.03, y: -0.07 + i * 0.04 })),
      ...Array.from({ length: 7 }, (_, i) => ({ x: -0.32 - i * 0.045, y: 0.17 - i * 0.07 }))
    ])
  },
  {
    id: 'arr-057',
    index: 57,
    name: 'Royal Crown Arch',
    category: 'Symbols',
    description: 'Regal crown with 5 peaks and decorative base foundation ring.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.54, y: -0.4 + i * 0.088 })), // Base
      ...Array.from({ length: 10 }, (_, i) => { // 5 peaks
        const p = i % 2 === 0 ? -0.38 : -0.45;
        return { x: p, y: -0.38 + i * 0.084 };
      })
    ])
  },
  {
    id: 'arr-058',
    index: 58,
    name: 'Directional Arrowhead',
    category: 'Symbols',
    description: 'Forward pointer arrow with a 10-cube shaft and 10-cube barbed tip.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.22 - i * 0.045, y: 0.0 })), // Shaft
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.22 - i * 0.04, y: 0.06 + i * 0.06 })), // Top barb
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.22 - i * 0.04, y: -0.06 - i * 0.06 })) // Bottom barb
    ])
  },
  {
    id: 'arr-059',
    index: 59,
    name: 'Hourglass Chronometer',
    category: 'Symbols',
    description: 'Double conical hourglass silhouette meeting at a central constriction.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => {
        const t = i / 9;
        return { x: -0.6 + t * 0.22, y: -0.35 + t * 0.35 };
      }),
      ...Array.from({ length: 10 }, (_, i) => {
        const t = i / 9;
        return { x: -0.38 + t * 0.22, y: -0.0 + t * 0.35 };
      })
    ])
  },
  {
    id: 'arr-060',
    index: 60,
    name: 'Greek Omega Arch (Ω)',
    category: 'Symbols',
    description: 'Iconic Greek letter Omega horseshoe arch with dual side feet.',
    getPositions: () => sanitizePoints([
      { x: -0.55, y: -0.42 }, { x: -0.55, y: -0.35 }, // Left foot
      ...Array.from({ length: 16 }, (_, i) => {
        const a = Math.PI * 0.85 - (i / 15) * Math.PI * 1.7;
        return { x: -0.25 + 0.35 * Math.cos(a), y: 0.35 * Math.sin(a) };
      }),
      { x: -0.55, y: 0.35 }, { x: -0.55, y: 0.42 }   // Right foot
    ])
  },
  {
    id: 'arr-061',
    index: 61,
    name: 'Knight Shield Perimeter',
    category: 'Symbols',
    description: 'Heraldic medieval knight shield outline tapering to a base point.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 6 }, (_, i) => ({ x: -0.25, y: -0.30 + i * 0.12 })), // Top flat
      ...Array.from({ length: 7 }, (_, i) => { // Left taper
        const t = i / 6;
        return { x: -0.25 - t * 0.35, y: -0.30 + t * 0.30 };
      }),
      ...Array.from({ length: 7 }, (_, i) => { // Right taper
        const t = i / 6;
        return { x: -0.25 - t * 0.35, y: 0.30 - t * 0.30 };
      })
    ])
  },
  {
    id: 'arr-062',
    index: 62,
    name: 'Keyhole Mystery Silhouette',
    category: 'Symbols',
    description: 'Vintage keyhole shape with top circular head and flared bottom slot.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return { x: -0.28 + 0.22 * Math.cos(a), y: 0.22 * Math.sin(a) };
      }),
      ...Array.from({ length: 4 }, (_, i) => ({ x: -0.48 - i * 0.05, y: -0.15 - i * 0.03 })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: -0.48 - i * 0.05, y: 0.15 + i * 0.03 }))
    ])
  },
  {
    id: 'arr-063',
    index: 63,
    name: 'Diamond Solitaire Ring',
    category: 'Symbols',
    description: 'Circular ring band crowned by a faceted diamond solitaire gem.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 1.8 + Math.PI * 0.1;
        return { x: -0.35 + 0.28 * Math.cos(a), y: 0.28 * Math.sin(a) };
      }),
      ...Array.from({ length: 6 }, (_, i) => ({ x: -0.12 - (i % 2) * 0.06, y: -0.1 + i * 0.04 }))
    ])
  },
  {
    id: 'arr-064',
    index: 64,
    name: 'Trefoil Knot Projection',
    category: 'Symbols',
    description: 'Topological trefoil knot projection featuring 3 intertwined lobes.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      return {
        x: -0.12 + 0.32 * (Math.sin(a) + 2 * Math.sin(2 * a)),
        y: 0.28 * (Math.cos(a) - 2 * Math.cos(2 * a))
      };
    }))
  },

  // ------------------------------------------
  // 5. COLOR-SORTED & CLUSTERED (16)
  // ------------------------------------------
  {
    id: 'arr-065',
    index: 65,
    name: 'Four Color Quadrants',
    category: 'Color Clustered',
    description: 'Red, Cyan, Green, and Yellow grouped cleanly into 4 distinct quadrants.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.52 + (i % 2) * 0.08, y: 0.25 + Math.floor(i / 2) * 0.08 })), // Q1
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.52 + (i % 2) * 0.08, y: -0.38 + Math.floor(i / 2) * 0.08 })), // Q2
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.30 + (i % 2) * 0.08, y: 0.25 + Math.floor(i / 2) * 0.08 })),  // Q3
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.30 + (i % 2) * 0.08, y: -0.38 + Math.floor(i / 2) * 0.08 }))  // Q4
    ])
  },
  {
    id: 'arr-066',
    index: 66,
    name: 'Color Spectral Gradient Arc',
    category: 'Color Clustered',
    description: 'Continuous chromatic rainbow arc moving smoothly through hues.',
    getPositions: () => sanitizePoints(makeRing(0.58, -Math.PI * 0.7, Math.PI * 1.4, -0.05, 0))
  },
  {
    id: 'arr-067',
    index: 67,
    name: 'Four Color Parallel Lanes',
    category: 'Color Clustered',
    description: 'Four parallel linear lanes with 5 cubes of matching color per lane.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.60, y: -0.28 + i * 0.14 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.48, y: -0.28 + i * 0.14 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.36, y: -0.28 + i * 0.14 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.24, y: -0.28 + i * 0.14 }))
    ])
  },
  {
    id: 'arr-068',
    index: 68,
    name: 'Concentric Color Rings',
    category: 'Color Clustered',
    description: 'Nested color rings with yellow inside, green mid, and red outside.',
    getPositions: () => sanitizePoints([
      ...makeRing(0.40, 0, Math.PI * 2, -0.05, 0).slice(0, 5),
      ...makeRing(0.50, 0.2, Math.PI * 2, -0.05, 0).slice(0, 5),
      ...makeRing(0.60, 0.4, Math.PI * 2, -0.05, 0).slice(0, 5),
      ...makeRing(0.70, 0.6, Math.PI * 2, -0.05, 0).slice(0, 5)
    ])
  },
  {
    id: 'arr-069',
    index: 69,
    name: 'Tri-Color Forward Outposts',
    category: 'Color Clustered',
    description: 'Three strategic forward color clusters positioned for rapid sorting.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 7 }, (_, i) => ({ x: -0.55 + (i % 2) * 0.08, y: -0.32 + Math.floor(i / 2) * 0.08 })),
      ...Array.from({ length: 7 }, (_, i) => ({ x: -0.38 + (i % 2) * 0.08, y: -0.08 + Math.floor(i / 2) * 0.08 })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: -0.55 + (i % 2) * 0.08, y: 0.20 + Math.floor(i / 2) * 0.08 }))
    ])
  },
  {
    id: 'arr-070',
    index: 70,
    name: 'Checkerboard Alternating Band',
    category: 'Color Clustered',
    description: 'Alternating dual-line checkerboard with high-contrast color steps.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.48, y: -0.45 + i * 0.10 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.38, y: -0.40 + i * 0.10 }))
    ])
  },
  {
    id: 'arr-071',
    index: 71,
    name: 'Spectral Radial Spoke Pairs',
    category: 'Color Clustered',
    description: 'Color-segregated spoke pairs radiating from 0 to 180 degrees.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const spoke = Math.floor(t * 4);
      const sub = (t * 4) % 1;
      const a = -Math.PI * 0.7 + (spoke / 3) * Math.PI * 1.4;
      const r = 0.38 + sub * 0.30;
      return { x: -0.08 + r * Math.cos(a), y: r * Math.sin(a) };
    }))
  },
  {
    id: 'arr-072',
    index: 72,
    name: 'Diagonal Color Cascade',
    category: 'Color Clustered',
    description: 'Diagonal staircase waves descending across table coordinates.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.65 + i * 0.06, y: -0.40 + i * 0.06 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.55 + i * 0.06, y: -0.25 + i * 0.06 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.45 + i * 0.06, y: -0.10 + i * 0.06 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.35 + i * 0.06, y: 0.05 + i * 0.06 }))
    ])
  },
  {
    id: 'arr-073',
    index: 73,
    name: 'Four Corner Fortresses',
    category: 'Color Clustered',
    description: 'Four fortified 5-cube corner bastions at the outer quadrant limits.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.62 + (i % 2) * 0.07, y: 0.30 + Math.floor(i / 2) * 0.07 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.62 + (i % 2) * 0.07, y: -0.42 + Math.floor(i / 2) * 0.07 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.25 + (i % 2) * 0.07, y: 0.30 + Math.floor(i / 2) * 0.07 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.25 + (i % 2) * 0.07, y: -0.42 + Math.floor(i / 2) * 0.07 }))
    ])
  },
  {
    id: 'arr-074',
    index: 74,
    name: 'Warm vs Cool Hemispheres',
    category: 'Color Clustered',
    description: 'Warm colors (Red, Yellow) in left hemisphere, cool (Cyan, Green) in right.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.55 + (i % 2) * 0.1, y: -0.45 + Math.floor(i / 2) * 0.09 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.32 + (i % 2) * 0.1, y: 0.05 + Math.floor(i / 2) * 0.09 }))
    ])
  },
  {
    id: 'arr-075',
    index: 75,
    name: 'Swirling Color Tornado',
    category: 'Color Clustered',
    description: 'Dynamic vortex whirlpool with color trails swirling inward.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 4;
      const r = 0.38 + (1 - t) * 0.32;
      return { x: -0.12 + r * Math.cos(a), y: r * Math.sin(a) };
    }))
  },
  {
    id: 'arr-076',
    index: 76,
    name: 'Color Spectrum Dual Arcs',
    category: 'Color Clustered',
    description: 'Two nested concentric rainbow arcs spanning the frontal horizon.',
    getPositions: () => sanitizePoints([
      ...makeRing(0.64, -Math.PI * 0.65, Math.PI * 1.3, -0.05, 0).slice(0, 10),
      ...makeRing(0.46, -Math.PI * 0.65, Math.PI * 1.3, -0.05, 0).slice(0, 10)
    ])
  },
  {
    id: 'arr-077',
    index: 77,
    name: 'Rotating Color Pinwheel',
    category: 'Color Clustered',
    description: 'Four curved turbine blades of 5 cubes each spinning counter-clockwise.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const blade = Math.floor(t * 4);
      const sub = (t * 4) % 1;
      const baseA = (blade / 4) * Math.PI * 2;
      const a = baseA + sub * 0.8;
      const r = 0.36 + sub * 0.30;
      return { x: -0.08 + r * Math.cos(a), y: r * Math.sin(a) };
    }))
  },
  {
    id: 'arr-078',
    index: 78,
    name: 'Four Color Diamond Clusters',
    category: 'Color Clustered',
    description: 'Four diamond-shaped clusters centered at cardinal compass points.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.55 + (i === 1 ? -0.07 : i === 2 ? 0.07 : 0), y: (i === 3 ? -0.07 : i === 4 ? 0.07 : 0) })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.35 + (i === 1 ? -0.07 : i === 2 ? 0.07 : 0), y: 0.30 + (i === 3 ? -0.07 : i === 4 ? 0.07 : 0) })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.35 + (i === 1 ? -0.07 : i === 2 ? 0.07 : 0), y: -0.30 + (i === 3 ? -0.07 : i === 4 ? 0.07 : 0) })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.18 + (i === 1 ? -0.07 : i === 2 ? 0.07 : 0), y: (i === 3 ? -0.07 : i === 4 ? 0.07 : 0) }))
    ])
  },
  {
    id: 'arr-079',
    index: 79,
    name: 'Color Interleaved Zipper',
    category: 'Color Clustered',
    description: 'Alternating color teeth meshing together along central midline.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.42, y: -0.45 + i * 0.10 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.34, y: -0.40 + i * 0.10 }))
    ])
  },
  {
    id: 'arr-080',
    index: 80,
    name: 'Color Target Rings (Concentric Bands)',
    category: 'Color Clustered',
    description: 'Target bullseye rings partitioned by alternating color groups.',
    getPositions: () => sanitizePoints(makeDualRings(0.60, 10, 0.42, 10))
  },

  // ------------------------------------------
  // 6. CELESTIAL & ASTRODYNAMIC (14)
  // ------------------------------------------
  {
    id: 'arr-081',
    index: 81,
    name: 'Solar System Planetary Orbits',
    category: 'Celestial',
    description: 'Keplerian orbital bands modeling planetary orbits around a sun.',
    getPositions: () => sanitizePoints([
      ...makeRing(0.38, 0, Math.PI * 2, -0.05, 0).slice(0, 4),
      ...makeRing(0.48, 0.3, Math.PI * 2, -0.05, 0).slice(0, 5),
      ...makeRing(0.58, 0.6, Math.PI * 2, -0.05, 0).slice(0, 5),
      ...makeRing(0.68, 0.9, Math.PI * 2, -0.05, 0).slice(0, 6)
    ])
  },
  {
    id: 'arr-082',
    index: 82,
    name: 'Saturn Majestic Ring System',
    category: 'Celestial',
    description: 'Tilted elliptical ring plane mimicking Saturn’s celestial rings.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 2;
      return {
        x: -0.15 + 0.62 * Math.cos(a),
        y: 0.28 * Math.sin(a)
      };
    }))
  },
  {
    id: 'arr-083',
    index: 83,
    name: 'Dual-Arm Spiral Galaxy',
    category: 'Celestial',
    description: 'Milky Way twin spiral arms winding outward from a galactic core.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 1.8;
        const r = 0.36 + (i / 10) * 0.34;
        return { x: -0.08 + r * Math.cos(a), y: r * Math.sin(a) };
      }),
      ...Array.from({ length: 10 }, (_, i) => {
        const a = Math.PI + (i / 10) * Math.PI * 1.8;
        const r = 0.36 + (i / 10) * 0.34;
        return { x: -0.08 + r * Math.cos(a), y: r * Math.sin(a) };
      })
    ])
  },
  {
    id: 'arr-084',
    index: 84,
    name: "Orion's Belt & Nebula",
    category: 'Celestial',
    description: "Iconic 3-star belt flanked by Betelgeuse, Rigel, and sword clusters.",
    getPositions: () => sanitizePoints([
      { x: -0.42, y: -0.08 }, { x: -0.42, y: 0.0 }, { x: -0.42, y: 0.08 }, // Belt
      { x: -0.62, y: -0.28 }, { x: -0.62, y: 0.28 }, // Betelgeuse & Bellatrix
      { x: -0.25, y: -0.30 }, { x: -0.25, y: 0.30 }, // Rigel & Saiph
      ...Array.from({ length: 13 }, (_, i) => ({
        x: -0.48 - (i % 3) * 0.06,
        y: -0.15 + Math.floor(i / 3) * 0.07
      }))
    ])
  },
  {
    id: 'arr-085',
    index: 85,
    name: 'Big Dipper Ursa Major',
    category: 'Celestial',
    description: 'The seven stars of the Big Dipper constellation plus celestial field.',
    getPositions: () => sanitizePoints([
      // Dipper bowl
      { x: -0.42, y: 0.1 }, { x: -0.54, y: 0.1 }, { x: -0.54, y: 0.28 }, { x: -0.42, y: 0.24 },
      // Dipper handle
      { x: -0.38, y: 0.0 }, { x: -0.34, y: -0.12 }, { x: -0.28, y: -0.24 },
      // Surrounding stars
      ...Array.from({ length: 13 }, (_, i) => ({
        x: -0.62 + (i % 4) * 0.09,
        y: -0.4 + Math.floor(i / 4) * 0.18
      }))
    ])
  },
  {
    id: 'arr-086',
    index: 86,
    name: 'Cassiopeia W Constellation',
    category: 'Celestial',
    description: 'Prominent zigzag W-formation of Queen Cassiopeia constellation.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 5 }, (_, i) => {
        const coords = [
          { x: -0.6, y: -0.35 },
          { x: -0.45, y: -0.18 },
          { x: -0.55, y: 0.0 },
          { x: -0.42, y: 0.2 },
          { x: -0.58, y: 0.38 }
        ];
        return coords[i];
      }),
      ...Array.from({ length: 15 }, (_, i) => ({
        x: -0.32 - (i % 3) * 0.08,
        y: -0.38 + Math.floor(i / 3) * 0.15
      }))
    ])
  },
  {
    id: 'arr-087',
    index: 87,
    name: 'Pleiades Seven Sisters Cluster',
    category: 'Celestial',
    description: 'Dense open star cluster with 7 primary stars and surrounding halo.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return { x: -0.45 + 0.12 * Math.cos(a), y: 0.12 * Math.sin(a) };
      }),
      ...Array.from({ length: 13 }, (_, i) => {
        const a = (i / 13) * Math.PI * 2;
        return { x: -0.45 + 0.25 * Math.cos(a), y: 0.25 * Math.sin(a) };
      })
    ])
  },
  {
    id: 'arr-088',
    index: 88,
    name: 'Supernova Radial Shockwave',
    category: 'Celestial',
    description: 'Expanding radial blast shell simulating a supernova explosion.',
    getPositions: () => sanitizePoints(makeRing(0.60, 0, Math.PI * 2, -0.08, 0))
  },
  {
    id: 'arr-089',
    index: 89,
    name: 'Comet Nucleus & Ion Tail',
    category: 'Celestial',
    description: 'Hyperbolic comet head accompanied by an elongated parabolic ion tail.',
    getPositions: () => sanitizePoints([
      // Head cluster
      { x: -0.22, y: 0.0 }, { x: -0.25, y: 0.04 }, { x: -0.25, y: -0.04 },
      // Tail streams
      ...Array.from({ length: 17 }, (_, i) => {
        const t = (i + 1) / 18;
        const spread = (i % 2 === 0 ? 1 : -1) * (0.05 + t * 0.35);
        return { x: -0.25 - t * 0.45, y: spread };
      })
    ])
  },
  {
    id: 'arr-090',
    index: 90,
    name: 'Binary Star Orbital Halo',
    category: 'Celestial',
    description: 'Gravitational Roche lobe halo surrounding two orbiting stellar cores.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return { x: -0.45 + 0.18 * Math.cos(a), y: -0.15 + 0.18 * Math.sin(a) };
      }),
      ...Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return { x: -0.45 + 0.18 * Math.cos(a), y: 0.15 + 0.18 * Math.sin(a) };
      })
    ])
  },
  {
    id: 'arr-091',
    index: 91,
    name: 'Black Hole Event Horizon & Jet',
    category: 'Celestial',
    description: 'Accretion disk ring bisected by relativistic perpendicular jets.',
    getPositions: () => sanitizePoints([
      // Accretion disk
      ...Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return { x: -0.45 + 0.22 * Math.cos(a), y: 0.22 * Math.sin(a) };
      }),
      // Relativistic polar jets
      ...Array.from({ length: 4 }, (_, i) => ({ x: -0.45, y: 0.28 + i * 0.08 })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: -0.45, y: -0.28 - i * 0.08 }))
    ])
  },
  {
    id: 'arr-092',
    index: 92,
    name: 'Pulsar Beaming Columns',
    category: 'Celestial',
    description: 'Dual collimated electromagnetic radiation beams sweeping in space.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.25 - i * 0.045, y: 0.15 + i * 0.03 })),
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.25 - i * 0.045, y: -0.15 - i * 0.03 }))
    ])
  },
  {
    id: 'arr-093',
    index: 93,
    name: 'Zodiac Celestial Arc',
    category: 'Celestial',
    description: 'Wide ecliptic celestial dome arc spanning from East to West horizon.',
    getPositions: () => sanitizePoints(makeRing(0.68, -Math.PI * 0.8, Math.PI * 1.6, -0.05, 0))
  },
  {
    id: 'arr-094',
    index: 94,
    name: 'Meteor Shower Radiant',
    category: 'Celestial',
    description: 'Parallel shooting star meteor streaks raining down on workspace.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.25 - i * 0.07, y: -0.35 + i * 0.02 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.25 - i * 0.07, y: -0.12 + i * 0.02 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.25 - i * 0.07, y: 0.12 + i * 0.02 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.25 - i * 0.07, y: 0.35 + i * 0.02 }))
    ])
  },

  // ------------------------------------------
  // 7. GAMES & CLASSICS (14)
  // ------------------------------------------
  {
    id: 'arr-095',
    index: 95,
    name: 'Billiards 15-Ball Triangle Rack',
    category: 'Games & Classics',
    description: 'Traditional 15-ball billiards pyramid rack flanked by 5 cue balls.',
    getPositions: () => sanitizePoints([
      // Triangle rack: 1 + 2 + 3 + 4 + 5 = 15
      { x: -0.32, y: 0.0 },
      { x: -0.38, y: -0.04 }, { x: -0.38, y: 0.04 },
      { x: -0.44, y: -0.08 }, { x: -0.44, y: 0.0 }, { x: -0.44, y: 0.08 },
      { x: -0.50, y: -0.12 }, { x: -0.50, y: -0.04 }, { x: -0.50, y: 0.04 }, { x: -0.50, y: 0.12 },
      { x: -0.56, y: -0.16 }, { x: -0.56, y: -0.08 }, { x: -0.56, y: 0.0 }, { x: -0.56, y: 0.08 }, { x: -0.56, y: 0.16 },
      // Cue ball line
      { x: -0.20, y: -0.2 }, { x: -0.20, y: -0.1 }, { x: -0.20, y: 0.0 }, { x: -0.20, y: 0.1 }, { x: -0.20, y: 0.2 }
    ])
  },
  {
    id: 'arr-096',
    index: 96,
    name: 'Bowling 10-Pin Triangular Rack',
    category: 'Games & Classics',
    description: 'Standard 10-pin bowling pin arrangement with 10 approach runway markers.',
    getPositions: () => sanitizePoints([
      // 10 pins (1 + 2 + 3 + 4)
      { x: -0.35, y: 0.0 },
      { x: -0.42, y: -0.06 }, { x: -0.42, y: 0.06 },
      { x: -0.49, y: -0.12 }, { x: -0.49, y: 0.0 }, { x: -0.49, y: 0.12 },
      { x: -0.56, y: -0.18 }, { x: -0.56, y: -0.06 }, { x: -0.56, y: 0.06 }, { x: -0.56, y: 0.18 },
      // 10 approach lane dots
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.22, y: -0.4 + i * 0.088 }))
    ])
  },
  {
    id: 'arr-097',
    index: 97,
    name: 'Chess Battle Line & Officers',
    category: 'Games & Classics',
    description: '8 frontline pawns protected by backline royal officers and rooks.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.48, y: -0.45 + i * 0.10 })), // Pawns
      ...Array.from({ length: 10 }, (_, i) => ({ x: -0.60, y: -0.45 + i * 0.10 }))  // Backline officers
    ])
  },
  {
    id: 'arr-098',
    index: 98,
    name: 'Lucky Horseshoe Arch',
    category: 'Games & Classics',
    description: 'Traditional lucky horseshoe arc with dual outward-turned calks.',
    getPositions: () => sanitizePoints([
      { x: -0.62, y: -0.38 }, { x: -0.58, y: -0.38 }, // Left heel
      ...Array.from({ length: 16 }, (_, i) => {
        const a = Math.PI * 0.8 - (i / 15) * Math.PI * 1.6;
        return { x: -0.32 + 0.35 * Math.cos(a), y: 0.35 * Math.sin(a) };
      }),
      { x: -0.58, y: 0.38 }, { x: -0.62, y: 0.38 }   // Right heel
    ])
  },
  {
    id: 'arr-099',
    index: 99,
    name: 'Casino Roulette Wheel Track',
    category: 'Games & Classics',
    description: 'Full 360-degree circular roulette track divided into regular slots.',
    getPositions: () => sanitizePoints(makeRing(0.56, 0, Math.PI * 2, -0.08, 0))
  },
  {
    id: 'arr-100',
    index: 100,
    name: 'Olympic Interlocking Rings',
    category: 'Games & Classics',
    description: 'Five intersecting symbolic Olympic athletic rings across table.',
    getPositions: () => sanitizePoints([
      ...makeRing(0.18, 0, Math.PI * 2, -0.45, -0.28).slice(0, 4),
      ...makeRing(0.18, 0, Math.PI * 2, -0.45, 0.0).slice(0, 4),
      ...makeRing(0.18, 0, Math.PI * 2, -0.45, 0.28).slice(0, 4),
      ...makeRing(0.18, 0, Math.PI * 2, -0.32, -0.14).slice(0, 4),
      ...makeRing(0.18, 0, Math.PI * 2, -0.32, 0.14).slice(0, 4)
    ])
  },
  {
    id: 'arr-101',
    index: 101,
    name: 'Archery Target Bullseye (3 Rings)',
    category: 'Games & Classics',
    description: 'Triple concentric target rings: center gold (4), red (6), blue (10).',
    getPositions: () => sanitizePoints([
      ...makeRing(0.38, 0, Math.PI * 2, -0.1, 0).slice(0, 4),
      ...makeRing(0.50, 0.3, Math.PI * 2, -0.1, 0).slice(0, 6),
      ...makeRing(0.64, 0.6, Math.PI * 2, -0.1, 0).slice(0, 10)
    ])
  },
  {
    id: 'arr-102',
    index: 102,
    name: 'Domino Chain Reaction',
    category: 'Games & Classics',
    description: 'Winding domino chain poised for a kinetic chain reaction tumble.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const a = t * Math.PI * 3.5;
      const r = 0.38 + t * 0.30;
      return { x: -0.1 + r * Math.cos(a), y: r * Math.sin(a) };
    }))
  },
  {
    id: 'arr-103',
    index: 103,
    name: 'Labyrinth Spiral Maze Pathway',
    category: 'Games & Classics',
    description: 'Square concentric maze walls guiding a path toward the center.',
    getPositions: () => sanitizePoints([
      // Outer square walls
      { x: -0.62, y: -0.35 }, { x: -0.62, y: -0.18 }, { x: -0.62, y: 0.0 }, { x: -0.62, y: 0.18 }, { x: -0.62, y: 0.35 },
      { x: -0.48, y: 0.35 }, { x: -0.34, y: 0.35 }, { x: -0.20, y: 0.35 },
      { x: -0.20, y: 0.18 }, { x: -0.20, y: 0.0 }, { x: -0.20, y: -0.18 }, { x: -0.20, y: -0.35 },
      // Inner walls
      { x: -0.34, y: -0.35 }, { x: -0.48, y: -0.35 },
      { x: -0.48, y: -0.2 }, { x: -0.48, y: 0.0 }, { x: -0.48, y: 0.2 },
      { x: -0.34, y: 0.2 }, { x: -0.34, y: 0.0 }, { x: -0.34, y: -0.2 }
    ])
  },
  {
    id: 'arr-104',
    index: 104,
    name: 'Pachinko Pin Deflection Grid',
    category: 'Games & Classics',
    description: 'Triangular staggered pin field creating chaotic deflection cascades.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 4 }, (_, i) => ({ x: -0.62, y: -0.24 + i * 0.16 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.52, y: -0.32 + i * 0.16 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: -0.42, y: -0.32 + i * 0.16 })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: -0.32, y: -0.40 + i * 0.16 }))
    ])
  },
  {
    id: 'arr-105',
    index: 105,
    name: 'Classic Snake Crawl S-Curve',
    category: 'Games & Classics',
    description: 'Iconic retro arcade snake winding its body in serpentine arcs.',
    getPositions: () => sanitizePoints(makeParametric(t => {
      const y = -0.52 + t * 1.04;
      const x = -0.42 + 0.18 * Math.sin(t * Math.PI * 4);
      return { x, y };
    }))
  },
  {
    id: 'arr-106',
    index: 106,
    name: 'DNA Double Helix Strand',
    category: 'Games & Classics',
    description: 'Twisting twin molecular strands modeling a biological DNA double helix.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 10 }, (_, i) => {
        const t = i / 9;
        const y = -0.48 + t * 0.96;
        const x = -0.48 + 0.14 * Math.sin(t * Math.PI * 3);
        return { x, y };
      }),
      ...Array.from({ length: 10 }, (_, i) => {
        const t = i / 9;
        const y = -0.48 + t * 0.96;
        const x = -0.34 - 0.14 * Math.sin(t * Math.PI * 3);
        return { x, y };
      })
    ])
  },
  {
    id: 'arr-107',
    index: 107,
    name: 'Dartboard Sector Wedges',
    category: 'Games & Classics',
    description: 'Triple radial wedges representing 20-point dartboard scoring zones.',
    getPositions: () => sanitizePoints([
      ...Array.from({ length: 6 }, (_, i) => {
        const a = -Math.PI * 0.6;
        const r = 0.38 + i * 0.06;
        return { x: -0.08 + r * Math.cos(a), y: r * Math.sin(a) };
      }),
      ...Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI;
        const r = 0.38 + i * 0.055;
        return { x: -0.08 + r * Math.cos(a), y: r * Math.sin(a) };
      }),
      ...Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI * 0.6;
        const r = 0.38 + i * 0.055;
        return { x: -0.08 + r * Math.cos(a), y: r * Math.sin(a) };
      })
    ])
  },
  {
    id: 'arr-108',
    index: 108,
    name: 'Ring Toss Radial Concentric Targets',
    category: 'Games & Classics',
    description: 'Carnival ring toss scoring targets arranged in concentric circles.',
    getPositions: () => sanitizePoints(makeDualRings(0.66, 12, 0.46, 8))
  }
];

export const ARRANGEMENT_CATEGORIES = [
  'All (108)',
  'Geometric',
  'Curves & Waves',
  'Industrial',
  'Symbols',
  'Color Clustered',
  'Celestial',
  'Games & Classics'
] as const;
