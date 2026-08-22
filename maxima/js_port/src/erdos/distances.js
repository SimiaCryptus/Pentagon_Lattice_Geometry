/* ---------------------------------------------------------------------
   Erdos distance catalog, distance webs and the pinwheel (direction)
   phenomenon.  Squared distances are computed EXACTLY as elements of
   the real subfield of Q[zeta_n]:  |p - q|^2 = (p-q) * conj(p-q).
   --------------------------------------------------------------------- */

import { logLogFit } from '../math/fit.js';
import { PHI, fib, q5ToZphi, zphiNorm } from '../math/numberTheory.js';
import { bfsDistances, connectedComponents } from '../graph/analysis.js';

/* Exact distance class catalog.  Returns classes sorted by radius. */
export function distanceCatalog(cluster, { maxPairs = 60000 } = {}) {
  const R = cluster.ring;
  const cells = cluster.cells;
  const classes = new Map();
  const originIdx = new Map();

  const record = (key, coeffs, value, i, j) => {
    let e = classes.get(key);
    if (!e) {
      e = { key, coeffs, value, pairCount: 0, ringSize: 0, samples: [] };
      classes.set(key, e);
    }
    e.pairCount++;
    if (e.samples.length < 8) e.samples.push([i, j]);
    return e;
  };

  const sq = (i, j) => {
    const d = R.sub(cells[j].center, cells[i].center);
    const a = R.absSquared(d);
    return { key: R.key(a), coeffs: a, value: R.realValue(a) };
  };

  // origin ring sizes
  for (let i = 1; i < cells.length; i++) {
    const { key, coeffs, value } = sq(cluster.originId, i);
    if (Math.abs(value) < 1e-12) continue;
    const e = record(key, coeffs, value, cluster.originId, i);
    e.ringSize++;
    originIdx.set(i, key);
  }

  // all pairs (capped)
  let pairs = 0, capped = false;
  outer:
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (pairs >= maxPairs) { capped = true; break outer; }
      const { key, coeffs, value } = sq(i, j);
      if (Math.abs(value) < 1e-12) continue;
      record(key, coeffs, value, i, j);
      pairs++;
    }
  }

  const sorted = [...classes.values()].sort((a, b) => a.value - b.value);
  sorted.forEach((c, k) => {
    c.index = k + 1;
    c.radius = Math.sqrt(Math.max(c.value, 0));
    if (cluster.n === 5) Object.assign(c, annotatePentagon(c.value));
  });
  return { classes: sorted, count: sorted.length, pairs, capped };
}

/* For n = 5 the real subfield is Q(sqrt 5); annotate norm and Z[phi]. */
function annotatePentagon(value) {
  // value = r + s*sqrt5 recovered from the float by solving a small
  // lattice fit over half-integers (exact classes have small entries).
  const s = Math.round((value - Math.round(value)) * 0); // placeholder
  const best = fitQ5(value);
  if (!best) return { q5: null, zphi: null, norm: null, fibIndex: 0 };
  const zphi = q5ToZphi(best);
  return {
    q5: best,
    zphi,
    norm: zphiNorm(zphi),
    fibIndex: detectFibonacci(best),
  };
}

/* Recover [r,s] with r + s*sqrt5 == value over half-integers. */
function fitQ5(value, limit = 400, tol = 1e-7) {
  const sqrt5 = Math.sqrt(5);
  for (let twoS = 0; twoS <= limit; twoS++) {
    for (const sign of twoS === 0 ? [1] : [1, -1]) {
      const s = (sign * twoS) / 2;
      const r = value - s * sqrt5;
      const r2 = Math.round(r * 2) / 2;
      if (Math.abs(r - r2) < tol) return [r2, s];
    }
  }
  return null;
}

function detectFibonacci([r, s], tol = 1e-6) {
  for (let m = 1; m <= 20; m++)
    if (Math.abs(r - fib(2 * m)) < tol && Math.abs(s - fib(2 * m - 1)) < tol) return m;
  return 0;
}

/* Ratio delta_{k+1}/delta_k -> phi^2 for the pentagonal lattice. */
export function fibonacciSpacing(classes) {
  const ratios = [];
  for (let k = 0; k < classes.length - 1; k++) {
    const a = classes[k].value, b = classes[k + 1].value;
    if (a > 1e-9) ratios.push({ k: k + 1, ratio: b / a });
  }
  const mean = ratios.length ? ratios.reduce((s, r) => s + r.ratio, 0) / ratios.length : 0;
  return { ratios, mean, phiSquared: PHI * PHI, deviation: Math.abs(mean - PHI * PHI) };
}

export function multiplicityAnalysis(classes, n) {
  const sizes = classes.map((c) => c.ringSize);
  const meanRing = sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
  const threshold = Math.max(2 * meanRing, n);
  return {
    meanRing,
    threshold,
    highMultiplicity: classes.filter((c) => c.ringSize >= threshold)
      .map((c) => ({ index: c.index, value: c.value, ringSize: c.ringSize })),
  };
}

/* Galois conjugate pairs: apply zeta -> zeta^g and look for a partner. */
export function galoisPairs(cluster, classes, g = 2) {
  const R = cluster.ring;
  const byKey = new Map(classes.map((c) => [c.key, c]));
  const pairs = [];
  for (const c of classes) {
    const img = R.key(R.galois(c.coeffs, g));
    if (img === c.key) continue;
    const partner = byKey.get(img);
    if (partner && partner.index > c.index) {
      pairs.push({
        a: c.index, b: partner.index,
        valueA: c.value, valueB: partner.value,
        product: c.value * partner.value,
      });
    }
  }
  return pairs;
}

export function pythagoreanTriples(cluster, classes, limit = 12) {
  const R = cluster.ring;
  const sub = classes.slice(0, limit);
  const byKey = new Map(sub.map((c) => [c.key, c]));
  const out = [];
  for (let i = 0; i < sub.length; i++)
    for (let j = i; j < sub.length; j++) {
      const sum = R.key(R.add(sub[i].coeffs, sub[j].coeffs));
      const hit = byKey.get(sum);
      if (hit && hit.index >= sub[j].index) out.push({ a: sub[i].index, b: sub[j].index, c: hit.index });
    }
  return out;
}

/* D(P_n) growth: pentagonal O(log n) versus Z^2 Theta(n / sqrt(log n)). */
export function distinctDistanceScaling(N, D) {
  if (N < 2) return null;
  const logN = Math.log(N);
  return {
    N, D,
    ratioToLogN: D / logN,
    integerLatticeBound: N / Math.sqrt(logN),
    pentagonUpper: logN,
    pentagonLower: logN / Math.log(logN + 1),
  };
}

/* Distance webs W_d: graph of pairs at a fixed distance class. */
export function distanceWeb(cluster, cls) {
  const R = cluster.ring;
  const cells = cluster.cells;
  const web = cells.map(() => []);
  for (let i = 0; i < cells.length; i++)
    for (let j = i + 1; j < cells.length; j++) {
      const d = R.sub(cells[j].center, cells[i].center);
      if (R.key(R.absSquared(d)) === cls.key) { web[i].push(j); web[j].push(i); }
    }
  const degrees = web.map((l) => l.length);
  const comps = connectedComponents(web);
  const sets = web.map((l) => new Set(l));
  let tri = 0;
  for (let i = 0; i < web.length; i++)
    for (const j of web[i]) { if (j <= i) continue; for (const k of web[j]) if (k > j && sets[i].has(k)) tri++; }
  const uniqueDeg = [...new Set(degrees)];
  return {
    index: cls.index,
    value: cls.value,
    edges: degrees.reduce((a, b) => a + b, 0) / 2,
    degreeMin: Math.min(...degrees),
    degreeMax: Math.max(...degrees),
    components: comps.length,
    componentSizes: comps.map((c) => c.length).sort((a, b) => a - b),
    triangles: tri,
    regular: uniqueDeg.length === 1,
    biregular: uniqueDeg.length <= 2,
    adjacency: web,
  };
}

/* Pinwheel: direction density of each distance class. */
export function directionAnalysis(cluster, classes, { count = 8, tol = 1e-4 } = {}) {
  const R = cluster.ring;
  const cells = cluster.cells;
  const threshold = Math.PI / cluster.n;
  const out = [];
  for (const cls of classes.slice(0, count)) {
    const angles = [];
    for (let i = 0; i < cells.length; i++)
      for (let j = i + 1; j < cells.length; j++) {
        const d = R.sub(cells[j].center, cells[i].center);
        if (R.key(R.absSquared(d)) !== cls.key) continue;
        const [dx, dy] = R.toXY(d);
        angles.push(norm2pi(Math.atan2(dy, dx)));
        angles.push(norm2pi(Math.atan2(-dy, -dx)));
      }
    if (!angles.length) continue;
    const uniq = dedupeAngles(angles, tol);
    const gaps = angularGaps(uniq);
    out.push({
      index: cls.index,
      value: cls.value,
      directions: uniq.length,
      maxGap: gaps.max,
      meanGap: gaps.mean,
      pinwheel: gaps.max < threshold,
    });
  }
  const fitData = out.filter((o) => o.value > 0 && o.directions > 0);
  const fit = fitData.length >= 3
    ? logLogFit(fitData.map((o) => o.value), fitData.map((o) => o.directions))
    : { slope: 0 };
  return { threshold, classes: out, pinwheelCount: out.filter((o) => o.pinwheel).length, growthSlope: fit.slope };
}

const norm2pi = (a) => (a < 0 ? a + 2 * Math.PI : a);

function dedupeAngles(angles, tol) {
  const s = [...angles].sort((a, b) => a - b);
  const out = [];
  let prev = -Infinity;
  for (const a of s) if (a - prev > tol) { out.push(a); prev = a; }
  return out;
}

function angularGaps(sorted) {
  if (sorted.length < 2) return { max: 2 * Math.PI, mean: 2 * Math.PI };
  const gaps = [];
  for (let i = 0; i < sorted.length - 1; i++) gaps.push(sorted[i + 1] - sorted[i]);
  gaps.push(sorted[0] + 2 * Math.PI - sorted[sorted.length - 1]);
  return { max: Math.max(...gaps), mean: gaps.reduce((a, b) => a + b, 0) / gaps.length };
}

/* W_1 should coincide with the adjacency graph (unit edge distance). */
export function compareWebToAdjacency(cluster, web) {
  let mismatches = 0;
  for (let i = 0; i < cluster.nbrs.length; i++) {
    const a = [...web.adjacency[i]].sort((x, y) => x - y).join(',');
    const b = [...cluster.nbrs[i]].sort((x, y) => x - y).join(',');
    if (a !== b) mismatches++;
  }
  return { mismatches, identical: mismatches === 0 };
}

export { bfsDistances };