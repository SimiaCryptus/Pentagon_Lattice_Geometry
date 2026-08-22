/* Experiment registry consumed by both the CLI and the browser UI. */

import { Logger } from '../util/logger.js';
import { runLatticeExperiment, latticeParamSchema } from './latticeExperiment.js';
import { runAnalysisExperiment, analysisParamSchema } from './analysisExperiment.js';
import { runErdosExperiment, erdosParamSchema } from './erdosExperiment.js';
import { runPinwheelExperiment, pinwheelParamSchema } from './pinwheelExperiment.js';
import { runSweepExperiment, sweepParamSchema, runSmokeTest, smokeParamSchema } from './sweepExperiment.js';

export const EXPERIMENTS = [
  {
    id: 'lattice',
    title: 'Multi-sheeted n-gon lattice (experiment.mac)',
    description: 'Builds the Z_2 orientation-cover cluster in exact Z[zeta_n], then measures d_eff, d_w, d_spec, holonomy, CA dynamics, KPM spectra and the Erdos distance catalog.',
    schema: latticeParamSchema,
    run: (params, logger) => runLatticeExperiment(params, logger),
  },
  {
    id: 'analysis',
    title: 'Symbolic identities and n-gon sweep (analysis.mac)',
    description: 'Verifies golden-ratio / cyclotomic / dihedral / Laplacian identities numerically and sweeps the n-gon structural table.',
    schema: analysisParamSchema,
    run: (params, logger) => runAnalysisExperiment(params, logger),
  },
  {
    id: 'erdos',
    title: 'Erdos distance catalog (erdos.mac)',
    description: 'Analytic pentagonal-lattice catalog: norm form, ring table, Fibonacci spacing, Galois pairing, D(n) = O(log n).',
    schema: erdosParamSchema,
    run: (params, logger) => runErdosExperiment(params, logger),
  },
  {
    id: 'pinwheel',
    title: 'Pinwheel polygons, edge-restricted (pinwheels.mac)',
    description: 'Edge-restricted reconnection: observed orientation group, sheet transitions, d_eff and hierarchy level.',
    schema: pinwheelParamSchema,
    run: (params, logger) => runPinwheelExperiment(params, logger),
  },
  {
    id: 'sweep',
    title: 'n-gon parameter sweep (sweep_ngon.mac)',
    description: 'Runs the lattice experiment across a list of n and emits a comparison table plus CSV.',
    schema: sweepParamSchema,
    run: (params, logger) => runSweepExperiment(params, logger),
  },
  {
    id: 'smoke',
    title: 'Regression smoke test (smoke_test.mac)',
    description: 'Cheap assertions across n in {3,4,5,6}: cluster size, d_eff range, vortex fraction, Z_2 holonomy parity.',
    schema: smokeParamSchema,
    run: (params, logger) => runSmokeTest(params, logger),
  },
];

export const getExperiment = (id) => EXPERIMENTS.find((e) => e.id === id);

export function defaultParams(id) {
  const exp = getExperiment(id);
  if (!exp) throw new Error(`unknown experiment: ${id}`);
  const out = {};
  for (const p of exp.schema) out[p.key] = p.default;
  return out;
}

export function runExperiment(id, params = {}, { echo = false, sink = null } = {}) {
  const exp = getExperiment(id);
  if (!exp) throw new Error(`unknown experiment: ${id}`);
  const merged = { ...defaultParams(id), ...params };
  const logger = new Logger({ echo, sink });
  return exp.run(merged, logger);
}