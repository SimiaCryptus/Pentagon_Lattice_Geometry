/* ---------------------------------------------------------------------
   Exact arithmetic in the cyclotomic ring Z[zeta_n].

   An element is an integer coefficient array of length phi(n) giving a
   polynomial in zeta reduced modulo the cyclotomic polynomial Phi_n.
   This is the exact substrate for tile centroids: all reflections used
   by the tiling map integer combinations of zeta^k to integer
   combinations of zeta^k, so cell identity and squared distances are
   exact (no floating-point hashing anywhere in the graph builder).
   --------------------------------------------------------------------- */

import { divisors } from './numberTheory.js';

function polyTrim(p) {
  let i = p.length - 1;
  while (i > 0 && p[i] === 0) i--;
  return p.slice(0, i + 1);
}

export function polyMul(a, b) {
  const r = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    for (let j = 0; j < b.length; j++) r[i + j] += a[i] * b[j];
  }
  return polyTrim(r);
}

/* Exact integer polynomial division (b must divide a). */
export function polyDivExact(a, b) {
  const rem = a.slice();
  const bl = b.length - 1;
  const lead = b[bl];
  const q = new Array(Math.max(rem.length - bl, 1)).fill(0);
  for (let i = rem.length - 1; i >= bl; i--) {
    const c = rem[i] / lead;
    if (!Number.isInteger(c)) throw new Error('non-exact polynomial division');
    q[i - bl] = c;
    for (let j = 0; j <= bl; j++) rem[i - bl + j] -= c * b[j];
  }
  return polyTrim(q);
}

const cycCache = new Map();

/* Phi_n as ascending integer coefficient array. */
export function cyclotomicPoly(n) {
  if (cycCache.has(n)) return cycCache.get(n);
  // x^n - 1
  const num = new Array(n + 1).fill(0);
  num[0] = -1;
  num[n] = 1;
  let den = [1];
  for (const d of divisors(n)) if (d < n) den = polyMul(den, cyclotomicPoly(d));
  const phi = n === 1 ? [-1, 1] : polyDivExact(num, den);
  cycCache.set(n, phi);
  return phi;
}

export class CycRing {
  constructor(n) {
    if (!Number.isInteger(n) || n < 3) throw new Error('CycRing requires n >= 3');
    this.n = n;
    this.phi = cyclotomicPoly(n);
    this.deg = this.phi.length - 1; // = totient(n)
    this._pow = new Map();
    this._cos = [];
    this._sin = [];
    for (let k = 0; k < this.deg; k++) {
      this._cos.push(Math.cos((2 * Math.PI * k) / n));
      this._sin.push(Math.sin((2 * Math.PI * k) / n));
    }
  }

  zero() { return new Array(this.deg).fill(0); }
  one() { return this.fromPower(0); }

  /* Reduce an arbitrary-length polynomial modulo Phi_n (monic). */
  reduce(p) {
    const a = p.slice();
    for (let i = a.length - 1; i >= this.deg; i--) {
      const c = a[i];
      if (!c) continue;
      for (let j = 0; j <= this.deg; j++) a[i - this.deg + j] -= c * this.phi[j];
    }
    const r = a.slice(0, this.deg);
    while (r.length < this.deg) r.push(0);
    return r;
  }

  fromPower(k) {
    const kk = ((k % this.n) + this.n) % this.n;
    if (this._pow.has(kk)) return this._pow.get(kk).slice();
    const p = new Array(kk + 1).fill(0);
    p[kk] = 1;
    const red = this.reduce(p);
    this._pow.set(kk, red);
    return red.slice();
  }

  add(a, b) { return a.map((x, i) => x + b[i]); }
  sub(a, b) { return a.map((x, i) => x - b[i]); }
  scale(a, s) { return a.map((x) => x * s); }
  neg(a) { return a.map((x) => -x); }
  mul(a, b) { return this.reduce(polyMul(a, b)); }

  /* Galois automorphism zeta -> zeta^g (g coprime to n). */
  galois(a, g) {
    let out = this.zero();
    for (let k = 0; k < this.deg; k++) {
      if (!a[k]) continue;
      out = this.add(out, this.scale(this.fromPower(k * g), a[k]));
    }
    return out;
  }

  /* Complex conjugation: zeta -> zeta^{-1}. */
  conj(a) { return this.galois(a, this.n - 1); }

  isZero(a) { return a.every((x) => x === 0); }
  equals(a, b) { return a.every((x, i) => x === b[i]); }
  key(a) { return a.join(','); }

  /* Map to the plane: zeta^k -> (cos, sin)(2 pi k / n). */
  toXY(a) {
    let x = 0, y = 0;
    for (let k = 0; k < this.deg; k++) {
      if (!a[k]) continue;
      x += a[k] * this._cos[k];
      y += a[k] * this._sin[k];
    }
    return [x, y];
  }

  /* |a|^2 = a * conj(a), exactly, as a ring element (real subfield). */
  absSquared(a) { return this.mul(a, this.conj(a)); }

  realValue(a) { return this.toXY(a)[0]; }
}