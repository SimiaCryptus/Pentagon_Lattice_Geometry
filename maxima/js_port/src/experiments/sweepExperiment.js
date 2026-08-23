/* Port of sweep_ngon.mac and smoke_test.mac. */

import { Logger } from '../util/logger.js';
import { runLatticeExperiment } from './latticeExperiment.js';
import { TAU_MODES } from '../graph/lattice.js';

export const sweepParamSchema = [
  { key: 'ns', label: 'n values (csv)', type: 'text', default: '3,4,5,6,7,8,10,12' },
  {
    key: 'preset',
    label: 'preset',
    type: 'select',
    default: 'small',
    options: ['tiny', 'small', 'medium', 'large'],
  },
  { key: 'tauMode', label: 'TAU_MODE', type: 'select', default: 'z2', options: TAU_MODES },
  { key: 'runErdos', label: 'Erdos catalog', type: 'boolean', default: false },
  { key: 'runCA', label: 'CA survey', type: 'boolean', default: false },
  { key: 'seed', label: 'RNG seed', type: 'number', default: 20250101 },
];

const parseNs = (v) =>
  (Array.isArray(v)
    ? v
    : String(v)
        .split(/[,\s]+/)
        .filter(Boolean)
        .map(Number)
  ).filter((n) => Number.isInteger(n) && n >= 3);

export function runSweepExperiment(opts = {}, logger = new Logger()) {
  const ns = parseNs(opts.ns ?? '3,4,5,6,7,8,10,12');
  const preset = opts.preset ?? 'small';
  const tauMode = opts.tauMode ?? 'z2';

  logger.header('sweep: n-gon parameter sweep');
  logger.log('n values =', ns, ' preset =', preset, ' tauMode =', tauMode);

  const rows = [];
  for (const n of ns) {
    logger.rule('*');
    logger.log('*** sweep iteration: n =', n);
    let res = null,
      status = 'OK',
      error = null;
    try {
      res = runLatticeExperiment(
        {
          ...opts,
          n,
          preset,
          tauMode,
          runErdos: opts.runErdos === true,
          runWebs: false,
          runCA: opts.runCA === true,
          runKPM: true,
        },
        new Logger()
      );
    } catch (e) {
      status = 'ERR';
      error = String(e.message || e);
      logger.log('*** ERROR:', error);
    }
    const row = res
      ? {
          n,
          N: res.cluster.N,
          meanDeg: res.cluster.degreeMean,
          dEff: res.dimensions.dEff,
          dEffFull: res.dimensions.dEffFull,
          dW: res.dimensions.dW,
          dSpecP0: res.dimensions.dSpecP0,
          dSpecAO: res.dimensions.dSpecAO,
          dSpecKPM: res.dimensions.dSpecKPMTail,
          dSpecKPMCdf: res.dimensions.dSpecKPMCdf,
          vortexEdges: res.cluster.vortexEdges,
          vortexFraction: res.cluster.vortexFraction,
          triangles: res.structure.triangles,
          girth: res.structure.girth,
          sheets: res.cluster.sheets.length,
          caFinalPop: res.automaton ? res.automaton.defaultRule.finalPop : null,
          deficitDeg: res.geometry.deficitDeg,
          loopClosure: res.geometry.loopClosure,
          status,
        }
      : { n, status, error };
    rows.push(row);
    logger.log('*** row:', JSON.stringify(row));
  }

  const columns = [
    'n',
    'N',
    'meanDeg',
    'dEff',
    'dEffFull',
    'dW',
    'dSpecP0',
    'dSpecAO',
    'dSpecKPM',
    'dSpecKPMCdf',
    'vortexEdges',
    'vortexFraction',
    'triangles',
    'girth',
    'sheets',
    'caFinalPop',
    'deficitDeg',
    'loopClosure',
    'status',
  ];
  const csv = [columns.join(',')]
    .concat(
      rows.map((r) =>
        columns.map((c) => (r[c] === undefined || r[c] === null ? '' : r[c])).join(',')
      )
    )
    .join('\n');

  logger.rule('=');
  logger.log('sweep summary');
  logger.log(csv);

  return {
    experiment: 'sweep',
    params: { ns, preset, tauMode },
    rows,
    csv,
    tables: [
      { title: 'Sweep summary', columns, rows: rows.map((r) => columns.map((c) => r[c] ?? '')) },
    ],
    log: logger.text(),
  };
}

/* smoke_test.mac: minimum-cost regression assertions. */
export const smokeParamSchema = [
  { key: 'preset', label: 'preset', type: 'select', default: 'tiny', options: ['tiny', 'small'] },
];

const CASES = [
  { n: 3, dEff: [1.0, 3.0], vortex: [0.0, 1.0] },
  { n: 4, dEff: [1.0, 3.0], vortex: [0.0, 1.0] },
  { n: 5, dEff: [1.0, 3.5], vortex: [0.3, 1.0] },
  { n: 6, dEff: [1.0, 3.0], vortex: [0.0, 1.0] },
];

export function runSmokeTest(opts = {}, logger = new Logger()) {
  const preset = opts.preset ?? 'tiny';
  logger.header('smoke_test: regression checks');
  const failures = [];
  const results = [];
  const assertRange = (name, value, lo, hi) => {
    const ok = value >= lo && value <= hi;
    if (!ok) failures.push(`${name} = ${value} not in [${lo}, ${hi}]`);
    logger.log(ok ? '  OK  ' : '  FAIL', name, '=', value, `in [${lo}, ${hi}]`);
    return ok;
  };

  for (const c of CASES) {
    logger.rule();
    logger.log('test case n =', c.n);
    try {
      const res = runLatticeExperiment(
        {
          n: c.n,
          preset,
          tauMode: 'z2',
          runErdos: false,
          runWebs: false,
          runCA: false,
          runKPM: false,
        },
        new Logger()
      );
      assertRange(`d_eff[n=${c.n}]`, res.dimensions.dEff, c.dEff[0], c.dEff[1]);
      assertRange(`N[n=${c.n}]`, res.cluster.N, 4, 5000);
      assertRange(`vortex_frac[n=${c.n}]`, res.cluster.vortexFraction, c.vortex[0], c.vortex[1]);
      assertRange(`holonomy parity mismatches[n=${c.n}]`, res.holonomy.parityMismatches, 0, 0);
      results.push({
        n: c.n,
        N: res.cluster.N,
        dEff: res.dimensions.dEff,
        vortexFraction: res.cluster.vortexFraction,
      });
    } catch (e) {
      failures.push(`n=${c.n} crashed: ${e.message || e}`);
      logger.log('  FAIL crash:', e.message || e);
    }
  }

  logger.rule('=');
  logger.log(failures.length === 0 ? 'ALL TESTS PASSED' : `TESTS FAILED (${failures.length})`);
  for (const f of failures) logger.log('  -', f);

  return {
    experiment: 'smoke',
    params: { preset },
    passed: failures.length === 0,
    failures,
    results,
    tables: [
      {
        title: 'Smoke results',
        columns: ['n', 'N', 'd_eff', 'vortexFraction'],
        rows: results.map((r) => [r.n, r.N, r.dEff, r.vortexFraction]),
      },
    ],
    log: logger.text(),
  };
}
