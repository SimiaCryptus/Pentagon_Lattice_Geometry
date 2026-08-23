# js_port

ES6 port of the Maxima experiment suite:

| Maxima file      | JS experiment id | module                                  |
| ---------------- | ---------------- | --------------------------------------- |
| `experiment.mac` | `lattice`        | `src/experiments/latticeExperiment.js`  |
| `analysis.mac`   | `analysis`       | `src/experiments/analysisExperiment.js` |
| `erdos.mac`      | `erdos`          | `src/experiments/erdosExperiment.js`    |
| `pinwheels.mac`  | `pinwheel`       | `src/experiments/pinwheelExperiment.js` |
| `sweep_ngon.mac` | `sweep`          | `src/experiments/sweepExperiment.js`    |
| `smoke_test.mac` | `smoke`          | `src/experiments/sweepExperiment.js`    |

## Corrections carried over (sheet_fix.md)

The fiber / structure group is **Z_2** (pentagon orientation only, two
sheets). Every edge flips orientation. The vertex loop has **even**
length (10 for pentagons) so all flips cancel and the vertex holonomy
is **trivial**. There is no Z5, no Z10, no signed-3 rule and no
spinor behaviour. Legacy tau-rules are retained only as comparison
baselines and are labelled as such.

## Exact arithmetic

Centroids live in the cyclotomic ring `Z[zeta_n]` (`src/math/cyclotomic.js`).
A tile centroid is an integer coefficient vector modulo the cyclotomic
polynomial `Phi_n`, so cell identity, reflection and squared distances
are all _exact_ — no floating-point hashing. Reflection of a tile
across its k-th edge sends `c -> c + zeta^k + zeta^{k+1}` (conjugated
for the mirrored chirality class), which stays inside the ring.

Squared distances are `d * conj(d)`, an exact element of the real
subfield; distance classes are keyed on the exact coefficient vector.

## Node usage

```sh
node src/cli.js lattice --n 5 --preset small --tauMode z2
node src/cli.js sweep --ns 3,4,5,6,7,8,10,12 --preset tiny
node src/cli.js analysis --nMin 3 --nMax 12
node src/cli.js erdos
node src/cli.js pinwheel --polyType CR_triangle --activeMode legs_only
node src/cli.js smoke
```

Add `--json out.json` to dump the structured result.

Library usage:

```js
import { runLatticeExperiment } from './src/index.js';
const res = runLatticeExperiment({ n: 5, preset: 'small' });
console.log(res.dimensions);
```

## Browser harness

ES modules require an http origin; `file://` will not work.

```sh
cd js_port && python3 -m http.server 8080
# open http://localhost:8080/index.html
```

The harness is deliberately non-graphical: pick an experiment, edit
parameters, run, and inspect the log / JSON / tables (with CSV export).
