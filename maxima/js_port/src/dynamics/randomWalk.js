/* Random-walk diagnostics: d_w from MSD, d_spec from P_0, commute times. */

import { bfsDistances } from '../graph/analysis.js';
import { logLogFit } from '../math/fit.js';

export function randomWalk(nbrs, start, steps, rng) {
  const path = new Int32Array(steps + 1);
  let v = start;
  path[0] = v;
  for (let t = 1; t <= steps; t++) {
    const nb = nbrs[v];
    if (!nb.length) { path.fill(v, t); break; }
    v = nb[rng.int(nb.length)];
    path[t] = v;
  }
  return path;
}

/* Walk restricted to the sheet of the starting cell. */
export function intraSheetWalk(cluster, start, steps, rng) {
  const sheet = cluster.cells[start].sheet;
  const path = [start];
  let v = start;
  for (let t = 1; t <= steps; t++) {
    const allowed = cluster.nbrs[v].filter((u) => cluster.cells[u].sheet === sheet);
    if (!allowed.length) break;
    v = allowed[rng.int(allowed.length)];
    path.push(v);
  }
  return path;
}

export function walkStatistics(cluster, {
  walks = 200, steps = 20, rng, root = cluster.originId,
  msdWindow = [2, 6], p0Window = [2, 12],
}) {
  const dist = bfsDistances(cluster.nbrs, root);
  const msdSum = new Float64Array(steps + 1);
  const retCnt = new Float64Array(steps + 1);
  let crossings = 0;

  for (let w = 0; w < walks; w++) {
    const path = randomWalk(cluster.nbrs, root, steps, rng);
    for (let t = 0; t <= steps; t++) {
      const v = path[t];
      const d = dist[v] < 0 ? 0 : dist[v];
      msdSum[t] += d * d;
      if (v === root) retCnt[t]++;
      if (t > 0 && cluster.cells[path[t - 1]].sheet !== cluster.cells[v].sheet) crossings++;
    }
  }

  const msd = Array.from(msdSum, (s) => s / walks);
  const p0 = Array.from(retCnt, (s) => s / walks);

  const mx = [], my = [];
  for (let t = msdWindow[0]; t <= Math.min(msdWindow[1], steps); t++)
    if (msd[t] > 0) { mx.push(t); my.push(msd[t]); }
  const msdFit = mx.length >= 3 ? logLogFit(mx, my) : { slope: 0, n: mx.length };
  const dW = Math.abs(msdFit.slope) > 1e-6 ? 2 / msdFit.slope : 0;

  const lx = [], ly = [];
  for (let t = Math.max(msdWindow[1] + 1, 2); t <= steps; t++)
    if (msd[t] > 0) { lx.push(t); ly.push(msd[t]); }
  const msdLate = lx.length >= 3 ? logLogFit(lx, ly) : { slope: 0, n: lx.length };

  const px = [], py = [];
  for (let t = p0Window[0]; t <= Math.min(p0Window[1], steps); t += 2)
    if (p0[t] > 0) { px.push(t); py.push(p0[t]); }
  const p0Fit = px.length >= 3 ? logLogFit(px, py) : { slope: 0, n: px.length };

  return {
    msd, p0,
    msdSlopeEarly: msdFit.slope,
    msdSlopeLate: msdLate.slope,
    dW,
    p0Slope: p0Fit.slope,
    dSpecP0: px.length >= 3 ? -2 * p0Fit.slope : 0,
    meanSheetCrossings: crossings / walks,
    crossingsPerStep: crossings / (walks * steps),
  };
}

export function intraSheetStatistics(cluster, { walks = 100, steps = 20, rng, msdWindow = [2, 6] }) {
  const root = cluster.originId;
  const dist = bfsDistances(cluster.nbrs, root);
  const msdSum = new Float64Array(steps + 1);
  for (let w = 0; w < walks; w++) {
    const path = intraSheetWalk(cluster, root, steps, rng);
    for (let t = 0; t <= steps; t++) {
      const v = path[Math.min(t, path.length - 1)];
      const d = dist[v] < 0 ? 0 : dist[v];
      msdSum[t] += d * d;
    }
  }
  const msd = Array.from(msdSum, (s) => s / walks);
  const xs = [], ys = [];
  for (let t = msdWindow[0]; t <= Math.min(msdWindow[1], steps); t++)
    if (msd[t] > 0) { xs.push(t); ys.push(msd[t]); }
  const fit = xs.length >= 3 ? logLogFit(xs, ys) : { slope: 0 };
  return { msd, slope: fit.slope, dWIntra: Math.abs(fit.slope) > 1e-6 ? 2 / fit.slope : 0 };
}

export function hittingTime(nbrs, source, target, maxSteps, rng) {
  let v = source;
  for (let t = 0; t < maxSteps; t++) {
    if (v === target) return t;
    const nb = nbrs[v];
    if (!nb.length) return -1;
    v = nb[rng.int(nb.length)];
  }
  return v === target ? maxSteps : -1;
}

export function commuteEstimate(nbrs, u, v, samples, maxSteps, rng) {
  let su = 0, nu = 0, sv = 0, nv = 0;
  for (let k = 0; k < samples; k++) {
    const a = hittingTime(nbrs, u, v, maxSteps, rng);
    if (a >= 0) { su += a; nu++; }
    const b = hittingTime(nbrs, v, u, maxSteps, rng);
    if (b >= 0) { sv += b; nv++; }
  }
  return nu && nv ? su / nu + sv / nv : -1;
}

export function commuteScaling(cluster, { rng, samples = 40, maxSteps = 400, maxDistance = 4 }) {
  const dist = bfsDistances(cluster.nbrs, cluster.originId);
  const targets = [];
  for (let d = 1; d <= maxDistance; d++) {
    let found = 0;
    for (let i = 0; i < dist.length && found < 2; i++)
      if (dist[i] === d) { targets.push({ id: i, d, sheet: cluster.cells[i].sheet }); found++; }
  }
  const data = [];
  for (const t of targets) {
    const c = commuteEstimate(cluster.nbrs, cluster.originId, t.id, samples, maxSteps, rng);
    if (c > 0) data.push({ ...t, commute: c });
  }
  const fit = data.length >= 3
    ? logLogFit(data.map((d) => d.d), data.map((d) => d.commute))
    : { slope: 0 };
  return { data, slope: fit.slope };
}

export const alexanderOrbach = (dEff, dW) => (dW > 0 ? (2 * dEff) / dW : 0);