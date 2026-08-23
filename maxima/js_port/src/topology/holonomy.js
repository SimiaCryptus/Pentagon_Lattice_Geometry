/* ---------------------------------------------------------------------
   Holonomy of the Z_2 orientation cover (sheet_fix.md).

   Every edge flips orientation, so the holonomy of any closed loop is
   just the parity of its length.  Even-length loops -- notably the
   length-10 pentagon vertex loop -- are TRIVIAL.  There is no Z5/Z10
   fiber, no signed-3 rule and no spinor behaviour.  Z_m helpers are
   retained only as generic group-theory references for the base graph.
   --------------------------------------------------------------------- */

import { edgeSheetShift } from '../graph/lattice.js';
import { simpleCycles, cycleLengthHistogram } from '../graph/analysis.js';

export const mod = (a, n) => ((a % n) + n) % n;

export function holonomyZn(shifts, n) {
  return mod(
    shifts.reduce((a, b) => a + b, 0),
    n
  );
}

export function orderZn(g, n) {
  const gg = mod(g, n);
  if (gg === 0) return 1;
  for (let k = 1; k <= n; k++) if (mod(k * gg, n) === 0) return k;
  return n;
}

export function loopHolonomy(cluster, seq) {
  let total = 0;
  for (let k = 0; k < seq.length - 1; k++) total += edgeSheetShift(cluster, seq[k], seq[k + 1]);
  return total;
}

/* Flat Z_2 orientation phase exp(i pi q). */
export const flatZ2Phase = (q) => (mod(q, 2) === 0 ? 1 : -1);
export const berryPhaseZ2 = (loopLength) => Math.PI * mod(loopLength, 2);

/* Order of the 2D monodromy rotation by 2 pi / n. */
export function monodromyOrder(n) {
  let angle = 0;
  for (let k = 1; k <= 2 * n; k++) {
    angle += (2 * Math.PI) / n;
    if (Math.abs(Math.cos(angle) - 1) < 1e-10 && Math.abs(Math.sin(angle)) < 1e-10) return k;
  }
  return -1;
}

export function analyzeHolonomy(
  cluster,
  { maxLen = 6, groups = [2], root = cluster.originId } = {}
) {
  const cycles = simpleCycles(cluster.nbrs, root, maxLen);
  const perGroup = groups.map((g) => ({
    group: g,
    nontrivial: 0,
    residues: new Array(g).fill(0),
  }));
  let parityMismatches = 0;
  const raws = [];
  for (const c of cycles) {
    const raw = loopHolonomy(cluster, c);
    raws.push(raw);
    const len = c.length - 1;
    if (cluster.tauMode === 'z2' && mod(raw, 2) !== mod(len, 2)) parityMismatches++;
    for (const entry of perGroup) {
      const r = mod(raw, entry.group);
      entry.residues[r]++;
      if (r !== 0) entry.nontrivial++;
    }
  }
  return {
    root,
    cycleCount: cycles.length,
    lengthHistogram: cycleLengthHistogram(cycles),
    perGroup,
    parityMismatches,
    rawStats: raws.length
      ? {
          min: Math.min(...raws),
          max: Math.max(...raws),
          mean: raws.reduce((a, b) => a + b, 0) / raws.length,
        }
      : null,
    examples: cycles.slice(0, 3),
    vertexLoopLength: cluster.vertexLoopLength,
    vertexLoopHolonomy: mod(cluster.vertexLoopLength, 2),
    vertexLoopTrivial: mod(cluster.vertexLoopLength, 2) === 0,
  };
}
