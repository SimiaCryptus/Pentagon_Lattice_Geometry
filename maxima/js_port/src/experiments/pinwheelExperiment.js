/* Port of pinwheels.mac: edge-restricted reconnection experiments. */

import { Logger } from '../util/logger.js';
import { makeRng } from '../util/rng.js';
import {
  POLYGONS,
  ACTIVE_MODES,
  edgePartition,
  edgeLengths,
  edgeAngles,
  orientationGroupAnalysis,
  buildPinwheelCluster,
  pinwheelDimensions,
  pinwheelHolonomy,
  hierarchyLevel,
} from '../pinwheel/pinwheel.js';
import { walkStatistics, alexanderOrbach } from '../dynamics/randomWalk.js';
import { laplacianSpectrum } from '../graph/spectral.js';
import { countTriangles, meanClustering } from '../graph/analysis.js';

export const pinwheelParamSchema = [
  {
    key: 'polyType',
    label: 'polygon',
    type: 'select',
    default: 'CR_triangle',
    options: Object.keys(POLYGONS),
  },
  {
    key: 'activeMode',
    label: 'active mode',
    type: 'select',
    default: 'legs_only',
    options: ACTIVE_MODES,
  },
  { key: 'depth', label: 'BFS depth', type: 'number', default: 3, min: 1, max: 7 },
  { key: 'fiberOrder', label: 'fiber order (weak edges)', type: 'number', default: 8, min: 2 },
  { key: 'walks', label: 'walks', type: 'number', default: 200 },
  { key: 'steps', label: 'walk steps', type: 'number', default: 30 },
  { key: 'eigMaxN', label: 'eig max N', type: 'number', default: 800 },
  { key: 'seed', label: 'RNG seed', type: 'number', default: 20250115 },
  { key: 'compareAll', label: 'compare all polygons/modes', type: 'boolean', default: false },
];

export function runPinwheelExperiment(opts = {}, logger = new Logger()) {
  const polyType = opts.polyType ?? 'CR_triangle';
  const activeMode = opts.activeMode ?? 'legs_only';
  const depth = opts.depth ?? 3;
  const fiberOrder = opts.fiberOrder ?? 8;
  const rng = makeRng(opts.seed ?? 20250115);

  logger.header(`pinwheel: ${polyType} / ${activeMode}`);
  const single = analyzeConfiguration({
    polyType,
    activeMode,
    depth,
    fiberOrder,
    opts,
    rng,
    logger,
  });

  let comparison = null;
  if (opts.compareAll) {
    logger.rule('=');
    logger.log('cross-polygon comparison');
    comparison = [];
    for (const p of Object.keys(POLYGONS))
      for (const m of ACTIVE_MODES) {
        try {
          const r = analyzeConfiguration({
            polyType: p,
            activeMode: m,
            depth: Math.min(depth, 3),
            fiberOrder,
            opts: { ...opts, walks: 60, steps: 20 },
            rng: makeRng(opts.seed ?? 20250115),
            logger: new Logger(),
          });
          comparison.push({
            polyType: p,
            activeMode: m,
            N: r.cluster.N,
            orientations: r.cluster.observedOrientations,
            allRational: r.orientationGroup.allRational,
            dEff: r.dimensions.dEff,
            level: r.hierarchyLevel,
          });
          logger.log(
            ` ${p}/${m}: N=${r.cluster.N} orient=${r.cluster.observedOrientations}`,
            `d_eff=${r.dimensions.dEff.toFixed(4)} -> ${r.hierarchyLevel}`
          );
        } catch (e) {
          comparison.push({ polyType: p, activeMode: m, error: String(e.message || e) });
          logger.log(` ${p}/${m}: ERROR ${e.message || e}`);
        }
      }
  }

  return {
    experiment: 'pinwheel',
    params: { polyType, activeMode, depth, fiberOrder, seed: opts.seed ?? 20250115 },
    ...single,
    comparison,
    tables: [
      {
        title: 'Edge partition',
        columns: ['k', 'label', 'length', 'angle(deg)', 'active', 'weak'],
        rows: single.edges.map((e) => [e.k, e.label, e.length, e.angleDeg, e.active, e.weak]),
      },
      {
        title: 'BFS volume growth',
        columns: ['r', 'cumulative'],
        rows: single.dimensions.cumulative.map((c, r) => [r, c]),
      },
      ...(comparison
        ? [
            {
              title: 'Cross-polygon comparison',
              columns: ['polygon', 'mode', 'N', 'orientations', 'finite?', 'd_eff', 'level'],
              rows: comparison.map((c) => [
                c.polyType,
                c.activeMode,
                c.N ?? '',
                c.orientations ?? '',
                c.allRational ?? '',
                c.dEff ?? '',
                c.level ?? c.error,
              ]),
            },
          ]
        : []),
    ],
    log: logger.text(),
  };
}

function analyzeConfiguration({ polyType, activeMode, depth, fiberOrder, opts, rng, logger }) {
  const poly = POLYGONS[polyType];
  const part = edgePartition(polyType, activeMode);
  const lengths = edgeLengths(polyType);
  const angles = edgeAngles(polyType);
  const edges = poly.edges.map((label, k) => ({
    k,
    label,
    length: lengths[k],
    angleDeg: (angles[k] * 180) / Math.PI,
    active: part.active[k],
    weak: part.weak[k],
  }));

  logger.log('polygon:', poly.note, ' field =', poly.field);
  logger.log(
    '|E_A| =',
    part.active.filter(Boolean).length,
    ' |E_weak| =',
    part.weak.filter(Boolean).length,
    ' |E_I| =',
    part.active.filter((a, i) => !a && !part.weak[i]).length
  );

  /* Section 4: orientation group. */
  const og = orientationGroupAnalysis(polyType, activeMode);
  logger.rule();
  logger.log(
    'pair rotations (rad):',
    og.rotations.map((r) => r.toFixed(6))
  );
  for (const t of og.tests)
    logger.log(
      t.rational
        ? `  theta ~ ${t.theta.toFixed(6)} = ${t.p}/${t.q} pi  order ${t.order}`
        : `  theta ~ ${t.theta.toFixed(6)} NOT a rational multiple of pi (dense in SO(2))`
    );
  logger.log(
    og.allRational
      ? `orientation group order (lcm) = ${og.groupOrder}`
      : "WARNING: restricted family fails Criterion 1' (dense orientations)"
  );
  if (polyType === 'CR_triangle' && activeMode === 'legs_only')
    logger.log('expected Klein four-group Z_2 x Z_2 of order 4 (pinwheels.md 2.2)');

  /* Section 5: cluster. */
  const cluster = buildPinwheelCluster({ polyType, activeMode, depth, fiberOrder });
  const degrees = cluster.nbrs.map((l) => l.length);
  const stats = {
    N: cluster.N,
    degreeMin: Math.min(...degrees),
    degreeMax: Math.max(...degrees),
    degreeMean: degrees.reduce((a, b) => a + b, 0) / degrees.length,
    observedOrientations: cluster.observedOrientations,
    sheets: cluster.sheets,
    triangles: countTriangles(cluster.nbrs),
    clustering: meanClustering(cluster.nbrs).mean,
  };
  logger.rule();
  logger.log(
    'cluster N =',
    stats.N,
    ' mean valence =',
    stats.degreeMean,
    ` (target ${cluster.nActive + cluster.nWeak})`
  );
  logger.log(
    'distinct observed orientations =',
    stats.observedOrientations,
    ' sheets =',
    stats.sheets
  );

  /* Section 6: d_eff. */
  const dims = pinwheelDimensions(cluster);
  logger.log('BFS cumulative:', dims.cumulative, '  d_eff =', dims.dEff);

  /* Section 7: random walk. */
  const walk = walkStatistics(cluster, {
    walks: opts.walks ?? 200,
    steps: opts.steps ?? 30,
    rng,
    msdWindow: [2, Math.max(4, Math.min(opts.steps ?? 30, depth + 1))],
    p0Window: [2, Math.max(4, Math.min(opts.steps ?? 30, 2 * depth))],
  });
  const dSpecAO = alexanderOrbach(dims.dEff, walk.dW);
  logger.log('d_w =', walk.dW, ' d_spec(P_0) =', walk.dSpecP0, ' d_spec(AO) =', dSpecAO);

  /* Section 8: holonomy. */
  const holo = pinwheelHolonomy(cluster, { maxLen: 5 });
  logger.log(
    'holonomy:',
    holo.active
      ? `${holo.nontrivial}/${holo.cycles} non-trivial (fraction ${holo.fraction.toFixed(4)})`
      : holo.note
  );

  /* Section 9: Laplacian gap. */
  const spectrum = laplacianSpectrum(cluster.nbrs, { maxN: opts.eigMaxN ?? 800 });
  if (!spectrum.skipped) logger.log('algebraic connectivity =', spectrum.spectralGap);

  /* Section 10: hierarchy. */
  const level = hierarchyLevel({
    allRational: og.allRational,
    nWeak: cluster.nWeak,
    dEff: dims.dEff,
    observedOrientations: cluster.observedOrientations,
  });
  logger.rule();
  logger.log('hierarchy level:', level);

  return {
    polygon: { ...poly, edges },
    edges,
    orientationGroup: og,
    cluster: stats,
    dimensions: { ...dims, dW: walk.dW, dSpecP0: walk.dSpecP0, dSpecAO },
    holonomy: holo,
    spectrum: spectrum.skipped
      ? spectrum
      : {
          spectralGap: spectrum.spectralGap,
          smallest: spectrum.smallest,
          largest: spectrum.largest,
        },
    hierarchyLevel: level,
  };
}
