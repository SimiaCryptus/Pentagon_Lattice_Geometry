/* Laplacian spectrum, spectral gap, DOS fits, and KPM (Sec. 4 / 18). */

import { jacobiEigenvalues, zeros } from '../math/matrix.js';
import { logLogFit } from '../math/fit.js';

export function buildLaplacian(nbrs) {
  const n = nbrs.length;
  const L = zeros(n);
  for (let i = 0; i < n; i++) {
    L[i][i] = nbrs[i].length;
    for (const j of nbrs[i]) L[i][j] -= 1;
  }
  return L;
}

export function laplacianSpectrum(nbrs, { maxN = 1200 } = {}) {
  const n = nbrs.length;
  if (n > maxN) return { skipped: true, reason: `N=${n} > maxN=${maxN}` };
  const eig = jacobiEigenvalues(buildLaplacian(nbrs));
  const gap = eig.find((l) => l > 1e-9) ?? 0;
  return {
    skipped: false,
    eigenvalues: eig,
    smallest: eig.slice(0, 5),
    largest: eig.slice(-3),
    spectralGap: gap,
    lambdaMax: eig[eig.length - 1],
    dos: dosFit(eig),
  };
}

/* N(<= lambda) ~ lambda^{d_spec/2}. */
export function dosFit(eig, fractions = [0.05, 0.1, 0.2, 0.3, 0.4]) {
  const lamMax = eig[eig.length - 1];
  const xs = [],
    ys = [],
    samples = [];
  for (const f of fractions) {
    const thr = f * lamMax;
    const cnt = eig.filter((l) => l <= thr).length;
    samples.push({ lambda: thr, count: cnt });
    if (thr > 0 && cnt > 0) {
      xs.push(thr);
      ys.push(cnt);
    }
  }
  if (xs.length < 2) return { samples, slope: 0, dSpec: 0 };
  const fit = logLogFit(xs, ys);
  return { samples, slope: fit.slope, intercept: fit.intercept, dSpec: 2 * fit.slope };
}

/* ---------------- Kernel Polynomial Method ---------------- */

function sparseLv(nbrs, v) {
  const out = new Float64Array(v.length);
  for (let i = 0; i < v.length; i++) {
    let acc = nbrs[i].length * v[i];
    for (const j of nbrs[i]) acc -= v[j];
    out[i] = acc;
  }
  return out;
}

export function kpmMoments(nbrs, { moments = 128, samples = 16, a, b, rng }) {
  const n = nbrs.length;
  const mu = new Float64Array(moments);
  const applyLt = (v) => {
    const Lv = sparseLv(nbrs, v);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = (Lv[i] - a * v[i]) / b;
    return out;
  };
  for (let s = 0; s < samples; s++) {
    const z = new Float64Array(n);
    for (let i = 0; i < n; i++) z[i] = rng() < 0.5 ? -1 : 1;
    let t0 = z;
    let t1 = applyLt(t0);
    mu[0] += dot(z, t0) / n;
    if (moments > 1) mu[1] += dot(z, t1) / n;
    for (let k = 2; k < moments; k++) {
      const lt = applyLt(t1);
      const t2 = new Float64Array(n);
      for (let i = 0; i < n; i++) t2[i] = 2 * lt[i] - t0[i];
      mu[k] += dot(z, t2) / n;
      t0 = t1;
      t1 = t2;
    }
  }
  return Array.from(mu, (m) => m / samples);
}

const dot = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

export function jacksonKernel(k, M) {
  const Mp = M + 1;
  return (
    ((Mp - k) / Mp) * Math.cos((Math.PI * k) / Mp) +
    Math.sin((Math.PI * k) / Mp) / Math.tan(Math.PI / Mp) / Mp
  );
}

export function kpmDensityAt(x, mu) {
  const M = mu.length;
  let s = mu[0];
  let tPrev = 1,
    tCurr = x;
  if (M > 1) s += 2 * jacksonKernel(1, M) * mu[1] * x;
  for (let k = 2; k < M; k++) {
    const tNext = 2 * x * tCurr - tPrev;
    s += 2 * jacksonKernel(k, M) * mu[k] * tNext;
    tPrev = tCurr;
    tCurr = tNext;
  }
  return s / (Math.PI * Math.sqrt(Math.max(1 - x * x, 1e-12)));
}

export function runKpm(cluster, { moments = 128, samples = 16, rng, degreeMean, degreeMax }) {
  const nbrs = cluster.nbrs;
  const a = degreeMean;
  const b = degreeMax + 1;
  const mu = kpmMoments(nbrs, { moments, samples, a, b, rng });

  const dosSamples = [];
  for (let x = -0.95; x <= 0.96; x += 0.1) {
    dosSamples.push({ lambda: a + x * b, rho: kpmDensityAt(x, mu) });
  }

  // Low-lambda tail: rho ~ lambda^{d_s/2 - 1}
  const tx = [],
    ty = [];
  for (let x = -0.999; x <= -0.8; x += 0.002) {
    const lam = a + x * b;
    const rho = kpmDensityAt(x, mu);
    if (lam > 1e-3 && rho > 1e-6) {
      tx.push(lam);
      ty.push(rho);
    }
  }
  const tail = tx.length >= 4 ? logLogFit(tx, ty) : { slope: 0, n: tx.length };
  const dSpecTail = tx.length >= 4 ? 2 * (tail.slope + 1) : 0;

  // Integrated DOS: N(<=lambda) ~ lambda^{d_s/2}
  const gx = [],
    grho = [];
  for (let x = -0.999; x <= 0.99; x += 0.002) {
    gx.push(a + x * b);
    grho.push(Math.max(kpmDensityAt(x, mu), 0));
  }
  const cx = [],
    cy = [];
  let cdf = 0;
  for (let k = 1; k < gx.length; k++) {
    cdf += 0.5 * (grho[k] + grho[k - 1]) * (gx[k] - gx[k - 1]);
    if (gx[k] > 0.05 && gx[k] < 2.0 && cdf > 1e-6) {
      cx.push(gx[k]);
      cy.push(cdf);
    }
  }
  const cdfFit = cx.length >= 4 ? logLogFit(cx, cy) : { slope: 0, n: cx.length };

  return {
    rescale: { a, b, mu0: mu[0] },
    moments: mu.slice(0, 6),
    dosSamples,
    tailSlope: tail.slope,
    dSpecTail,
    cdfSlope: cdfFit.slope,
    dSpecCdf: cx.length >= 4 ? 2 * cdfFit.slope : 0,
  };
}
