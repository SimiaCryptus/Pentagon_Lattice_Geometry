/* Port of erdos.mac: the analytic Erdos catalog for the pentagonal
   lattice (independent of any particular BFS cluster). */

import { Logger } from '../util/logger.js';
import {
  PHI, PSI, fib, zphiNorm, q5Float, q5Norm, q5ToZphi,
} from '../math/numberTheory.js';

export const erdosParamSchema = [
  { key: 'maxRing', label: 'MAX_RING', type: 'number', default: 12 },
  { key: 'normSearchMax', label: 'NORM_SEARCH_MAX', type: 'number', default: 12 },
  { key: 'dEff', label: 'd_eff for D(n) model', type: 'number', default: 2.3, step: 0.1 },
  { key: 'crossSheetFraction', label: 'cross-sheet fraction', type: 'number', default: 1, step: 0.05 },
  { key: 'pinwheelKMax', label: 'PINWHEEL_KMAX', type: 'number', default: 16 },
];

/* Five fundamental distance classes, erdos.md 1.2 (squared values). */
export const DISTANCE_CLASSES = [
  { name: 'edge (s = 1)', q5: [1, 0], symbolic: '1' },
  { name: 'short diagonal phi', q5: [3 / 2, 1 / 2], symbolic: 'phi^2' },
  { name: 'long diagonal phi^2', q5: [7 / 2, 3 / 2], symbolic: 'phi^4' },
  { name: 'second-shell edge', q5: [5 / 2, 1 / 2], symbolic: '2 + phi' },
  { name: 'cross-sheet', q5: [5 / 2, 3 / 2], symbolic: '3 phi + 1' },
];

/* Predicted ring catalog, erdos.md 4.2. */
export const RING_CATALOG = [
  { k: 1, q5: [1, 0], mult: 5, note: 'edge length (unit)' },
  { k: 2, q5: [3 / 2, 1 / 2], mult: 5, note: 'short diagonal' },
  { k: 3, q5: [5 / 2, 1 / 2], mult: 10, note: 'second-shell edge' },
  { k: 4, q5: [7 / 2, 3 / 2], mult: 5, note: 'long diagonal' },
  { k: 5, q5: [9 / 2, 1 / 2], mult: 10, note: 'mixed shell' },
  { k: 6, q5: [3, 1], mult: 10, note: 'double short diagonal' },
  { k: 7, q5: [9, 4], mult: 5, note: 'third-order diagonal' },
  { k: 8, q5: [4, 1], mult: 20, note: 'high-multiplicity' },
];

export function countNormRepresentations(target, searchMax) {
  let count = 0;
  const reps = [];
  for (let x = -searchMax; x <= searchMax; x++)
    for (let y = -searchMax; y <= searchMax; y++)
      if (zphiNorm([x, y]) === target) { count++; if (reps.length < 12) reps.push([x, y]); }
  return { target, count, reps };
}

export function runErdosExperiment(opts = {}, logger = new Logger()) {
  const maxRing = opts.maxRing ?? 12;
  const searchMax = opts.normSearchMax ?? 12;
  const dEff = opts.dEff ?? 2.3;
  const crossFrac = opts.crossSheetFraction ?? 1;
  const pinwheelKMax = opts.pinwheelKMax ?? 16;
  const logNPoints = opts.logNPoints ?? [10, 25, 50, 100, 250, 500, 1000];

  logger.header('erdos: distance catalog for the pentagonal lattice');
  logger.log('MAX_RING =', maxRing, ' NORM_SEARCH_MAX =', searchMax, ' d_eff =', dEff);

  /* Section 2: norm form. */
  const normSamples = [[1, 0], [0, 1], [1, 1], [1, 2], [2, 1], [2, 3]]
    .map((p) => ({ pair: p, norm: zphiNorm(p) }));
  let unitCheck = true;
  for (let k = 1; k <= 7; k++) {
    let p = [1, 0];
    for (let i = 0; i < k; i++) p = [p[0] * 0 + p[1] * 1, p[0] * 1 + p[1] * 1];
    if (zphiNorm(p) !== (-1) ** k) unitCheck = false;
  }
  logger.rule();
  logger.log('N(a + b phi) = a^2 + ab - b^2; samples:',
    normSamples.map((s) => `N(${s.pair}) = ${s.norm}`).join(', '));
  logger.log('N(phi^n) = (-1)^n verified:', unitCheck);

  /* Section 3: five fundamental classes. */
  const classes = DISTANCE_CLASSES.map((c) => ({
    ...c, value: q5Float(c.q5), zphi: q5ToZphi(c.q5), norm: q5Norm(c.q5),
  }));
  logger.rule();
  logger.table(['class', 'squared', '(r,s)', 'decimal'],
    classes.map((c) => [c.name, c.symbolic, `[${c.q5}]`, c.value]),
    [24, 14, 16, 12]);

  /* Section 4: Fibonacci spacing delta_k = F_{2k} + F_{2k-1} sqrt5. */
  const spacing = [];
  let prev = 0;
  for (let k = 1; k <= maxRing; k++) {
    const pair = [fib(2 * k), fib(2 * k - 1)];
    const value = q5Float(pair);
    spacing.push({ k, pair, value, ratio: prev ? value / prev : 0 });
    prev = value;
  }
  const spacingRatios = spacing.filter((s) => s.ratio > 0).map((s) => s.ratio);
  const meanRatio = spacingRatios.reduce((a, b) => a + b, 0) / spacingRatios.length;
  logger.rule();
  logger.log('Fibonacci ring spacing: mean ratio =', meanRatio,
    ' phi^2 =', PHI * PHI, ' deviation =', Math.abs(meanRatio - PHI * PHI));

  /* Section 5: norm representation counts. */
  const normCounts = [1, -1, 4, -4, 5, 9, -9, 11, 16, -16, 19, 20, 25, 29, 31, 36]
    .map((t) => countNormRepresentations(t, searchMax));
  logger.rule();
  for (const nc of normCounts) logger.log(`  N = ${nc.target}: reps in box = ${nc.count}`);

  /* Section 6: catalog with consistency and ratios. */
  const catalog = RING_CATALOG.map((r, i, arr) => {
    const value = q5Float(r.q5);
    const prevVal = i > 0 ? q5Float(arr[i - 1].q5) : 0;
    return { ...r, value, zphi: q5ToZphi(r.q5), norm: q5Norm(r.q5), ratio: prevVal ? value / prevVal : 0 };
  });
  logger.rule();
  logger.table(['k', 'delta', '(r,s)', 'decimal', '|R_k|', 'ratio', 'notes'],
    catalog.map((c) => [c.k, '', `[${c.q5}]`, c.value, c.mult, c.ratio, c.note]),
    [4, 6, 14, 12, 7, 10, 26]);

  /* Section 7: Galois pairing phi^k psi^k = (-1)^k. */
  const galois = [];
  let galoisOk = true;
  for (let k = 1; k <= 6; k++) {
    const prod = PHI ** k * PSI ** k;
    const expected = (-1) ** k;
    if (Math.abs(prod - expected) > 1e-10) galoisOk = false;
    galois.push({ k, phiK: PHI ** k, psiK: Math.abs(PSI ** k), product: prod, expected, familySize: PHI ** k });
  }
  logger.rule();
  logger.log('Galois pairing phi^k psi^k = (-1)^k verified:', galoisOk);

  /* Section 8: D(n) = O(log n) scaling. */
  const predictedD = (n) => Math.floor(((2 / dEff) * Math.log(n)) / Math.log(PHI * PHI));
  const scaling = logNPoints.map((n) => {
    const D = predictedD(n);
    return { n, logN: Math.log(n), D, ratio: D / Math.log(n), integerLattice: n / Math.sqrt(Math.log(n)) };
  });
  const meanRatioD = scaling.reduce((s, r) => s + r.ratio, 0) / scaling.length;
  logger.rule();
  logger.table(['n', 'log n', 'D(n)', 'D/log n', 'Z^2 bound'],
    scaling.map((r) => [r.n, r.logN, r.D, r.ratio, r.integerLattice]), [8, 10, 8, 12, 14]);
  logger.log('mean D(n)/log n =', meanRatioD,
    ' expected ~', 2 / (dEff * Math.log(PHI * PHI)));

  const bigComparison = [100, 500, 1000, 5000, 10000, 50000].map((n) => {
    const D = predictedD(n);
    const z2 = n / Math.sqrt(Math.log(n));
    return { n, D, z2, ratio: z2 / D };
  });

  /* Section 9: cross-sheet families.  sheet_fix.md: fiber is Z_2, so
     every edge flips orientation -> default fraction 1 (legacy 2/3). */
  const crossSheet = catalog.map((c) => ({ k: c.k, mult: c.mult, crossSize: crossFrac * c.mult }));
  logger.rule();
  logger.log('cross-sheet family sizes (fraction =', crossFrac,
    '; legacy signed-3 value 2/3 is superseded by sheet_fix.md)');

  /* Section 10: pinwheel direction sampling. */
  const baseArg = Math.atan2(PHI, 1);
  const pinwheel = [];
  for (let k = 0; k <= pinwheelKMax; k++) {
    const wrapped = ((baseArg + (k * 2 * Math.PI) / 5) % ((2 * Math.PI) / 5) + (2 * Math.PI) / 5) % ((2 * Math.PI) / 5);
    pinwheel.push({ k, argDeg: (baseArg * 180) / Math.PI, foldedDeg: (wrapped * 180) / Math.PI });
  }
  logger.rule();
  logger.log('pinwheel: real phi does not rotate v, but <R_72, phi-scaling>');
  logger.log('gives dense rays when arg(v) is irrational mod 2pi/5.');

  logger.rule('=');
  logger.log('erdos: catalog complete');

  return {
    experiment: 'erdos',
    params: { maxRing, normSearchMax: searchMax, dEff, crossSheetFraction: crossFrac, pinwheelKMax },
    normForm: { samples: normSamples, unitNormVerified: unitCheck },
    fundamentalClasses: classes,
    spacing, meanSpacingRatio: meanRatio, phiSquared: PHI * PHI,
    normCounts,
    catalog,
    galois: { verified: galoisOk, data: galois },
    scaling, meanRatioD, bigComparison,
    crossSheet,
    pinwheel,
    tables: [
      { title: 'Fundamental distance classes', columns: ['class', 'symbolic', '(r,s)', 'decimal', 'norm'], rows: classes.map((c) => [c.name, c.symbolic, `[${c.q5}]`, c.value, c.norm]) },
      { title: 'Ring catalog', columns: ['k', '(r,s)', 'decimal', '|R_k|', 'ratio', 'note'], rows: catalog.map((c) => [c.k, `[${c.q5}]`, c.value, c.mult, c.ratio, c.note]) },
      { title: 'Fibonacci spacing', columns: ['k', 'delta_k', 'ratio'], rows: spacing.map((s) => [s.k, s.value, s.ratio]) },
      { title: 'Norm representations', columns: ['N', 'count'], rows: normCounts.map((n) => [n.target, n.count]) },
      { title: 'D(n) scaling', columns: ['n', 'D_pent', 'D_Z2', 'ratio'], rows: bigComparison.map((r) => [r.n, r.D, r.z2, r.ratio]) },
    ],
    log: logger.text(),
  };
}