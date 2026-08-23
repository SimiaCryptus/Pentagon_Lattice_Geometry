/* ---------------------------------------------------------------------
   Pinwheel polygons and edge-restricted reconnection (pinwheels.mac).

   A cell carries a centre and a 2x2 orthogonal matrix M (its
   orientation).  Reflecting across an edge composes M with the
   reflection matrix of that edge line, so the *observed* orientation
   group is read off directly from the set of distinct M's produced by
   BFS.  A finite set  => Criterion 1' satisfied (reconnective);
   an unbounded set => orientation group dense in O(2) (Level 3).
   --------------------------------------------------------------------- */

import { rationalMultipleOfPi, lcm, PHI } from '../math/numberTheory.js';
import { bfsVolumes, estimateDeff, simpleCycles } from '../graph/analysis.js';
import { mulMat2, applyMat2 } from '../math/matrix.js';

export const POLYGONS = {
  CR_triangle: {
    vertices: [
      [0, 0],
      [1, 0],
      [0, 2],
    ],
    edges: ['leg1', 'hyp', 'leg2'],
    field: 'Q',
    note: 'Conway-Radin pinwheel triangle (legs 1, 2; hyp sqrt 5)',
  },
  tri_1_sqrt3: {
    vertices: [
      [0, 0],
      [1, 0],
      [0, Math.sqrt(3)],
    ],
    edges: ['leg1', 'hyp', 'leg2'],
    field: 'Q(sqrt 3)',
    note: '30-60-90 triangle targeting the triangular lattice',
  },
  L_tromino: {
    vertices: [
      [0, 0],
      [2, 0],
      [2, 1],
      [1, 1],
      [1, 2],
      [0, 2],
    ],
    edges: ['long_b', 'short_r1', 'long_t1', 'short_r2', 'long_t2', 'short_l'],
    field: 'Q',
    note: 'L-tromino, Level 2 with trivial fiber',
  },
  half_penrose_kite: {
    vertices: [
      [0, 0],
      [1, 0],
      [(1 + PHI * Math.cos((2 * Math.PI) / 5)) / 2, (PHI * Math.sin((2 * Math.PI) / 5)) / 2],
    ],
    edges: ['short', 'long1', 'long2'],
    field: 'Q(sqrt 5)',
    note: 'Half-Penrose kite (1, phi, phi)',
  },
  half_penrose_dart: {
    vertices: [
      [0, 0],
      [1, 0],
      [(1 + Math.cos((2 * Math.PI) / 5) / PHI) / 2, Math.sin((2 * Math.PI) / 5) / (2 * PHI)],
    ],
    edges: ['long', 'short1', 'short2'],
    field: 'Q(sqrt 5)',
    note: 'Half-Penrose dart',
  },
};

export const ACTIVE_MODES = ['legs_only', 'with_hyp', 'all_edges'];

export function edgePartition(polyType, mode) {
  const poly = POLYGONS[polyType];
  const n = poly.edges.length;
  const active = new Array(n).fill(false);
  const weak = new Array(n).fill(false);
  const all = () => active.fill(true);
  if (polyType === 'CR_triangle' || polyType === 'tri_1_sqrt3') {
    if (mode === 'legs_only') {
      active[0] = true;
      active[2] = true;
    } else if (mode === 'with_hyp') {
      active[0] = true;
      active[2] = true;
      weak[1] = true;
    } else all();
  } else if (polyType === 'L_tromino') {
    if (mode === 'all_edges') all();
    else {
      active[0] = true;
      active[2] = true;
      active[4] = true;
    }
  } else {
    // half-Penrose kite / dart: long edges active, short edge weak
    if (mode === 'legs_only') {
      active[1] = true;
      active[2] = true;
    } else if (mode === 'with_hyp') {
      active[1] = true;
      active[2] = true;
      weak[0] = true;
    } else all();
  }
  return { active, weak, labels: poly.edges };
}

const edgeEndpoints = (verts, k) => [verts[k], verts[(k + 1) % verts.length]];

export function edgeLengths(polyType) {
  const v = POLYGONS[polyType].vertices;
  return v.map((_, k) => {
    const [p, q] = edgeEndpoints(v, k);
    return Math.hypot(q[0] - p[0], q[1] - p[1]);
  });
}

export function edgeAngles(polyType) {
  const v = POLYGONS[polyType].vertices;
  return v.map((_, k) => {
    const [p, q] = edgeEndpoints(v, k);
    return Math.atan2(q[1] - p[1], q[0] - p[0]);
  });
}

/* Orientation-group rationality test on active-edge pair rotations. */
export function orientationGroupAnalysis(polyType, mode) {
  const { active } = edgePartition(polyType, mode);
  const angles = edgeAngles(polyType);
  const idx = angles.map((_, k) => k).filter((k) => active[k]);
  const rotations = [];
  for (let i = 0; i < idx.length; i++)
    for (let j = i + 1; j < idx.length; j++) {
      let delta = 2 * (angles[idx[j]] - angles[idx[i]]);
      while (delta > Math.PI) delta -= 2 * Math.PI;
      while (delta <= -Math.PI) delta += 2 * Math.PI;
      rotations.push(delta);
    }
  const tests = rotations.map((t) => ({ theta: t, ...rationalMultipleOfPi(t) }));
  const allRational = tests.every((t) => t.rational);
  const orders = tests.filter((t) => t.rational).map((t) => t.order);
  return {
    activeIndices: idx,
    rotations,
    tests,
    allRational,
    orders,
    groupOrder: allRational && orders.length ? orders.reduce((a, b) => lcm(a, b), 1) : Infinity,
  };
}

/* ---- cluster construction with matrix-tracked orientation ---- */

const reflectionMatrix = (dx, dy) => {
  const t = Math.atan2(dy, dx);
  const c = Math.cos(2 * t),
    s = Math.sin(2 * t);
  return [c, s, s, -c];
};

const roundKey = (v, eps = 1e-6) => Math.round(v / eps) * eps;

export function buildPinwheelCluster({
  polyType = 'CR_triangle',
  activeMode = 'legs_only',
  depth = 3,
  fiberOrder = 8,
  maxCells = 100000,
} = {}) {
  const poly = POLYGONS[polyType];
  const { active, weak } = edgePartition(polyType, activeMode);
  const nEdges = poly.vertices.length;

  const cells = [];
  const nbrs = [];
  const index = new Map();
  const orientations = new Map();

  const key = (x, y, M, s) =>
    `${roundKey(x)}|${roundKey(y)}|${M.map((v) => roundKey(v)).join(',')}|${s}`;

  const addCell = (x, y, M, sheet) => {
    const k = key(x, y, M, sheet);
    const found = index.get(k);
    if (found !== undefined) return found;
    const id = cells.length;
    cells.push({ id, x, y, M, sheet });
    nbrs.push([]);
    index.set(k, id);
    orientations.set(M.map((v) => roundKey(v)).join(','), true);
    return id;
  };

  const addEdge = (i, j) => {
    if (i === j) return;
    if (!nbrs[i].includes(j)) nbrs[i].push(j);
    if (!nbrs[j].includes(i)) nbrs[j].push(i);
  };

  const worldVertex = (cell, k) => {
    const v = poly.vertices[k];
    const [a, b] = applyMat2(cell.M, v);
    return [cell.x + a, cell.y + b];
  };

  const originId = addCell(0, 0, [1, 0, 0, 1], 0);
  let frontier = [originId];

  for (let d = 0; d < depth; d++) {
    const next = [];
    for (const i of frontier) {
      const cell = cells[i];
      for (let k = 0; k < nEdges; k++) {
        if (!active[k] && !weak[k]) continue;
        const p1 = worldVertex(cell, k);
        const p2 = worldVertex(cell, (k + 1) % nEdges);
        const dx = p2[0] - p1[0],
          dy = p2[1] - p1[1];
        const len2 = dx * dx + dy * dy;
        if (len2 < 1e-18) continue;
        // reflect the centre across the edge line
        const vx = cell.x - p1[0],
          vy = cell.y - p1[1];
        const nx = -dy / Math.sqrt(len2),
          ny = dx / Math.sqrt(len2);
        const dot = vx * nx + vy * ny;
        const cx = cell.x - 2 * dot * nx;
        const cy = cell.y - 2 * dot * ny;
        const Rm = reflectionMatrix(dx, dy);
        const M = mulMat2(Rm, cell.M);
        const sheet = weak[k] ? (cell.sheet + 1) % fiberOrder : cell.sheet;
        const before = cells.length;
        const j = addCell(cx, cy, M, sheet);
        addEdge(i, j);
        if (j >= before && !next.includes(j)) next.push(j);
        if (cells.length > maxCells) throw new Error('pinwheel cluster exceeded maxCells');
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }

  const nActive = active.filter(Boolean).length;
  const nWeak = weak.filter(Boolean).length;

  return {
    polyType,
    activeMode,
    depth,
    fiberOrder,
    cells,
    nbrs,
    originId,
    N: cells.length,
    active,
    weak,
    nActive,
    nWeak,
    observedOrientations: orientations.size,
    sheets: [...new Set(cells.map((c) => c.sheet))].sort((a, b) => a - b),
  };
}

export function pinwheelDimensions(cluster) {
  const { cumulative, radius } = bfsVolumes(cluster.nbrs, cluster.originId);
  const fit = estimateDeff(cumulative, { interior: true });
  return { cumulative, radius, dEff: fit.slope, intercept: fit.intercept };
}

export function pinwheelHolonomy(cluster, { maxLen = 5 } = {}) {
  if (!cluster.nWeak) return { active: false, cycles: 0, note: 'no weak edges: trivial fiber' };
  const cycles = simpleCycles(cluster.nbrs, cluster.originId, maxLen);
  const counts = new Array(cluster.fiberOrder).fill(0);
  for (const c of cycles) {
    let tot = 0;
    for (let k = 0; k < c.length - 1; k++) {
      const d = cluster.cells[c[k + 1]].sheet - cluster.cells[c[k]].sheet;
      tot += d;
    }
    counts[((tot % cluster.fiberOrder) + cluster.fiberOrder) % cluster.fiberOrder]++;
  }
  const nontrivial = counts.slice(1).reduce((a, b) => a + b, 0);
  return {
    active: true,
    cycles: cycles.length,
    residues: counts,
    nontrivial,
    fraction: cycles.length ? nontrivial / cycles.length : 0,
  };
}

export function hierarchyLevel({
  allRational,
  nWeak,
  dEff,
  observedOrientations,
  maxOrientations = 64,
}) {
  if (!allRational || observedOrientations > maxOrientations)
    return 'Level 3 (non-reconnective: orientation group dense in SO(2))';
  if (nWeak === 0) {
    if (dEff > 1.7 && dEff < 2.4) return 'Level 0/2 (target periodic lattice, d ~ 2)';
    if (dEff > 2.3 && dEff < 3.5) return 'Level 1 (multi-sheeted, 2 < d < 3)';
    return `Level 2 (edge-restricted, d ~ ${dEff.toFixed(3)})`;
  }
  if (dEff > 2.0 && dEff < 3.0) return 'Level 2->1 promotion (covered lattice, 2 < d < 3)';
  return 'Level 2 with sheet transitions';
}
