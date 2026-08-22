/* Elementary number theory used by analysis.mac / erdos.mac ports. */

export const PHI = (1 + Math.sqrt(5)) / 2;
export const PSI = (1 - Math.sqrt(5)) / 2;

export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}

export const lcm = (a, b) => (a && b ? Math.abs(a * b) / gcd(a, b) : 0);

export function divisors(n) {
  const out = [];
  for (let d = 1; d <= n; d++) if (n % d === 0) out.push(d);
  return out;
}

export function totient(n) {
  let result = n;
  let m = n;
  for (let p = 2; p * p <= m; p++) {
    if (m % p === 0) {
      while (m % p === 0) m /= p;
      result -= result / p;
    }
  }
  if (m > 1) result -= result / m;
  return Math.round(result);
}

export function moebius(n) {
  if (n === 1) return 1;
  let m = n, primes = 0;
  for (let p = 2; p * p <= m; p++) {
    if (m % p === 0) {
      m /= p;
      if (m % p === 0) return 0;
      primes++;
    }
  }
  if (m > 1) primes++;
  return primes % 2 === 0 ? 1 : -1;
}

/* Fibonacci with F_0 = 0, F_1 = 1. Exact for n <= 78. */
export function fib(n) {
  if (n < 0) return ((-1) ** (n + 1)) * fib(-n);
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) { const t = a + b; a = b; b = t; }
  return a;
}

export function isPrime(n) {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let p = 3; p * p <= n; p += 2) if (n % p === 0) return false;
  return true;
}

export function primesUpTo(n) {
  const out = [];
  for (let p = 2; p <= n; p++) if (isPrime(p)) out.push(p);
  return out;
}

export function nextPrime(p) {
  let q = p + 1;
  while (!isPrime(q)) q++;
  return q;
}

/* Legendre / Kronecker symbol (5/p). */
export function legendre5(p) {
  if (p % 5 === 0) return 0;
  return (p * p) % 5 === 1 ? 1 : -1;
}

export function kronecker5(n) {
  const m = ((n % 5) + 5) % 5;
  if (m === 0) return 0;
  return m === 1 || m === 4 ? 1 : -1;
}

export function pisanoPeriod(m) {
  let a = 0, b = 1;
  for (let i = 1; i <= 6 * m; i++) {
    const c = (a + b) % m;
    a = b; b = c;
    if (a === 0 && b === 1) return i;
  }
  return 0;
}

/* Continued-fraction convergents of phi: h_k / k_k. */
export function phiConvergents(count) {
  const out = [];
  let pPrev = 0, pCurr = 1, qPrev = 1, qCurr = 1;
  for (let i = 1; i <= count; i++) {
    const pNext = pCurr + pPrev, qNext = qCurr + qPrev;
    out.push({ i, h: pNext, k: qNext, value: pNext / qNext, error: Math.abs(pNext / qNext - PHI) });
    pPrev = pCurr; pCurr = pNext;
    qPrev = qCurr; qCurr = qNext;
  }
  return out;
}

/* Detect theta = (p/q)*pi within tolerance; returns {rational,p,q,order}. */
export function rationalMultipleOfPi(theta, maxDenom = 120, tol = 1e-9) {
  const r = theta / Math.PI;
  if (Math.abs(r) < 1e-13) return { rational: true, p: 0, q: 1, order: 1 };
  let bestQ = 0, bestP = 0, bestErr = Infinity;
  for (let q = 1; q <= maxDenom; q++) {
    const p = Math.round(r * q);
    const err = Math.abs(r - p / q);
    if (err < bestErr) { bestErr = err; bestQ = q; bestP = p; }
  }
  if (bestErr > tol) return { rational: false, p: 0, q: 0, order: Infinity };
  const order = bestP === 0 ? 1 : (2 * bestQ) / gcd(2 * bestQ, Math.abs(bestP));
  return { rational: true, p: bestP, q: bestQ, order };
}

/* --- Z[phi] arithmetic: pairs [a,b] meaning a + b*phi --------------- */
export const zphiAdd = (p, q) => [p[0] + q[0], p[1] + q[1]];
export const zphiNeg = (p) => [-p[0], -p[1]];
export const zphiSub = (p, q) => zphiAdd(p, zphiNeg(q));
export const zphiMul = (p, q) => [
  p[0] * q[0] + p[1] * q[1],
  p[0] * q[1] + p[1] * q[0] + p[1] * q[1],
];
export const zphiConj = (p) => [p[0] + p[1], -p[1]];
export const zphiNorm = (p) => p[0] * p[0] + p[0] * p[1] - p[1] * p[1];
export const zphiFloat = (p) => p[0] + p[1] * PHI;

export function zphiPow(p, n) {
  let acc = [1, 0];
  for (let i = 0; i < n; i++) acc = zphiMul(acc, p);
  return acc;
}

export function zphiDiv(p, q) {
  const denom = zphiNorm(q);
  if (denom === 0) throw new Error('division by zero in Z[phi]');
  const num = zphiMul(p, zphiConj(q));
  return [num[0] / denom, num[1] / denom];
}

/* --- Q(sqrt 5) as pairs [r,s] meaning r + s*sqrt(5) ----------------- */
export const q5Add = (p, q) => [p[0] + q[0], p[1] + q[1]];
export const q5Mul = (p, q) => [p[0] * q[0] + 5 * p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
export const q5Conj = (p) => [p[0], -p[1]];
export const q5Norm = (p) => p[0] * p[0] - 5 * p[1] * p[1];
export const q5Float = (p) => p[0] + p[1] * Math.sqrt(5);
export const q5ToZphi = (p) => [p[0] - p[1], 2 * p[1]];
export const zphiToQ5 = (p) => [p[0] + p[1] / 2, p[1] / 2];

/* --- Substitution sequences ---------------------------------------- */
export function fibonacciWord(depth) {
  let w = 'a';
  for (let i = 0; i < depth; i++) {
    let out = '';
    for (const c of w) out += c === 'a' ? 'ab' : 'a';
    w = out;
  }
  return w;
}

export function thueMorse(n) {
  let bits = 0, m = n;
  while (m > 0) { bits ^= m & 1; m >>= 1; }
  return bits;
}

export function rudinShapiro(n) {
  let cnt = 0, m = n;
  while (m > 1) {
    if ((m & 3) === 3) cnt++;
    m >>= 1;
  }
  return cnt % 2 === 0 ? 1 : -1;
}