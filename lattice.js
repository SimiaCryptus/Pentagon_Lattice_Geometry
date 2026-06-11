// lattice.js
// Build the multi-sheeted pentagon lattice by BFS from an origin
// pentagon. Each tile is uniquely identified by (centroid-key,
// orientation, sheet). Edges connect tiles whose projected edges
// match identically; the sheet index is updated by the discrete
// connection tau(edge).
//
// For this lab the connection is a simple rule:
//   crossing edge k of a tile contributes +k (mod n) to the sheet
//   index of the neighbor.
// This makes the sheet index a non-trivial function of the path,
// so loops can pick up non-zero holonomy.

import { K, ZERO, toFloat } from "./field.js";
import {
  V, vAdd, vFloat, vKey, vAlg, pentVertices, neighborOf
} from "./geometry.js";

export function makeLattice({ radius = 3, groupOrder = 5 } = {}) {
  // Origin pentagon: centroid at (0,0), orientation 0, sheet 0.
  const origin = {
    centroid: V(ZERO, ZERO),
    orient: 0,
     sigma: 0,
    sheet: 0,
  };
  const tiles = []; // array of tile objects
  const byId  = new Map(); // tile id -> index in tiles[]

   function tileId(centroid, orient, sigma, sheet) {
     // sigma is part of the tile's geometric identity: a pentagon at
     // a given centroid with vertex 0 up is genuinely different from
     // one at the same centroid with vertex 0 down.
     return `${vKey(centroid)}|o${orient}|sig${sigma}|s${sheet}`;
  }

  function addTile(t, depth) {
     const id = tileId(t.centroid, t.orient, t.sigma, t.sheet);
    if (byId.has(id)) return byId.get(id);
    const idx = tiles.length;
     const verts = pentVertices(t.centroid, t.orient, t.sigma);
    const vertsF = verts.map(vFloat);
    const tile = {
      index: idx,
      id,
      centroid: t.centroid,
      centroidF: vFloat(t.centroid),
      orient: t.orient,
        // sigma: physical orientation bit for the pentagon (odd n-gon).
        // sigma=0 means vertex 0 points up; sigma=1 means it points down.
        // Edge-to-edge tiling forces sigma to flip on every edge crossing,
        // so along any BFS path from the origin, sigma = depth mod 2.
        sigma: t.sigma,
      sheet: t.sheet,
      depth,
      verts,
      vertsF,
      neighbors: [null, null, null, null, null], // index per edge 0..4
      neighborSheetDeltas: [0, 0, 0, 0, 0],
    };
    tiles.push(tile);
    byId.set(id, idx);
    return idx;
  }

  // BFS
  const queue = [];
  const originIdx = addTile(origin, 0);
  queue.push(originIdx);

  while (queue.length > 0) {
    const tIdx = queue.shift();
    const t = tiles[tIdx];
    if (t.depth >= radius) {
      // still resolve neighbors that already exist (so that boundary
      // tiles know about already-discovered neighbors).
      for (let k = 0; k < 5; k++) {
        if (t.neighbors[k] !== null) continue;
         const nb = neighborOf(t.centroid, t.orient, t.sigma, k);
        const delta = k; // tau(edge) = k  (mod groupOrder)
        const newSheet = mod(t.sheet + delta, groupOrder);
         const id = tileId(nb.centroid, nb.orient, nb.sigma, newSheet);
        if (byId.has(id)) {
          t.neighbors[k] = byId.get(id);
          t.neighborSheetDeltas[k] = delta;
        }
      }
      continue;
    }
    for (let k = 0; k < 5; k++) {
       const nb = neighborOf(t.centroid, t.orient, t.sigma, k);
      const delta = k; // discrete connection rule
      const newSheet = mod(t.sheet + delta, groupOrder);
       const id = tileId(nb.centroid, nb.orient, nb.sigma, newSheet);
      let nIdx;
      if (byId.has(id)) {
        nIdx = byId.get(id);
      } else {
        nIdx = addTile(
           { centroid: nb.centroid, orient: nb.orient, sigma: nb.sigma, sheet: newSheet },
          t.depth + 1
        );
        queue.push(nIdx);
      }
      t.neighbors[k] = nIdx;
      t.neighborSheetDeltas[k] = delta;
    }
  }

  return { tiles, byId, groupOrder, radius };
}

function mod(a, n) {
  return ((a % n) + n) % n;
}