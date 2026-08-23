/* Outer-totalistic cellular automata on the tiling graph (Sec. 9/10/15). */

import { bfsDistances } from '../graph/analysis.js';

export function makeRule(B, S) {
  const b = new Set(B),
    s = new Set(S);
  return (self, sum) => (self === 1 ? (s.has(sum) ? 1 : 0) : b.has(sum) ? 1 : 0);
}

export function step(nbrs, state, rule) {
  const next = new Uint8Array(state.length);
  for (let i = 0; i < state.length; i++) {
    let sum = 0;
    for (const j of nbrs[i]) sum += state[j];
    next[i] = rule(state[i], sum);
  }
  return next;
}

export const population = (s) => s.reduce((a, b) => a + b, 0);
const stateKey = (s) => s.join('');

/* Run until cycle detection or T steps; classify the fate. */
export function runRule(nbrs, seed, B, S, T) {
  const rule = makeRule(B, S);
  const seen = new Map([[stateKey(seed), 0]]);
  let state = seed;
  const pops = [population(seed)];
  let period = 0,
    transient = T;
  for (let t = 1; t <= T; t++) {
    state = step(nbrs, state, rule);
    pops.push(population(state));
    const key = stateKey(state);
    const prev = seen.get(key);
    if (prev !== undefined) {
      period = t - prev;
      transient = prev;
      break;
    }
    seen.set(key, t);
  }
  const finalPop = pops[pops.length - 1];
  const maxPop = Math.max(...pops);
  let fate;
  if (finalPop === 0) fate = 'extinct';
  else if (period === 1) fate = 'still';
  else if (period > 1) fate = `period-${period}`;
  else if (finalPop > 3 * pops[0]) fate = 'growing';
  else fate = 'active';
  return { fate, period, transient, maxPop, finalPop, pops, state };
}

export function makeSeed(cluster, shape = 'triple') {
  const s = new Uint8Array(cluster.N);
  const nb = cluster.nbrs[cluster.originId];
  switch (shape) {
    case 'single':
      s[cluster.originId] = 1;
      break;
    case 'pair':
      s[cluster.originId] = 1;
      if (nb[0] !== undefined) s[nb[0]] = 1;
      break;
    case 'triple':
      s[cluster.originId] = 1;
      for (let i = 0; i < Math.min(2, nb.length); i++) s[nb[i]] = 1;
      break;
    case 'petal':
      for (const j of nb) s[j] = 1;
      break;
    case 'all':
      s[cluster.originId] = 1;
      for (const j of nb) s[j] = 1;
      break;
    default:
      s[cluster.originId] = 1;
  }
  return s;
}

/* Rule panel scaled to the graph valence, mirroring experiment.mac. */
export function rulePanel(n) {
  const b = Math.max(1, Math.round(n / 3));
  const h = Math.max(1, Math.round(n / 2));
  const raw = [
    [[b], [b - 1, b]],
    [[b], [b, b + 1]],
    [[b + 1], [b, b + 1]],
    [[b], [b - 1, b, b + 1]],
    [[b + 1], [b - 1, b, b + 1]],
    [
      [b, b + 1],
      [b, b + 1],
    ],
    [[1], [1, 2]],
    [[1], [1]],
    [[b], [b + 1]],
    [[b + 1], [b + 1]],
    [
      [b, h],
      [b - 1, b, b + 1],
    ],
    [[h], [h - 1, h]],
    [
      [b - 1, b],
      [b - 1, b],
    ],
    [[b + 1], [b, b + 1, b + 2]],
    [[b], Array.from({ length: b + 2 }, (_, i) => i + 1)],
  ];
  return raw
    .filter(([Bs, Ss]) => Bs.every((x) => x >= 0) && Ss.every((x) => x >= 0))
    .map(([Bs, Ss]) => ({
      B: [...new Set(Bs)].sort((x, y) => x - y),
      S: [...new Set(Ss)].sort((x, y) => x - y),
    }))
    .map((r) => ({ ...r, label: `B${r.B.join('')}/S${r.S.join('')}` }));
}

export function surveyRules(cluster, { T = 8, seedShape = 'triple' } = {}) {
  const seed = makeSeed(cluster, seedShape);
  const panel = rulePanel(cluster.n);
  const results = panel.map((r) => ({ ...r, ...runRule(cluster.nbrs, seed, r.B, r.S, T) }));
  const classify = { extinct: 0, still: 0, periodic: 0, growing: 0, active: 0 };
  for (const r of results) {
    if (r.fate === 'extinct') classify.extinct++;
    else if (r.fate === 'still') classify.still++;
    else if (r.fate === 'growing') classify.growing++;
    else if (r.fate === 'active') classify.active++;
    else classify.periodic++;
  }
  let best = null;
  for (const r of results)
    if (r.fate !== 'extinct' && r.maxPop < cluster.N / 2 && (!best || r.maxPop > best.maxPop))
      best = r;
  return { results, classify, best };
}

/* Glider / oscillator hunt: look for periodic orbits that also move. */
export function gliderHunt(
  cluster,
  { T = 8, shapes = ['single', 'pair', 'triple', 'petal', 'all'], maxRules = 5 } = {}
) {
  const dist = bfsDistances(cluster.nbrs, cluster.originId);
  const meanDist = (s) => {
    let tot = 0,
      cnt = 0;
    for (let i = 0; i < s.length; i++)
      if (s[i]) {
        tot += dist[i] < 0 ? 0 : dist[i];
        cnt++;
      }
    return cnt ? tot / cnt : 0;
  };
  const panel = rulePanel(cluster.n).slice(0, maxRules);
  const trials = [];
  for (const rule of panel) {
    for (const shape of shapes) {
      const seed = makeSeed(cluster, shape);
      const rf = makeRule(rule.B, rule.S);
      const seen = new Map([[seed.join(''), 0]]);
      let state = seed;
      const dists = [meanDist(seed)];
      let period = 0,
        transient = 0;
      for (let t = 1; t <= T; t++) {
        state = step(cluster.nbrs, state, rf);
        dists.push(meanDist(state));
        const key = state.join('');
        const prev = seen.get(key);
        if (prev !== undefined) {
          period = t - prev;
          transient = prev;
          break;
        }
        seen.set(key, t);
      }
      let amplitude = 0,
        drift = 0;
      if (period > 1) {
        const seg = dists.slice(transient);
        amplitude = Math.max(...seg) - Math.min(...seg);
        drift = seg[seg.length - 1] - seg[0];
      }
      trials.push({ label: rule.label, shape, period, transient, amplitude, drift });
    }
  }
  const oscillators = trials.filter((t) => t.period > 1).length;
  const gliders = trials.filter((t) => t.period > 1 && t.amplitude > 0.5).length;
  return { trials, oscillators, gliders };
}
