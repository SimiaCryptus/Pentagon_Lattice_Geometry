#!/usr/bin/env node
/* Node CLI:  node src/cli.js <experiment> [--key value ...] [--json out.json] */

import { writeFileSync } from 'node:fs';
import { EXPERIMENTS, getExperiment, defaultParams, runExperiment } from './experiments/registry.js';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) { out[key] = true; continue; }
    i++;
    if (next === 'true') out[key] = true;
    else if (next === 'false') out[key] = false;
    else if (/^-?\d+(\.\d+)?$/.test(next)) out[key] = Number(next);
    else out[key] = next;
  }
  return out;
}

function usage() {
  console.log('usage: node src/cli.js <experiment> [--key value ...] [--json out.json] [--csv out.csv]\n');
  console.log('experiments:');
  for (const e of EXPERIMENTS) {
    console.log(`  ${e.id.padEnd(10)} ${e.title}`);
    console.log(`  ${' '.repeat(10)} params: ${e.schema.map((p) => `${p.key}=${p.default}`).join(', ')}`);
  }
}

const [, , id, ...rest] = process.argv;
if (!id || id === '--help' || id === '-h') {
  usage();
  process.exit(id ? 0 : 1);
}
const exp = getExperiment(id);
if (!exp) { console.error(`unknown experiment: ${id}\n`); usage(); process.exit(1); }

const args = parseArgs(rest);
const jsonPath = args.json;
const csvPath = args.csv;
delete args.json;
delete args.csv;

const params = { ...defaultParams(id), ...args };
const result = runExperiment(id, params, { echo: true });

if (jsonPath && typeof jsonPath === 'string') {
  const { log, ...rest2 } = result;
  writeFileSync(jsonPath, JSON.stringify(rest2, null, 2));
  console.log(`\n[written] ${jsonPath}`);
}
if (csvPath && typeof csvPath === 'string') {
  const csv = result.csv || tablesToCsv(result.tables || []);
  writeFileSync(csvPath, csv);
  console.log(`[written] ${csvPath}`);
}
if (result.passed === false) process.exit(1);

function tablesToCsv(tables) {
  return tables.map((t) => [`# ${t.title}`, t.columns.join(','), ...t.rows.map((r) => r.join(','))].join('\n')).join('\n\n');
}