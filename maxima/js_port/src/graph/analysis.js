/* Graph-theoretic analysis: BFS growth, components, cycles, girth. */

import { logLogFit } from '../math/fit.js';

export function bfsDistances(nbrs, root) {
  const dist = new Int32Array(nbrs.length).fill(-1);
  dist[root] = 0;
  const queue = [root];
  for (let head = 0; head < queue.length; head++) {
    const v = queue[head];
    for (const u of nbrs[v]) {
      if (dist[u] < 0) {
        dist[u] = dist[v] + 1;
        queue.push(u);
      }
    }
  }
  return dist;
}

/* Cumulative N(<= r). */
export function bfsVolumes(nbrs, root) {
  const dist = bfsDistances(nbrs, root);
  let maxD = 0;
  for (const d of dist) if (d > maxD) maxD = d;
  const shells = new Array(maxD + 1).fill(0);
  for (const d of dist) if (d >= 0) shells[d]++;
  const cumulative = [];
  let acc = 0;
  for (const s of shells) {
    acc += s;
    cumulative.push(acc);
  }
  return { shells, cumulative, radius: maxD };
}

/* d_eff from N(r) ~ r^d_eff. `interior` drops the outermost shell. */
export function estimateDeff(cumulative, { interior = true } = {}) {
  const hi = interior ? cumulative.length - 1 : cumulative.length;
  const xs = [],
    ys = [];
  for (let r = 1; r < hi; r++) {
    xs.push(r);
    ys.push(cumulative[r]);
  }
  if (xs.length < 2) return { slope: 0, intercept: 0, n: xs.length };
  return logLogFit(xs, ys);
}

export function connectedComponents(nbrs) {
  const n = nbrs.length;
  const seen = new Uint8Array(n);
  const comps = [];
  for (let s = 0; s < n; s++) {
    if (seen[s]) continue;
    const comp = [s];
    seen[s] = 1;
    for (let h = 0; h < comp.length; h++) {
      for (const u of nbrs[comp[h]])
        if (!seen[u]) {
          seen[u] = 1;
          comp.push(u);
        }
    }
    comps.push(comp);
  }
  return comps;
}

export function countTriangles(nbrs) {
  const sets = nbrs.map((l) => new Set(l));
  let count = 0;
  for (let i = 0; i < nbrs.length; i++)
    for (const j of nbrs[i]) {
      if (j <= i) continue;
      for (const k of nbrs[j]) if (k > j && sets[i].has(k)) count++;
    }
  return count;
}

export function meanClustering(nbrs) {
  const sets = nbrs.map((l) => new Set(l));
  const coeffs = [];
  for (let i = 0; i < nbrs.length; i++) {
    const d = nbrs[i].length;
    if (d < 2) continue;
    let links = 0;
    for (let a = 0; a < d; a++)
      for (let b = a + 1; b < d; b++) if (sets[nbrs[i][a]].has(nbrs[i][b])) links++;
    coeffs.push(links / ((d * (d - 1)) / 2));
  }
  return {
    mean: coeffs.length ? coeffs.reduce((s, x) => s + x, 0) / coeffs.length : 0,
    count: coeffs.length,
  };
}

/* Simple cycles through `root` up to maxLen edges (deduped by direction). */
export function simpleCycles(nbrs, root, maxLen = 6, limit = 20000) {
  const out = [];
  const path = [root];
  const inPath = new Set([root]);
  const walk = () => {
    if (out.length >= limit) return;
    const last = path[path.length - 1];
    for (const u of nbrs[last]) {
      if (u === root) {
        if (path.length >= 3 && path[1] < path[path.length - 1]) out.push([...path, root]);
        continue;
      }
      if (inPath.has(u) || path.length >= maxLen) continue;
      path.push(u);
      inPath.add(u);
      walk();
      inPath.delete(u);
      path.pop();
    }
  };
  walk();
  return out;
}

export function girthAtNode(nbrs, root, maxLen = 8) {
  for (let L = 3; L <= maxLen; L++) {
    const cycles = simpleCycles(nbrs, root, L, 1);
    if (cycles.some((c) => c.length - 1 === L)) return L;
  }
  return Infinity;
}

export function cycleLengthHistogram(cycles) {
  const m = new Map();
  for (const c of cycles) {
    const L = c.length - 1;
    m.set(L, (m.get(L) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([len, count]) => ({ len, count }));
}

/* Sheet-to-sheet edge matrix. */
export function sheetTransitionMatrix(cluster) {
  const sheets = [...new Set(cluster.cells.map((c) => c.sheet))].sort((a, b) => a - b);
  const idx = new Map(sheets.map((s, i) => [s, i]));
  const M = sheets.map(() => new Array(sheets.length).fill(0));
  for (let i = 0; i < cluster.nbrs.length; i++)
    for (const j of cluster.nbrs[i]) {
      if (j <= i) continue;
      const a = idx.get(cluster.cells[i].sheet);
      const b = idx.get(cluster.cells[j].sheet);
      M[a][b]++;
      if (a !== b) M[b][a]++;
    }
  return { sheets, matrix: M };
}

/* Sub-graph statistics restricted to a single sheet. */
export function perSheetStats(cluster) {
  const sheets = [...new Set(cluster.cells.map((c) => c.sheet))].sort((a, b) => a - b);
  return sheets.map((s) => {
    const nodes = cluster.cells.filter((c) => c.sheet === s).map((c) => c.id);
    let degSum = 0;
    for (const i of nodes)
      for (const j of cluster.nbrs[i]) if (cluster.cells[j].sheet === s) degSum++;
    return {
      sheet: s,
      nodes: nodes.length,
      intraEdges: degSum / 2,
      meanIntraDegree: nodes.length ? degSum / nodes.length : 0,
    };
  });
}
