/* Port of experiment.mac: the full multi-sheeted n-gon pipeline. */

import { Logger } from '../util/logger.js';
import { makeRng } from '../util/rng.js';
import { resolvePreset } from './presets.js';
import { buildCluster, clusterStats, TAU_MODES } from '../graph/lattice.js';
import {
  bfsVolumes,
  estimateDeff,
  countTriangles,
  meanClustering,
  girthAtNode,
  sheetTransitionMatrix,
  perSheetStats,
} from '../graph/analysis.js';
import { laplacianSpectrum, runKpm } from '../graph/spectral.js';
import {
  walkStatistics,
  intraSheetStatistics,
  commuteScaling,
  alexanderOrbach,
} from '../dynamics/randomWalk.js';
import { surveyRules, gliderHunt, makeSeed, runRule } from '../dynamics/automaton.js';
import { analyzeHolonomy } from '../topology/holonomy.js';
import {
  distanceCatalog,
  fibonacciSpacing,
  multiplicityAnalysis,
  galoisPairs,
  pythagoreanTriples,
  distinctDistanceScaling,
  distanceWeb,
  directionAnalysis,
  compareWebToAdjacency,
} from '../erdos/distances.js';
import { ngonSummary } from '../geometry/ngon.js';

export const latticeParamSchema = [
  { key: 'n', label: 'N_GON', type: 'number', default: 5, min: 3, max: 24 },
  {
    key: 'preset',
    label: 'preset',
    type: 'select',
    default: 'small',
    options: ['tiny', 'small', 'medium', 'large', 'huge'],
  },
  { key: 'tauMode', label: 'TAU_MODE', type: 'select', default: 'z2', options: TAU_MODES },
  { key: 'seed', label: 'RNG seed', type: 'number', default: 20250101 },
  { key: 'depth', label: 'BFS depth (override)', type: 'number', default: 0 },
  { key: 'runErdos', label: 'Erdos catalog', type: 'boolean', default: true },
  { key: 'runWebs', label: 'distance webs', type: 'boolean', default: true },
  { key: 'runCA', label: 'CA survey', type: 'boolean', default: true },
  { key: 'runKPM', label: 'KPM spectral', type: 'boolean', default: true },
  { key: 'webClasses', label: '#webs', type: 'number', default: 4 },
  { key: 'directionClasses', label: '#direction classes', type: 'number', default: 6 },
];

export function runLatticeExperiment(opts = {}, logger = new Logger()) {
  const cfg = resolvePreset(opts.preset || 'small', {});
  const n = opts.n ?? 5;
  const depth = opts.depth && opts.depth > 0 ? opts.depth : cfg.depth;
  const tauMode = opts.tauMode ?? 'z2';
  const rng = makeRng(opts.seed ?? 20250101);
  const runErdos = opts.runErdos !== false;
  const runWebs = opts.runWebs !== false;
  const runCA = opts.runCA !== false;
  const runKPM = opts.runKPM !== false;

  logger.header(`experiment: multi-sheeted ${n}-gon tiling`);
  const geom = ngonSummary(n);
  logger.log('preset =', cfg.preset, ' depth =', depth, ' tauMode =', tauMode);
  logger.log(
    'interior angle =',
    geom.interiorAngleDeg,
    'deg   k_flat =',
    geom.kFlat,
    '  deficit =',
    geom.deficitDeg,
    'deg'
  );
  logger.log(
    'vertex-loop length =',
    geom.loopClosure,
    geom.loopClosure % 2 === 0 ? '(even => trivial Z_2 holonomy)' : '(odd)'
  );
  logger.log('fiber group order = 2 (Z_2 orientation cover; sheet_fix.md)');

  /* --- Section 3: cluster --- */
  const t0 = Date.now();
  const cluster = buildCluster({ n, depth, tauMode });
  const stats = clusterStats(cluster);
  logger.rule();
  logger.log('cluster N =', stats.N, ' edges =', stats.totalEdges);
  logger.log(
    'degree min/mean/max =',
    stats.degreeMin,
    '/',
    stats.degreeMean,
    '/',
    stats.degreeMax,
    ` (interior target ${n})`
  );
  logger.log(
    'sheets =',
    stats.sheets,
    ' vortex edges =',
    stats.vortexEdges,
    ' fraction =',
    stats.vortexFraction
  );
  if (cluster.chiralActive)
    logger.log('bipartite chirality violations =', stats.bipartiteViolations, '(should be 0)');

  /* --- Section 5: volume growth --- */
  const vols = bfsVolumes(cluster.nbrs, cluster.originId);
  const dEffInterior = estimateDeff(vols.cumulative, { interior: true });
  const dEffFull = estimateDeff(vols.cumulative, { interior: false });
  logger.rule();
  logger.log('BFS cumulative N(<=r) =', vols.cumulative);
  logger.log('d_eff (interior) =', dEffInterior.slope, '  d_eff (full) =', dEffFull.slope);

  /* --- Section 4: spectrum --- */
  const spectrum = laplacianSpectrum(cluster.nbrs, { maxN: cfg.eigMaxN });
  if (spectrum.skipped) logger.log('Laplacian eigendecomposition skipped:', spectrum.reason);
  else {
    logger.log('spectral gap =', spectrum.spectralGap, ' lambda_max =', spectrum.lambdaMax);
    logger.log('d_spec (DOS CDF) =', spectrum.dos.dSpec);
  }

  /* --- Section 6/7: random walks + Alexander-Orbach --- */
  const walk = walkStatistics(cluster, {
    walks: cfg.walks,
    steps: cfg.steps,
    rng,
    msdWindow: [2, Math.max(4, Math.min(cfg.steps, depth))],
    p0Window: [2, Math.max(4, Math.min(cfg.steps, 2 * depth))],
  });
  const intra = intraSheetStatistics(cluster, {
    walks: Math.max(50, Math.floor(cfg.walks / 20)),
    steps: Math.min(cfg.steps, 100),
    rng,
    msdWindow: [2, Math.max(4, Math.min(cfg.steps, depth))],
  });
  const dSpecAO = alexanderOrbach(dEffInterior.slope, walk.dW);
  logger.rule();
  logger.log('d_w (MSD early) =', walk.dW, '  late MSD slope =', walk.msdSlopeLate);
  logger.log('d_spec (P_0) =', walk.dSpecP0, '  d_spec (Alexander-Orbach) =', dSpecAO);
  logger.log(
    'd_w intra-sheet =',
    intra.dWIntra,
    '  mean sheet crossings/walk =',
    walk.meanSheetCrossings
  );
  if (dEffInterior.slope > 2 && dEffInterior.slope < 3)
    logger.log('OK: d_eff in (2,3) -- inside the predicted fractional window.');
  else logger.log('note: d_eff outside (2,3); cluster may be too small.');

  /* --- Section 8/12/16: holonomy --- */
  const holo = analyzeHolonomy(cluster, { maxLen: cfg.longLoopMax, groups: [2] });
  logger.rule();
  logger.log('cycles through origin (<=', cfg.longLoopMax, ') =', holo.cycleCount);
  logger.log(
    'Z_2 non-trivial =',
    holo.perGroup[0].nontrivial,
    '/',
    holo.cycleCount,
    '  residues =',
    holo.perGroup[0].residues
  );
  logger.log('Z_2 parity mismatches =', holo.parityMismatches, '(should be 0 for tauMode=z2)');
  logger.log(
    'vertex loop length =',
    holo.vertexLoopLength,
    ' holonomy =',
    holo.vertexLoopHolonomy,
    holo.vertexLoopTrivial ? '(TRIVIAL)' : '(non-trivial)'
  );

  /* --- Section 13/14: structure --- */
  const triangles = countTriangles(cluster.nbrs);
  const clustering = meanClustering(cluster.nbrs);
  const girth = girthAtNode(cluster.nbrs, cluster.originId, 8);
  const sheetMatrix = sheetTransitionMatrix(cluster);
  const perSheet = perSheetStats(cluster);
  logger.rule();
  logger.log(
    'triangles =',
    triangles,
    ' mean clustering =',
    clustering.mean,
    ' girth(origin) =',
    Number.isFinite(girth) ? girth : '> 8'
  );
  for (const s of perSheet)
    logger.log(
      '  sheet',
      s.sheet,
      ': nodes =',
      s.nodes,
      ' intra-edges =',
      s.intraEdges,
      ' meanIntraDeg =',
      s.meanIntraDegree
    );

  /* --- Section 18: KPM --- */
  let kpm = null;
  if (runKPM) {
    kpm = runKpm(cluster, {
      moments: cfg.kpmMoments,
      samples: cfg.kpmSamples,
      rng,
      degreeMean: stats.degreeMean,
      degreeMax: stats.degreeMax,
    });
    logger.rule();
    logger.log('KPM mu_0 =', kpm.rescale.mu0, '(should be ~1)');
    logger.log(
      'KPM d_spec (low-lambda tail) =',
      kpm.dSpecTail,
      '  d_spec (integrated DOS) =',
      kpm.dSpecCdf
    );
  }

  /* --- Section 9/10/15: cellular automata --- */
  let ca = null;
  if (runCA) {
    const seed = makeSeed(cluster, 'triple');
    const b = Math.max(1, Math.round(n / 3));
    const defaultRun = runRule(cluster.nbrs, seed, [b], [b - 1, b], cfg.caSteps);
    const survey = surveyRules(cluster, { T: cfg.caSteps });
    const gliders = gliderHunt(cluster, { T: cfg.caSteps });
    ca = { defaultRule: { B: [b], S: [b - 1, b], ...defaultRun }, survey, gliders };
    logger.rule();
    logger.log(
      `CA default B${b}/S${b - 1}${b}: fate =`,
      defaultRun.fate,
      ' final pop =',
      defaultRun.finalPop,
      ' max pop =',
      defaultRun.maxPop
    );
    logger.log('rule panel:', JSON.stringify(survey.classify));
    if (survey.best)
      logger.log('most active rule:', survey.best.label, ' max pop =', survey.best.maxPop);
    logger.log(
      'glider hunt: oscillators =',
      gliders.oscillators,
      ' gliders =',
      gliders.gliders,
      ' trials =',
      gliders.trials.length
    );
  }

  /* --- Section 23/24/25: Erdos catalog, webs, pinwheel --- */
  let erdos = null;
  if (runErdos) {
    const cat = distanceCatalog(cluster, { maxPairs: cfg.maxPairs });
    const spacing = fibonacciSpacing(cat.classes);
    const mult = multiplicityAnalysis(cat.classes, n);
    const gp = n === 5 ? galoisPairs(cluster, cat.classes, 2) : [];
    const pyth = pythagoreanTriples(cluster, cat.classes, Math.min(12, cat.classes.length));
    const scaling = distinctDistanceScaling(cluster.N, cat.count);
    const directions = directionAnalysis(cluster, cat.classes, {
      count: opts.directionClasses ?? 6,
    });
    let webs = [];
    if (runWebs) {
      const k = Math.min(opts.webClasses ?? 4, cat.classes.length);
      for (let i = 0; i < k; i++) {
        const w = distanceWeb(cluster, cat.classes[i]);
        if (i === 0) w.adjacencyComparison = compareWebToAdjacency(cluster, w);
        delete w.adjacency;
        webs.push(w);
      }
    }
    erdos = {
      catalog: {
        count: cat.count,
        pairs: cat.pairs,
        capped: cat.capped,
        classes: cat.classes.slice(0, 40).map(slimClass),
      },
      spacing,
      mult,
      galoisPairs: gp,
      pythagoreanTriples: pyth,
      scaling,
      directions,
      webs,
    };
    logger.rule();
    logger.log(
      'distinct squared distances =',
      cat.count,
      cat.capped ? `(pair scan capped at ${cfg.maxPairs})` : ''
    );
    logger.log(
      'mean spacing ratio =',
      spacing.mean,
      ' phi^2 =',
      spacing.phiSquared,
      ' deviation =',
      spacing.deviation
    );
    logger.log(
      'high-multiplicity rings =',
      mult.highMultiplicity.length,
      ' Galois pairs =',
      gp.length,
      ' Pythagorean triples =',
      pyth.length
    );
    if (scaling)
      logger.log(
        'D(P_n)/log n =',
        scaling.ratioToLogN,
        ' (O(1) expected; Z^2 bound ~',
        scaling.integerLatticeBound,
        ')'
      );
    logger.log(
      'pinwheel classes =',
      directions.pinwheelCount,
      '/',
      directions.classes.length,
      '  direction growth slope =',
      directions.growthSlope
    );
    for (const w of webs)
      logger.log(
        `  W_${w.index}: edges=${w.edges} deg=[${w.degreeMin},${w.degreeMax}]`,
        `comps=${w.components} tri=${w.triangles}`,
        w.regular ? 'REGULAR' : w.biregular ? 'BIREGULAR' : ''
      );
  }

  /* --- Section 21: commute times --- */
  const commute = commuteScaling(cluster, {
    rng,
    samples: Math.max(20, Math.min(200, Math.floor(cfg.walks / 100))),
    maxSteps: Math.max(100, cfg.steps),
    maxDistance: Math.min(depth, 4),
  });

  const elapsedMs = Date.now() - t0;
  logger.rule('=');
  logger.log(
    'summary: N =',
    stats.N,
    ' d_eff =',
    dEffInterior.slope,
    ' d_w =',
    walk.dW,
    ' d_spec(P0) =',
    walk.dSpecP0,
    ' d_spec(AO) =',
    dSpecAO
  );
  logger.log('elapsed', elapsedMs, 'ms');

  return {
    experiment: 'lattice',
    params: { n, preset: cfg.preset, depth, tauMode, seed: opts.seed ?? 20250101 },
    geometry: geom,
    cluster: stats,
    volumes: vols,
    dimensions: {
      dEff: dEffInterior.slope,
      dEffFull: dEffFull.slope,
      dW: walk.dW,
      dWIntra: intra.dWIntra,
      dSpecP0: walk.dSpecP0,
      dSpecAO,
      dSpecDOS: spectrum.skipped ? null : spectrum.dos.dSpec,
      dSpecKPMTail: kpm ? kpm.dSpecTail : null,
      dSpecKPMCdf: kpm ? kpm.dSpecCdf : null,
      subDiffusive: walk.dW > 2 && dSpecAO < dEffInterior.slope,
    },
    spectrum: spectrum.skipped
      ? spectrum
      : {
          spectralGap: spectrum.spectralGap,
          lambdaMax: spectrum.lambdaMax,
          dos: spectrum.dos,
        },
    kpm,
    walk: { msd: walk.msd, p0: walk.p0, meanSheetCrossings: walk.meanSheetCrossings },
    holonomy: holo,
    structure: {
      triangles,
      clustering,
      girth: Number.isFinite(girth) ? girth : null,
      sheetMatrix,
      perSheet,
    },
    automaton: ca,
    erdos,
    commute,
    elapsedMs,
    tables: buildTables({ stats, vols, dEffInterior, walk, holo, erdos, ca }),
    log: logger.text(),
  };
}

const slimClass = (c) => ({
  index: c.index,
  value: c.value,
  radius: c.radius,
  ringSize: c.ringSize,
  pairCount: c.pairCount,
  q5: c.q5 ?? null,
  zphi: c.zphi ?? null,
  norm: c.norm ?? null,
  fibIndex: c.fibIndex ?? 0,
});

function buildTables({ stats, vols, dEffInterior, walk, holo, erdos, ca }) {
  const tables = [];
  tables.push({
    title: 'BFS volume growth',
    columns: ['r', 'shell', 'cumulative'],
    rows: vols.cumulative.map((c, r) => [r, vols.shells[r], c]),
  });
  tables.push({
    title: 'Degree histogram',
    columns: ['degree', 'count'],
    rows: stats.degreeHistogram.map((h) => [h.deg, h.count]),
  });
  tables.push({
    title: 'MSD / P_0',
    columns: ['t', 'MSD', 'P_0'],
    rows: walk.msd.map((m, t) => [t, m, walk.p0[t]]),
  });
  if (erdos) {
    tables.push({
      title: 'Distance rings',
      columns: ['k', 'd^2', 'd', 'ring', 'pairs', 'norm', 'fib'],
      rows: erdos.catalog.classes.map((c) => [
        c.index,
        c.value,
        c.radius,
        c.ringSize,
        c.pairCount,
        c.norm ?? '',
        c.fibIndex || '',
      ]),
    });
    tables.push({
      title: 'Direction analysis (pinwheel)',
      columns: ['k', 'd^2', '#directions', 'maxGap', 'pinwheel'],
      rows: erdos.directions.classes.map((d) => [
        d.index,
        d.value,
        d.directions,
        d.maxGap,
        d.pinwheel,
      ]),
    });
  }
  if (ca) {
    tables.push({
      title: 'CA rule panel',
      columns: ['rule', 'fate', 'period', 'transient', 'maxPop', 'finalPop'],
      rows: ca.survey.results.map((r) => [
        r.label,
        r.fate,
        r.period,
        r.transient,
        r.maxPop,
        r.finalPop,
      ]),
    });
  }
  tables.push({
    title: 'Holonomy residues (Z_2)',
    columns: ['residue', 'count'],
    rows: holo.perGroup[0].residues.map((c, i) => [i, c]),
  });
  return tables;
}
