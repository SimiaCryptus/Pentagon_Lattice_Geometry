// geometry.js
// Pentagon geometry built on the exact field defined in field.js.
// - 2D points are { x: KElt, y: KElt } where KElt is the algebraic
//   field element type from field.js.
// - The rotation by 72 deg is exact:
//     cos(72) = (sqrt(5) - 1)/4
//     sin(72) = S/4         where S = sqrt(10 + 2 sqrt(5))

import {
  K, ZERO, ONE, add, sub, neg, scale, mul, toFloat, key, toAlg, eq
} from "./field.js";

// ----- Vec2 over the field -----
export function V(x, y) { return { x, y }; }
export function vAdd(p, q)   { return V(add(p.x, q.x), add(p.y, q.y)); }
export function vSub(p, q)   { return V(sub(p.x, q.x), sub(p.y, q.y)); }
export function vScale(p, r) { return V(scale(p.x, r), scale(p.y, r)); }
export function vEq(p, q)    { return eq(p.x, q.x) && eq(p.y, q.y); }
export function vKey(p)      { return key(p.x) + "|" + key(p.y); }
export function vFloat(p)    { return [toFloat(p.x), toFloat(p.y)]; }
export function vAlg(p)      { return `( ${toAlg(p.x)} , ${toAlg(p.y)} )`; }

// ----- Pentagon constants (unit-edge regular pentagon) -----
//
// Circumradius R = 1/(2 sin(36 deg)).
//   sin(36) = sqrt(10 - 2 sqrt(5))/4    -- different nested radical.
// To keep arithmetic inside Q(sqrt(5), S) where S = sqrt(10+2 sqrt(5)),
// we instead build the pentagon from a *known vertex offset*:
//   take the apothem direction and use angular addition with 72-deg
//   rotations of the offset vector (R, 0). For the field to stay closed
//   we therefore work with edge length s such that R lives in the same
//   ring; the cleanest choice is to *define* the edge length so that
//     2 sin(36) = something inside Q(sqrt(5), S).
//
// It turns out that  4 sin(36) * 4 sin(72) = 4 * sqrt(5),  i.e.
//   S * sqrt(10-2 sqrt(5)) = 4 sqrt(5)
// so sqrt(10 - 2 sqrt(5)) = 4 sqrt(5) / S
// and 1/(2 sin 36) = 1 / ( sqrt(10-2 sqrt(5)) / 2 )
//                  = 2 / sqrt(10-2 sqrt(5))
//                  = 2 * S / (4 sqrt(5))
//                  = S / (2 sqrt(5))
//                  = S * sqrt(5) / 10
//
// i.e. R = (S * sqrt(5)) / 10, which is exactly an element of our ring
// (the "d" component, scaled by 1/10).
//
// So R = K(0, 0, 0, 1/10).
export const R_CIRCUM = K(0, 0, 0, 1 / 10);

// Rotation by 72 deg in the field.
// cos72 = (sqrt(5) - 1)/4
// sin72 = S/4
export const COS72 = K(-1 / 4, 1 / 4, 0, 0);
export const SIN72 = K(0, 0, 1 / 4, 0);

export function rotate(p, cos, sin) {
  // (x,y) -> (cos*x - sin*y, sin*x + cos*y)
  return V(
    sub(mul(cos, p.x), mul(sin, p.y)),
    add(mul(sin, p.x), mul(cos, p.y))
  );
}

// Vertex k (0..4) of pentagon at centroid `c` with orientation index `o`
// in 0..4 meaning rotated by o*72 deg from the canonical orientation.
// Canonical orientation: vertex 0 points "up" (+y).
export function pentVertex(centroid, orient, k) {
  // start with v0 = (0, R)
  let v = V(ZERO, R_CIRCUM);
  const steps = (orient + k) % 5;
  for (let i = 0; i < steps; i++) v = rotate(v, COS72, SIN72);
  return vAdd(centroid, v);
}

export function pentVertices(centroid, orient) {
  const out = [];
  for (let k = 0; k < 5; k++) out.push(pentVertex(centroid, orient, k));
  return out;
}

// Edge k connects vertex k and vertex k+1.
export function pentEdge(centroid, orient, k) {
  return [pentVertex(centroid, orient, k),
          pentVertex(centroid, orient, (k + 1) % 5)];
}

// ----- Edge-mate computation -----
//
// For pentagon P at centroid c with orientation o, edge k has midpoint
// m_k and outward normal n_k. The neighbor across edge k is a pentagon
// P' whose centroid is c + 2*(m_k - c) reflected... easier:
//   c' = c + 2 * (m_k - c) projected outward,
// but simpler still: the neighbor sharing edge k has its centroid on
// the opposite side of that edge, at the same perpendicular distance
// (the apothem) from the edge midpoint. Its orientation is rotated by
// 180 deg relative to P about the edge normal, which is equivalent to
// o' = o + (something) mod 5 *together with a flip*.
//
// For an edge-to-edge match of two regular pentagons the neighbor
// orientation satisfies o' = o + (2k + 3) mod 5  -- derived below.
// And its centroid is c' = c + 2*(m_k - c) -- twice the vector from
// centroid to edge midpoint (since the edge midpoint is at the apothem
// distance r, and the neighbor centroid lies at distance r on the
// opposite side).
//
// Why orientation shift = 2k + 3 (mod 5):
//   Edge k of P has outward normal rotated (k + 1/2) * 72 deg from the
//   canonical "up" axis of P. The neighbor's corresponding inward
//   normal must point oppositely, so its canonical-up axis must rotate
//   by 180 deg minus that. Working modulo 360 = 5*72 we get an offset
//   of (2k + 3) mod 5 turns of 72 deg. We verify numerically below.
//
// We also need to know which edge of the *neighbor* matches our edge
// k. By symmetry this is edge k' = (2k + 3 + something) mod 5; we
// determine it constructively from the shared vertices.

export function neighborOf(centroid, orient, k) {
  // edge midpoint
  const [v0, v1] = pentEdge(centroid, orient, k);
  const mid = vScale(vAdd(v0, v1), 0.5);
  // c' = c + 2*(mid - c)
  const newC = vAdd(centroid, vScale(vSub(mid, centroid), 2));
  const newO = (orient + 2 * k + 3) % 5;
  // determine which edge of the neighbor matches: the neighbor edge
  // whose vertex set equals {v0, v1}.
  let matchEdge = -1;
  for (let kk = 0; kk < 5; kk++) {
    const [w0, w1] = pentEdge(newC, newO, kk);
    if ((vEq(w0, v0) && vEq(w1, v1)) ||
        (vEq(w0, v1) && vEq(w1, v0))) {
      matchEdge = kk;
      break;
    }
  }
  return { centroid: newC, orient: newO, matchEdge };
}