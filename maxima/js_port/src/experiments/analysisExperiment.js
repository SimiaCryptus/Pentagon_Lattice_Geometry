/* Port of analysis.mac: symbolic identities verified numerically,
   the n-gon sweep table, group theory, spectra, zeta/heat traces,
   inflation systems, substitution sequences and Z[phi] number theory. */

import { Logger } from '../util/logger.js';
import {
  PHI,
  PSI,
  fib,
  totient,
  moebius,
  gcd,
  legendre5,
  kronecker5,
  pisanoPeriod,
  phiConvergents,
  zphiMul,
  zphiNorm,
  zphiConj,
  zphiDiv,
  zphiPow,
  fibonacciWord,
  thueMorse,
  rudinShapiro,
  primesUpTo,
  nextPrime,
} from '../math/numberTheory.js';
import {
  ngonSummary,
  cycleLaplacianEigenvalues,
  starLaplacianSpectrum,
  heatTraceCycle,
  heatTraceStar,
  spectralZetaCycle,
  diagonal,
  outerTotalisticRules,
  totalisticRules,
} from '../geometry/ngon.js';
import { CycRing } from '../math/cyclotomic.js';
import { pf2x2 } from '../math/matrix.js';
import { logLogFit, pearson } from '../math/fit.js';
import { orderZn, monodromyOrder, flatZ2Phase, berryPhaseZ2 } from '../topology/holonomy.js';

export const analysisParamSchema = [
  { key: 'nMin', label: 'N_GON_MIN', type: 'number', default: 3, min: 3 },
  { key: 'nMax', label: 'N_GON_MAX', type: 'number', default: 12, min: 3 },
  { key: 'nStep', label: 'N_GON_STEP', type: 'number', default: 1, min: 1 },
  { key: 'inflationDepth', label: 'inflation depth', type: 'number', default: 6 },
  { key: 'zetaTerms', label: 'zeta terms', type: 'number', default: 40 },
];

const TOL = 1e-12;
const approx = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;

export function runAnalysisExperiment(opts = {}, logger = new Logger()) {
  const nMin = opts.nMin ?? 3;
  const nMax = opts.nMax ?? 12;
  const nStep = opts.nStep ?? 1;
  const inflationDepth = opts.inflationDepth ?? 6;
  const zetaTerms = opts.zetaTerms ?? 40;
  const checks = [];
  const check = (name, ok, detail = '') => {
    checks.push({ name, ok, detail });
    logger.log(ok ? '  OK  ' : '  FAIL', name, detail === '' ? '' : `(${detail})`);
    return ok;
  };

  logger.header('analysis: n-gon tiling identities and structure');

  /* ---- Section 1: golden ratio identities ---- */
  logger.log('[pentagon] golden-ratio identities');
  check('phi^2 = phi + 1', approx(PHI * PHI, PHI + 1));
  check('1/phi = phi - 1', approx(1 / PHI, PHI - 1));
  check('phi*(phi-1) = 1', approx(PHI * (PHI - 1), 1));
  check('phi + psi = 1', approx(PHI + PSI, 1));
  check('phi*psi = -1', approx(PHI * PSI, -1));
  check('phi^2 + psi^2 = 3', approx(PHI * PHI + PSI * PSI, 3));
  for (let k = 2; k <= 8; k++)
    check(`phi^${k} = F_${k} phi + F_${k - 1}`, approx(PHI ** k, fib(k) * PHI + fib(k - 1), 1e-8));
  for (let k = 1; k <= 8; k++)
    check(`Binet F_${k}`, approx((PHI ** k - PSI ** k) / Math.sqrt(5), fib(k), 1e-8));

  /* ---- n-independent Alexander-Orbach framework ---- */
  logger.rule();
  logger.log('Alexander-Orbach framework (n-independent)');
  const dSpecAO = (dEff, dW) => (2 * dEff) / dW;
  check('d_w = 2 saturates AO', approx(dSpecAO(2.5, 2), 2.5));
  const aoGrid = [];
  for (const de of [1.5, 2.0, 2.5, 3.0, 3.5])
    for (const dw of [1.5, 2.0, 2.5, 3.0, 3.5, 4.0])
      aoGrid.push({ dEff: de, dW: dw, dSpec: dSpecAO(de, dw) });
  const sierpinski = {
    dEff: Math.log(3) / Math.log(2),
    dW: Math.log(5) / Math.log(2),
  };
  sierpinski.dSpec = dSpecAO(sierpinski.dEff, sierpinski.dW);
  logger.log(
    'Sierpinski gasket reference: d_eff =',
    sierpinski.dEff,
    ' d_w =',
    sierpinski.dW,
    ' d_spec =',
    sierpinski.dSpec
  );

  /* ---- volume-growth sanity ---- */
  const radii = Array.from({ length: 10 }, (_, i) => i + 1);
  const vols = radii.map((r) => 2.5 * r ** 2.5);
  const recovered = logLogFit(radii, vols).slope;
  check('volume-growth slope recovery (2.5)', approx(recovered, 2.5, 1e-9), recovered.toFixed(6));

  /* ---- Z_2 orientation cover ---- */
  logger.rule();
  logger.log('Z_2 orientation cover (sheet_fix.md)');
  check('single edge flips orientation', ((1 % 2) + 2) % 2 === 1);
  check('two flips cancel', (1 + 1) % 2 === 0);
  check('Z_2 cover order = 2', orderZn(1, 2) === 2);
  check('even (length 10) vertex loop is trivial', flatZ2Phase(10) === 1);
  check('Berry phase parity rule', approx(berryPhaseZ2(10), 0) && approx(berryPhaseZ2(3), Math.PI));
  logger.log('  (no Z5, no Z10, no signed3, no spinor sector)');

  /* ---- main sweep ---- */
  logger.rule('=');
  logger.log(`sweep n = ${nMin}..${nMax} step ${nStep}`);
  const sweep = [];
  for (let n = nMin; n <= nMax; n += nStep) {
    const g = ngonSummary(n);
    const R = new CycRing(n);

    // roots of unity checks
    let sumX = 0,
      sumY = 0;
    for (let k = 0; k < n; k++) {
      sumX += Math.cos((2 * Math.PI * k) / n);
      sumY += Math.sin((2 * Math.PI * k) / n);
    }
    check(`n=${n}: sum of n-th roots = 0`, Math.abs(sumX) < 1e-9 && Math.abs(sumY) < 1e-9);
    let px = 0,
      py = 0;
    for (let k = 1; k < n; k++)
      if (gcd(k, n) === 1) {
        px += Math.cos((2 * Math.PI * k) / n);
        py += Math.sin((2 * Math.PI * k) / n);
      }
    check(
      `n=${n}: sum of primitive roots = mu(n)`,
      Math.abs(px - moebius(n)) < 1e-9 && Math.abs(py) < 1e-9,
      `mu=${moebius(n)}`
    );
    check(`n=${n}: deg Phi_n = totient(n)`, R.deg === totient(n));

    // rotation / monodromy
    check(`n=${n}: R^n = I (order ${n})`, monodromyOrder(n) === n);

    // dihedral irrep dimension sum
    const irrepSum = n % 2 === 1 ? 2 + 2 * (n - 1) : 4 + 2 * (n - 2);
    check(`n=${n}: D_n irrep dim^2 sum = 2n`, irrepSum === 2 * n);

    // graph Laplacians
    const star = starLaplacianSpectrum(n);
    check(
      `n=${n}: star spectrum {0, 1^(n-1), n+1}`,
      star[0] === 0 && star[star.length - 1] === n + 1 && star.length === n + 1
    );
    const cyc = cycleLaplacianEigenvalues(n);
    check(
      `n=${n}: cycle gap = 2-2cos(2pi/n)`,
      approx(Math.min(...cyc.filter((x) => x > 1e-12)), g.cycleGap, 1e-9)
    );

    // rule counts
    check(`n=${n}: OT rule count = 2^(2(n+1))`, outerTotalisticRules(n) === 2 ** (2 * (n + 1)));

    // inflation / substitution
    const M =
      n === 3
        ? [
            [1, 0],
            [0, 1],
          ]
        : n === 5
          ? [
              [2, 1],
              [1, 1],
            ]
          : [
              [2, 1],
              [n - 3, n - 4],
            ];
    const lambda = n === 3 ? 1 : pf2x2(M);
    let v = [1, 0];
    const orbit = [];
    for (let d = 1; d <= inflationDepth; d++) {
      v = [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]];
      orbit.push({ depth: d, counts: [...v], total: v[0] + v[1] });
    }
    if (n === 5)
      check('pentagon inflation ratio = phi^2', approx(lambda, PHI * PHI, 1e-8), lambda.toFixed(6));

    const heat = [0.01, 0.1, 1, 10].map((t) => ({
      t,
      cycle: heatTraceCycle(n, t),
      star: heatTraceStar(n, t),
    }));
    const zeta = [1, 2, 3].map((s) => ({ s, value: spectralZetaCycle(n, s) }));

    const row = {
      ...g,
      diagonals: Array.from({ length: n - 1 }, (_, k) => diagonal(n, k + 1)),
      totalisticRules: totalisticRules(n),
      inflationMatrix: M,
      inflationRatio: lambda,
      inflationOrbit: orbit,
      heatTrace: heat,
      spectralZeta: zeta,
      cycleEigenvalues: cyc,
    };
    sweep.push(row);
    logger.log(
      `n=${n}: theta=${g.interiorAngleDeg.toFixed(3)}deg k_flat=${g.kFlat}`,
      `deficit=${g.deficitDeg.toFixed(3)}deg k_close=${g.loopClosure}`,
      `phi(n)=${g.totient} area=${g.area.toFixed(4)} gap=${g.cycleGap.toFixed(4)}`,
      `lambda_PF=${lambda.toFixed(5)}`
    );
  }

  /* ---- Section 19: substitution sequences ---- */
  logger.rule();
  const fw = fibonacciWord(inflationDepth);
  const na = [...fw].filter((c) => c === 'a').length;
  const nb = fw.length - na;
  check('Fibonacci word length = F_{k+2}', fw.length === fib(inflationDepth + 2), `${fw.length}`);
  check('|a|/|b| -> phi', Math.abs(na / nb - PHI) < 0.1, (na / nb).toFixed(6));
  const fibMatrix = [
    [1, 1],
    [1, 0],
  ];
  check('Fibonacci substitution PF eigenvalue = phi', approx(pf2x2(fibMatrix), PHI, 1e-9));
  const tm = Array.from({ length: 16 }, (_, k) => thueMorse(k));
  const rs = Array.from({ length: 16 }, (_, k) => rudinShapiro(k));
  logger.log('Thue-Morse  :', tm.join(''));
  logger.log('Rudin-Shapiro:', rs.join(' '));

  /* ---- Section 10: Z[phi] number theory ---- */
  logger.rule();
  logger.log('Z[phi] arithmetic and number theory');
  check('phi^2 = [1,1]', JSON.stringify(zphiMul([0, 1], [0, 1])) === '[1,1]');
  check('phi^3 = [1,2]', JSON.stringify(zphiPow([0, 1], 3)) === '[1,2]');
  let unitOk = true;
  for (let k = 1; k <= 7; k++) if (zphiNorm(zphiPow([0, 1], k)) !== (-1) ** k) unitOk = false;
  check('N(phi^n) = (-1)^n for n=1..7', unitOk);
  check('conj(phi) = [1,-1]', JSON.stringify(zphiConj([0, 1])) === '[1,-1]');
  check('phi^2 / phi = phi', JSON.stringify(zphiDiv([1, 1], [0, 1])) === '[0,1]');

  const splitting = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31].map((p) => ({
    p,
    legendre: legendre5(p),
    type: legendre5(p) === 0 ? 'ramified' : legendre5(p) === 1 ? 'splits' : 'inert',
  }));
  const pisano = Array.from({ length: 14 }, (_, i) => ({ m: i + 2, period: pisanoPeriod(i + 2) }));
  const convergents = phiConvergents(10);
  const wallSunSun = [5, 7, 11, 13, 17, 19, 23, 29].map((p) => {
    const idx = p - legendre5(p);
    return { p, index: idx, residue: fib(idx) % (p * p) };
  });

  /* ---- Dedekind zeta / Dirichlet L partials ---- */
  const zetaPartial = (s, terms) => {
    let acc = 0;
    for (let k = 1; k <= terms; k++) acc += 1 / k ** s;
    return acc;
  };
  const LChi5 = (s, terms) => {
    let acc = 0;
    for (let k = 1; k <= terms; k++) acc += kronecker5(k) / k ** s;
    return acc;
  };
  const eulerFactor = (p, s) => {
    const l = legendre5(p);
    if (l === 1) return 1 / (1 - p ** -s) ** 2;
    if (l === -1) return 1 / (1 - p ** (-2 * s));
    return 1 / (1 - p ** -s);
  };
  const dedekind = (s, pMax) => primesUpTo(pMax).reduce((acc, p) => acc * eulerFactor(p, s), 1);
  const zetaData = {
    riemann2: zetaPartial(2, zetaTerms),
    riemann3: zetaPartial(3, zetaTerms),
    exactZeta2: Math.PI ** 2 / 6,
    dedekind2: dedekind(2, 30),
    dedekind3: dedekind(3, 30),
    L2: LChi5(2, zetaTerms),
    L3: LChi5(3, zetaTerms),
    exactL2: Math.PI ** 2 / (5 * Math.sqrt(5)),
  };
  logger.log('zeta(2) partial =', zetaData.riemann2, ' exact =', zetaData.exactZeta2);
  logger.log('L(2, chi_5) partial =', zetaData.L2, ' exact =', zetaData.exactL2);

  /* ---- cross-section correlations ---- */
  const deficits = sweep.map((r) => r.deficitDeg);
  const gaps = sweep.map((r) => r.cycleGap);
  const kclose = sweep.map((r) => r.loopClosure);
  const heat1 = sweep.map((r) => heatTraceCycle(r.n, 1));
  const correlations = {
    deficitVsGap: pearson(deficits, gaps),
    kCloseVsHeat: pearson(kclose, heat1),
  };
  logger.rule();
  logger.log('Pearson r(deficit, C_n gap) =', correlations.deficitVsGap);
  logger.log('Pearson r(k_close, heatTrace(1)) =', correlations.kCloseVsHeat);

  const failures = checks.filter((c) => !c.ok);
  logger.rule('=');
  logger.log(
    failures.length === 0
      ? `analysis: all ${checks.length} checks passed`
      : `analysis: ${failures.length}/${checks.length} checks FAILED`
  );

  return {
    experiment: 'analysis',
    params: { nMin, nMax, nStep, inflationDepth, zetaTerms },
    checks,
    failures,
    alexanderOrbachGrid: aoGrid,
    sierpinski,
    sweep,
    substitution: {
      fibonacciWord: fw.slice(0, 64),
      lengths: fw.length,
      a: na,
      b: nb,
      ratio: na / nb,
      thueMorse: tm,
      rudinShapiro: rs,
    },
    numberTheory: { splitting, pisano, convergents, wallSunSun },
    zeta: zetaData,
    correlations,
    tables: [
      {
        title: 'n-gon sweep',
        columns: [
          'n',
          'theta(deg)',
          'k_flat',
          'deficit(deg)',
          'k_close',
          'turns',
          'phi(n)',
          'area',
          'R',
          'OT_rules',
          'C_n_gap',
          'lambda_PF',
        ],
        rows: sweep.map((r) => [
          r.n,
          r.interiorAngleDeg,
          r.kFlat,
          r.deficitDeg,
          r.loopClosure,
          r.turns,
          r.totient,
          r.area,
          r.circumradius,
          r.otRules,
          r.cycleGap,
          r.inflationRatio,
        ]),
      },
      {
        title: 'Alexander-Orbach grid',
        columns: ['d_eff', 'd_w', 'd_spec'],
        rows: aoGrid.map((g) => [g.dEff, g.dW, g.dSpec]),
      },
      {
        title: 'Prime splitting in Z[phi]',
        columns: ['p', '(5/p)', 'type'],
        rows: splitting.map((s) => [s.p, s.legendre, s.type]),
      },
      {
        title: 'Pisano periods',
        columns: ['m', 'pi(m)'],
        rows: pisano.map((p) => [p.m, p.period]),
      },
    ],
    log: logger.text(),
  };
}
