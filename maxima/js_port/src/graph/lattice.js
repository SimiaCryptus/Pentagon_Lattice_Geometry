/* ---------------------------------------------------------------------
   Multi-sheeted n-gon adjacency graph (port of experiment.mac Sec. 2-3).

   CORRECTED per sheet_fix.md: the fiber is Z_2 (tile orientation only,
   two sheets); every edge flips the orientation bit.  The vertex cycle
   has even length, so all flips cancel and the vertex holonomy is
   trivial.  Legacy tau-rules ("every3", "signed3", ...) are retained as
   comparison baselines only.

   Geometry: a tile centroid is an exact element of Z[zeta_n].
   Reflecting a tile across its k-th edge sends
       c  ->  c + zeta^k + zeta^{k+1}
   (conjugated for the mirrored chirality class).  Chirality flips on
   every edge when n is odd (bipartite dual graph) and is constant when
   n is even.
   --------------------------------------------------------------------- */

import { CycRing } from '../math/cyclotomic.js';
import { loopClosureIndex } from '../geometry/ngon.js';

export const TAU_MODES = [
  'z2',        // corrected: Z_2 orientation flip on every edge
  'none',      // flat, no sheet structure
  'every3',    // legacy didactic rule
  'signed3',   // legacy signed rule (superseded)
  'everyn',    // period-n generalisation
  'signedn',   // signed period-n generalisation
  'kmodn',
  'cap',       // cut-and-project acceptance window
];

/* Cut-and-project "phantom" projection and n-fold acceptance window. */
const frac = (x) => x - Math.floor(x);

export function phantomProjection(x, y, n) {
  const c = 2 * Math.cos((2 * Math.PI) / n);
  return [frac(x * c), frac(y * c)];
}

export function inAcceptanceWindow(x, y, n, threshold = 0.3) {
  const [px, py] = phantomProjection(x, y, n);
  const dx = px - 0.5, dy = py - 0.5;
  const r2 = dx * dx + dy * dy;
  if (r2 < 1e-12) return true;
  const c2 = (dx * dx - dy * dy) / r2;
  return n * c2 * c2 - (n - 1) > -threshold * (n - 1);
}

export function makeTau(mode, n, ctx = {}) {
  switch (mode) {
    case 'z2': return () => 1;
    case 'none': return () => 0;
    case 'every3': return (i, k) => ((i + k) % 3 === 0 ? 1 : 0);
    case 'signed3': return (i, k) => { const m = (i + k) % 3; return m === 0 ? 1 : m === 1 ? -1 : 0; };
    case 'everyn': return (i, k) => ((i + k) % n === 0 ? 1 : 0);
    case 'signedn': return (i, k) => { const m = (i + k) % n; return m === 0 ? 1 : m === 1 ? -1 : 0; };
    case 'kmodn': return (i, k) => (k % n === 0 ? 1 : 0);
    case 'cap':
      return (i, k, from, to) => {
        const a = inAcceptanceWindow(from[0], from[1], n, ctx.capThreshold ?? 0.3);
        const b = inAcceptanceWindow(to[0], to[1], n, ctx.capThreshold ?? 0.3);
        return a !== b ? 1 : 0;
      };
    default:
      throw new Error(`unknown tau mode: ${mode}`);
  }
}

/* Build a BFS cluster of the multi-sheeted tiling. */
export function buildCluster({
  n = 5,
  depth = 3,
  tauMode = 'z2',
  capThreshold = 0.3,
  maxCells = 200000,
} = {}) {
  const R = new CycRing(n);
  const chiralActive = n % 2 === 1;
  const tau = makeTau(tauMode, n, { capThreshold });
  const sheetModulus = tauMode === 'z2' ? 2 : 0; // 0 = unbounded Z

  // Edge translation vectors zeta^k + zeta^{k+1} and their conjugates.
  const edgeVec = [];
  const edgeVecConj = [];
  for (let k = 0; k < n; k++) {
    const v = R.add(R.fromPower(k), R.fromPower(k + 1));
    edgeVec.push(v);
    edgeVecConj.push(R.conj(v));
  }

  const cells = [];
  const nbrs = [];
  const index = new Map();

  const addCell = (center, chir, sheet) => {
    const key = `${R.key(center)}|${chir}|${sheet}`;
    const found = index.get(key);
    if (found !== undefined) return found;
    const [x, y] = R.toXY(center);
    const id = cells.length;
    cells.push({ id, center, chir, sheet, x, y });
    nbrs.push([]);
    index.set(key, id);
    return id;
  };

  const addEdge = (i, j) => {
    if (i === j) return;
    if (!nbrs[i].includes(j)) nbrs[i].push(j);
    if (!nbrs[j].includes(i)) nbrs[j].push(i);
  };

  const originId = addCell(R.zero(), 0, 0);

  let frontier = [originId];
  for (let d = 0; d < depth; d++) {
    const next = [];
    for (const i of frontier) {
      const cell = cells[i];
      for (let k = 0; k < n; k++) {
        const vec = cell.chir === 0 ? edgeVec[k] : edgeVecConj[k];
        const center = R.add(cell.center, vec);
        const [nx, ny] = R.toXY(center);
        const chir = chiralActive ? 1 - cell.chir : 0;
        const ds = tau(i, k, [cell.x, cell.y], [nx, ny]);
        const sheet = sheetModulus > 0
          ? (((cell.sheet + ds) % sheetModulus) + sheetModulus) % sheetModulus
          : cell.sheet + ds;
        const before = cells.length;
        const j = addCell(center, chir, sheet);
        addEdge(i, j);
        if (j >= before && !next.includes(j)) next.push(j);
        if (cells.length > maxCells) throw new Error('cluster exceeded maxCells');
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }

  return {
    n,
    ring: R,
    depth,
    tauMode,
    chiralActive,
    sheetModulus,
    cells,
    nbrs,
    originId,
    N: cells.length,
    vertexLoopLength: loopClosureIndex(n),
    fiberOrder: 2,
  };
}

/* Sheet shift on a directed edge (derived from cell sheet labels). */
export const edgeSheetShift = (cluster, i, j) =>
  cluster.cells[j].sheet - cluster.cells[i].sheet;

export function clusterStats(cluster) {
  const { nbrs, cells } = cluster;
  const degrees = nbrs.map((l) => l.length);
  const totalEdges = degrees.reduce((a, b) => a + b, 0) / 2;
  let vortexEdges = 0;
  let bipartiteViolations = 0;
  for (let i = 0; i < nbrs.length; i++) {
    for (const j of nbrs[i]) {
      if (j <= i) continue;
      if (cells[i].sheet !== cells[j].sheet) vortexEdges++;
      if (cluster.chiralActive && cells[i].chir === cells[j].chir) bipartiteViolations++;
    }
  }
  const sheetSet = [...new Set(cells.map((c) => c.sheet))].sort((a, b) => a - b);
  const perSheet = sheetSet.map((s) => ({
    sheet: s,
    cells: cells.filter((c) => c.sheet === s).length,
  }));
  return {
    N: cells.length,
    degreeMin: Math.min(...degrees),
    degreeMax: Math.max(...degrees),
    degreeMean: degrees.reduce((a, b) => a + b, 0) / degrees.length,
    degreeHistogram: histogram(degrees),
    totalEdges,
    vortexEdges,
    vortexFraction: totalEdges ? vortexEdges / totalEdges : 0,
    sheets: sheetSet,
    perSheet,
    bipartiteViolations,
    chiralityCounts: cluster.chiralActive
      ? { up: cells.filter((c) => c.chir === 0).length, down: cells.filter((c) => c.chir === 1).length }
      : { up: cells.length, down: 0 },
  };
}

function histogram(values) {
  const m = new Map();
  for (const v of values) m.set(v, (m.get(v) || 0) + 1);
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([deg, count]) => ({ deg, count }));
}