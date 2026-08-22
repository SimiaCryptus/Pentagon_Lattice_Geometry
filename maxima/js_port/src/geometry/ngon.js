/* Regular n-gon geometry (port of analysis.mac Sections 2 and 9). */

import { gcd, totient } from '../math/numberTheory.js';

export const interiorAngle = (n) => ((n - 2) * Math.PI) / n;
export const exteriorAngle = (n) => (2 * Math.PI) / n;
export const sumInteriorAngles = (n) => (n - 2) * Math.PI;
export const circumradius = (n) => 1 / (2 * Math.sin(Math.PI / n));
export const apothem = (n) => 1 / (2 * Math.tan(Math.PI / n));
export const area = (n) => (n / 4) / Math.tan(Math.PI / n);
export const sideForUnitCircumradius = (n) => 2 * Math.sin(Math.PI / n);
export const diagonal = (n, k) => Math.sin((k * Math.PI) / n) / Math.sin(Math.PI / n);

/* Number of n-gons that fit flat around a vertex, and the residual. */
export function flatVertexCount(n) {
  return Math.floor((2 * Math.PI) / interiorAngle(n));
}

export function angularDeficit(n) {
  return 2 * Math.PI - flatVertexCount(n) * interiorAngle(n);
}

export function angularExcess(n) {
  return (flatVertexCount(n) + 1) * interiorAngle(n) - 2 * Math.PI;
}

/* Smallest k > 0 with k*theta an integer multiple of 2 pi. */
export function loopClosureIndex(n) {
  return (2 * n) / gcd(2 * n, n - 2);
}

export function loopClosureTurns(n) {
  return (loopClosureIndex(n) * (n - 2)) / (2 * n);
}

export function vertices(n, { radius = 1, phase = Math.PI / 2 } = {}) {
  return Array.from({ length: n }, (_, k) => {
    const a = phase + (2 * Math.PI * k) / n;
    return [radius * Math.cos(a), radius * Math.sin(a)];
  });
}

export function edgeVectors(n, opts) {
  const v = vertices(n, opts);
  return v.map((p, k) => {
    const q = v[(k + n - 1) % n];
    return [p[0] - q[0], p[1] - q[1]];
  });
}

/* Cellular-automaton rule-count formulas. */
export const outerTotalisticRules = (k) => 2 ** (2 * (k + 1));
export const totalisticRules = (k) => 2 ** (k + 2);
export const generalRules = (k) => 2 ** (2 ** (k + 1));
export const outerTotalisticRulesQ = (k, q) => q ** (q * (k * (q - 1) + 1));

/* Cycle C_n Laplacian eigenvalues and star K_{1,n} spectrum. */
export const cycleLaplacianEigenvalues = (n) =>
  Array.from({ length: n }, (_, k) => 2 - 2 * Math.cos((2 * Math.PI * k) / n));

export const cycleSpectralGap = (n) => 2 - 2 * Math.cos((2 * Math.PI) / n);

export const starLaplacianSpectrum = (n) => [0, ...new Array(n - 1).fill(1), n + 1];

export const heatTraceCycle = (n, t) =>
  cycleLaplacianEigenvalues(n).reduce((s, l) => s + Math.exp(-t * l), 0);

export const heatTraceStar = (n, t) => 1 + (n - 1) * Math.exp(-t) + Math.exp(-t * (n + 1));

export const spectralZetaCycle = (n, s) =>
  cycleLaplacianEigenvalues(n)
    .filter((l) => l > 1e-12)
    .reduce((acc, l) => acc + l ** -s, 0);

export function ngonSummary(n) {
  return {
    n,
    interiorAngleDeg: (interiorAngle(n) * 180) / Math.PI,
    exteriorAngleDeg: (exteriorAngle(n) * 180) / Math.PI,
    kFlat: flatVertexCount(n),
    deficitDeg: (angularDeficit(n) * 180) / Math.PI,
    excessDeg: (angularExcess(n) * 180) / Math.PI,
    loopClosure: loopClosureIndex(n),
    turns: loopClosureTurns(n),
    totient: totient(n),
    realSubfieldDegree: n <= 2 ? 1 : totient(n) / 2,
    area: area(n),
    circumradius: circumradius(n),
    apothem: apothem(n),
    side: sideForUnitCircumradius(n),
    otRules: outerTotalisticRules(n),
    cycleGap: cycleSpectralGap(n),
    dihedralOrder: 2 * n,
  };
}