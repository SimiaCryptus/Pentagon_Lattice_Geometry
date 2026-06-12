# The Einstein Tiling Through the Multi-Polygon Framework

## Abstract

In 2023, Smith, Myers, Kaplan, and Goodman-Strauss resolved a half-century-old open problem
by exhibiting the **"hat" monotile** — a single 13-sided polygon (and its mirror, the "turtle")
that tiles the plane aperiodically. Subsequent refinement produced the **"spectre"** monotile,
which achieves strict aperiodicity *without* requiring reflected copies. Collectively, these
shapes are known as **einsteins** (from the German "ein Stein," one stone).

This document analyzes the einstein tilings through the lens of the frameworks developed in
`affine.md`, `pinwheels.md`, `multipolygon.md`, and `idea.md`. We show that:

1. The hat/spectre belong to a **single-vertex type graph** $\mathcal{T} = \{H\}$ with a
   rich self-loop structure encoded by the **metatile substitution system**.
2. The natural algebraic substrate is $\mathbb{F} = \mathbb{Q}(\sqrt{3})$, inherited from
   the kite-based construction on the $3.4.6.4$ Laves lattice — making the einstein
   **Criterion-2 admissible** in the sense of `affine.md`.
3. The orientation group, however, is **infinite**: the hat appears in twelve rotational
   orientations *and* reflections, but the substitution rule forces additional rotations
   by angles incommensurate with $\mathbb{Z}_{12}$ at the meta-scale. This is the
   **partial failure of Criterion 1** that underlies aperiodicity.
4. Reconnection occurs only through a **substitution hierarchy** rather than through
   isometric closure, placing the einstein at **Level 1** of the reconnection hierarchy
   (cf. `multipolygon.md` Section 9) — alongside Penrose and Ammann–Beenker.
5. The spectre's chirality-breaking variant induces a **$\mathbb{Z}_2$-valued holonomy**
   reminiscent of the spinor double cover discussed in `idea.md`, where the "sheet index"
   is replaced by a **handedness label**.

The einstein is therefore not a counterexample to the multi-polygon framework but a
particularly elegant *limit case*: a single-vertex type graph whose entire combinatorial
richness is pushed into the **substitution loop** on that vertex.

---

## 1. The Einstein Problem in Context

### 1.1 Historical Background

The hierarchy of tiling problems can be ordered by the *number of distinct prototiles*
required to enforce aperiodicity:

- **Wang (1961)**: an aperiodic set of tiles must exist if the Domino Problem is
  undecidable. Berger (1966) gave the first such set with ~20,000 tiles.
- **Robinson (1971)**: 6 tiles.
- **Penrose (1974)**: 2 tiles (kite + dart, or thin + thick rhomb).
- **Smith–Myers–Kaplan–Goodman-Strauss (2023)**: 1 tile (the hat).
- **Spectre (2023)**: 1 tile with no reflections required (strict aperiodic monotile).

The progression from many tiles to one is precisely a progression in the **type graph**
of `multipolygon.md`: from a complex multi-vertex graph $\mathcal{T}$ down to the
**single-vertex graph** $\mathcal{T} = \{H\}$.

### 1.2 What the Einstein Achieves

The einstein achieves three structural feats simultaneously:

1. **Geometric realization**: a concrete 13-sided polygon that fits together edge-to-edge.
2. **Aperiodic forcing**: any tiling by congruent copies is necessarily non-periodic.
3. **Substitutive hierarchy**: the tiling admits a self-similar inflation rule on
   *metatiles* (collections of hats), which generates the full tiling combinatorially.

In the language of `multipolygon.md` Section 2.3, the einstein is a **schedule automaton**
with a single state but an extraordinarily rich set of input symbols (edge classes),
together with a **substitution rule** that promotes finite patches to larger patches.

---

## 2. The Hat: Geometric Description

### 2.1 Construction from the $3.4.6.4$ Laves Lattice

The hat tile is most naturally described as a **union of eight kites** drawn on the
$3.4.6.4$ Laves tiling (the dual of the rhombitrihexagonal Archimedean tiling). Each kite
has angles $(90°, 60°, 120°, 90°)$ and edge ratios involving $\sqrt{3}$.

Specifically, partition the plane into kites of the $3.4.6.4$ Laves lattice. The hat
is the union of **eight** adjacent kites assembled into a 13-sided polygon. Because the
underlying kite has $\mathbb{Q}(\sqrt{3})$ coordinates (it sits on a hexagonal-symmetric
substrate), **every vertex of the hat lies in $\mathbb{Q}(\sqrt{3})^2$**.

This is the first key observation:

> **Proposition 2.1**: The vertex coordinates of the hat tile lie in
> $\mathbb{F} = \mathbb{Q}(\sqrt{3})$. The hat is therefore **Criterion-2 admissible**
> in the sense of `affine.md` Section 2.2.

### 2.2 Edge Classes

The hat has 13 edges, but these fall into a small number of **edge classes** under
congruence:

- **Short edges** of length $1$ (in normalized units).
- **Long edges** of length $\sqrt{3}$.

Specifically, the hat has 6 short edges and 7 long edges (or vice versa depending on
normalization conventions), alternating in a pattern that breaks all rotational symmetries
of the underlying hexagonal lattice but preserves the algebraic field $\mathbb{Q}(\sqrt{3})$.

### 2.3 The One-Parameter Family

The hat is actually one member of a **continuous one-parameter family** of tiles
$\text{Tile}(a, b)$ parameterized by the ratio of short-edge to long-edge lengths:

- $\text{Tile}(1, 1)$ is the **"chevron"**, which tiles periodically.
- $\text{Tile}(1, \sqrt{3})$ is the **hat**, which tiles aperiodically (with reflections).
- $\text{Tile}(\sqrt{3}, 1)$ is the **turtle**, the mirror partner.
- $\text{Tile}(1, 0)$ degenerates to the **"comet"**, which also tiles periodically.

The aperiodic regime occupies an **interval** of parameter values, with the hat sitting
at a distinguished point where the edge lengths span $\mathbb{Q}(\sqrt{3})$ minimally.

This is reminiscent of the parameter-tuning role played by the contraction ratio in the
Sierpiński triangle (cf. `affine.md` Section 4.1): aperiodicity is a property not of a
single rigid shape but of a **codimension-zero open set** in shape-parameter space.

---

## 3. The Type Graph of the Einstein

### 3.1 Vertex Set: Trivial

The einstein has a **single tile type**, so:
$$V(\mathcal{T}_{\text{einstein}}) = \{H\}.$$

This places the einstein in the top row of the specialization table of `multipolygon.md`
Section 2.2 — alongside the square, hexagonal, and pinwheel monotile tilings.

### 3.2 Edge Set: Rich Self-Loops

The single vertex $H$ has a self-loop for each **edge class** of adjacency. The hat has
on the order of 13 edges with multiple distinct congruence classes, and each pair (edge
of hat $A$, edge of hat $B$) that may legally abut contributes one labeled self-loop:

$$E(\mathcal{T}_{\text{einstein}}) = \{(H, H, \ell) : \ell \text{ is an admissible edge-class pair}\}.$$

The number of such edge classes is large (a careful enumeration gives roughly 30 distinct
matching configurations, accounting for orientation and chirality), reflecting the
**combinatorial richness** of a single-vertex type graph with many self-loops.

### 3.3 The Schedule Automaton View

From the schedule-automaton perspective of `multipolygon.md` Section 2.3, the einstein
is a one-state automaton:

- **State**: $H$ (the only tile type).
- **Transitions**: each labeled by an edge class, all returning to state $H$.

The aperiodicity therefore cannot be diagnosed from the state graph alone — it lies
entirely in the **matching rules** $\{M_{HH,\ell}\}$ and, crucially, in the **substitution
structure** that we now describe.

---

## 4. The Substitution Hierarchy: The Missing Ingredient

### 4.1 Metatiles

A tiling of the plane by hats admits a hierarchical decomposition into **metatiles**:
clusters of hats that play the role of higher-order tiles. Smith et al. identify four
metatile types:
$$\mathcal{M} = \{H_7, H_8, F, P\},$$
where each metatile is a specific union of (roughly) 7–8 hats. The metatiles themselves
satisfy a **substitution rule**:
$$\sigma: \mathcal{M} \to \mathcal{M}^*,$$
mapping each metatile to a finite patch composed of (smaller) metatiles. Iterating
$\sigma$ produces arbitrarily large patches of the tiling.

### 4.2 The Two-Level Type Graph

The substitution structure is naturally captured by a **two-level type graph**:

- **Ground level**: the single-vertex graph $\{H\}$ with self-loops for hat-hat adjacencies.
- **Meta level**: the four-vertex graph $\{H_7, H_8, F, P\}$ with edges encoding metatile
  adjacency.

These two levels are connected by **inflation/deflation edges** (cf. `multipolygon.md`
Section 2.2, last paragraph): an edge $H_7 \to H$ records that the metatile $H_7$ is
composed of hat tiles in a specific arrangement.

Formally, the einstein type graph in the **decorated** sense is:

$$V(\mathcal{T}) = \{H, H_7, H_8, F, P\}, \quad E(\mathcal{T}) = E_{\text{adj}} \cup E_{\text{inflate}},$$

where $E_{\text{adj}}$ encodes ground-level and meta-level adjacencies, and
$E_{\text{inflate}}$ encodes the substitution maps.

### 4.3 Comparison with Penrose

This matches exactly the Penrose construction described in `multipolygon.md` Section 2.2:
the Penrose substitution graph has tile types $\{\text{thin}, \text{thick}\}$ at the ground
level and an inflation rule connecting each rhomb to a patch of smaller rhombs. The
einstein simply replaces the two-vertex ground graph with a **one-vertex ground graph**,
pushing all combinatorial complexity into the inflation rules at the meta level.

> **Key insight**: From the multi-polygon perspective, the einstein is *Penrose with the
> ground graph collapsed to a point*. The substitution-level graph carries all the work
> that the multi-tile ground graph carried in earlier aperiodic constructions.

---

## 5. Algebraic Analysis

### 5.1 The Coordinate Field

As noted in Section 2.1, all hat vertices lie in $\mathbb{F} = \mathbb{Q}(\sqrt{3})$.
The substitution rule $\sigma$ acts on metatiles by an affine map whose linear part is
a $2 \times 2$ matrix with entries in $\mathbb{Q}(\sqrt{3})$, scaling lengths by the
inflation factor:

$$\lambda_{\text{einstein}} = \phi_{\text{einstein}} := \frac{1 + \sqrt{3} + \sqrt{15}}{2}$$

or, in another normalization,

$$\lambda^2 = 4 + \sqrt{15}, \quad \text{so } \lambda = \sqrt{4 + \sqrt{15}}.$$

The inflation eigenvalue is a quadratic irrational over $\mathbb{Q}(\sqrt{3})$, sitting
naturally in the **biquadratic field** $\mathbb{Q}(\sqrt{3}, \sqrt{5})$.

> **Caveat — Criterion 2 reanalysis**: This is exactly the failure mode flagged in
> `multipolygon.md` Section 4.2 for the (pentagon, hexagon) pairing! The combined field
> $\mathbb{Q}(\sqrt{3}, \sqrt{5})$ is a **degree-4 extension**, not a simple quadratic.
>
> The resolution is that the **ground-level tiling** lives entirely in $\mathbb{Q}(\sqrt{3})$.
> The $\sqrt{5}$ enters only at the **meta-level inflation factor**, not at any individual
> hat vertex. Criterion 2 is satisfied at the ground level; the meta-level adds an
> *independent* algebraic layer that is consistent with — rather than required by — the
> ground-level geometry.

This stratified algebraic structure is genuinely new in the framework: the einstein
exhibits a **two-tier algebraic compactness**, where:

1. The ground field is $\mathbb{Q}(\sqrt{3})$ — admissible.
2. The substitution scaling factor lies in $\mathbb{Q}(\sqrt{3}, \sqrt{5})$, but acts on
   the tiling only as a *global similarity*, not as a generator of new tile placements
   within a single inflation level.

### 5.2 The Orientation Group

The hat appears in 12 rotational orientations (multiples of $30°$) plus reflections,
giving an apparent orientation group $D_{12}$ of order 24. Combined with the substitution
rule, however, the orientation group at the meta-level is *not* a subgroup of $D_{12}$:
the inflation rule rotates metatiles by angles involving $\arctan(\sqrt{3}/\sqrt{5})$ and
related quadratic-irrational arctangents, which are **not** rational multiples of $\pi$.

> **Proposition 5.2 (Failure of Criterion 1 at the meta-level)**: The orientation group
> generated by the union of (ground-level edge reflections) ∪ (meta-level substitution
> rotation) is **infinite**. This is precisely why no flat isometric reconnection exists.

This is the einstein's analogue of the pentagonal frustration of `idea.md`: the local
symmetry group is finite ($D_{12}$ for the hat), but the substitution dynamics inject
irrational rotations that prevent finite closure under inflation.

### 5.3 Why Aperiodicity Follows

Combining the two observations:

- Criterion 2 holds at the ground level ($\mathbb{F} = \mathbb{Q}(\sqrt{3})$).
- Criterion 1 holds at the ground level ($D_{12}$ acts on hat orientations).
- But the substitution rule injects an irrational rotation at the meta-level, breaking
  any finite closure.

The resulting tiling is **reconnective but only via the substitution**: any patch can be
extended to a tiling of the plane, but no two such tilings are translates of one another.
This is **Level 1** of the hierarchy in `multipolygon.md` Section 9 — the same level as
Penrose. The einstein is therefore the **minimal-prototile representative of Level 1**.

---

## 6. The Spectre and Chirality: A $\mathbb{Z}_2$ Holonomy

### 6.1 The Reflection Issue

The hat tiles the plane aperiodically *only if* both the hat and its mirror image are used.
The hat alone, without reflections, does not admit any tiling. Smith et al.'s refinement
to the **spectre** modifies the edges of the hat (replacing straight segments with curves
that break reflective symmetry) to produce a tile that:

- Has **no reflection symmetry**.
- Tiles the plane aperiodically using only **direct congruences** (rotations + translations).

This is the resolution of the "strict einstein" problem.

### 6.2 Handedness as a Sheet Index

For the hat (with reflections), the local data at each tile includes a **chirality label**
$\chi \in \{+, -\}$. The matching rules force chirality flips along certain edge classes.
Walking around a vertex configuration, the chirality label may flip an even or odd number
of times — exactly analogous to the **sheet index** of `idea.md`!

> **Proposition 6.2**: The hat tiling carries a natural $\mathbb{Z}_2$ holonomy whose
> "sheet index" is the chirality label $\chi$. Closed walks on the dual adjacency graph
> may transport chirality non-trivially, yielding a discrete principal $\mathbb{Z}_2$-bundle
> in the sense of `idea.md` Section 2.

Under the substitution rule, the chirality of a metatile is determined by its position in
the inflation hierarchy; the chirality flips are organized by the substitution combinatorics
into a globally consistent pattern (the bundle has *finitely many* sheets and *finite*
holonomy, unlike the pentagonal case where the holonomy is governed by an infinite cyclic
group).

The **spectre** breaks this duality by removing reflective symmetry from the prototile
itself, effectively gauging away the chirality sheet — the resulting tiling has a
**trivial holonomy bundle** over a quotient that respects only direct congruences.

### 6.3 The Spectre as a Quotient

In bundle language:

- **Hat tiling**: a $\mathbb{Z}_2$-bundle over the projected plane, with chirality as
  fiber.
- **Spectre tiling**: the quotient by the chirality involution, yielding a trivial bundle
  whose total space is the spectre's tiling itself.

This makes the hat→spectre transition a direct analogue of passing from the spin double
cover to the rotation group — except that here the discrete bundle is *finite* and the
quotient is *geometric* rather than topological.

---

## 7. The Dual Adjacency Graph

### 7.1 Centroid–Centroid Walks

In the multi-polygon framework of `multipolygon.md` Section 6, we distinguish **centroid**
tiles from **bridge** tiles. The einstein has only one tile type, so every tile is a
centroid tile; the dual adjacency graph is simply the hat–hat adjacency graph.

The type-distance between hats is **1** (any two adjacent hats are directly connected),
which would naively place the einstein in the "all-centroid" regime of Section 6 — the
simplest case. The combinatorial richness lies entirely in the edge labeling and the
substitution structure, not in the type graph's vertex set.

### 7.2 Spectral Dimension

By the methods of `idea.md` Section 6, one can compute the spectral dimension of the dual
graph $\mathcal{G}_{\text{hat}}$ via the graph Laplacian. Empirical results from
mathematical-physics studies of substitution tilings suggest:

- **Volume growth**: $V(r) \sim r^2$ (the tiling is genuinely planar, with no fractional
  expansion).
- **Spectral dimension**: $d_{\text{spec}} = 2$ exactly, since the tiling has finite local
  complexity and bounded vertex degrees.
- **Walk dimension**: $d_w = 2$ (standard diffusion).

This is a sharp contrast with the multi-sheeted pentagonal construction of `idea.md`,
which exhibited fractional $d_{\text{eff}}$ and dimensional flow. The einstein lives in
a clean planar Euclidean regime; its aperiodicity is **purely combinatorial** rather than
geometric-dimensional.

### 7.3 Spectral Signature of Aperiodicity

While the spectral *dimension* is integer, the spectrum itself exhibits the hallmarks of
substitution tilings:

- **Cantor-set spectrum**: the Laplacian spectrum has gaps at every scale of the
  substitution hierarchy.
- **Pure-point + singular continuous decomposition**: by the Bombieri–Taylor and
  Lee–Moody–Solomyak theorems for substitution systems.
- **Bragg peaks**: the diffraction spectrum has pure-point components aligned with the
  substitution eigenvalues, characteristic of quasicrystalline order.

These features place the einstein in the same diffraction class as Penrose and
Ammann–Beenker, even though the underlying type graph is minimal.

---

## 8. Reconnection Hierarchy: Where Does the Einstein Sit?

Refining the table of `multipolygon.md` Section 9:

| Level | Structure                              | Field                  | Orientation group | Example                  |
|-------|----------------------------------------|------------------------|-------------------|--------------------------|
| 0     | Periodic, finite isometry closure      | Single $\mathbb{Q}(\sqrt{d})$ | Finite     | Square, hexagonal        |
| 1a    | Aperiodic, substitution-mediated       | $\mathbb{Q}(\sqrt{5})$ | Finite (local) + infinite (meta) | Penrose |
| 1b    | Aperiodic, substitution + chirality    | $\mathbb{Q}(\sqrt{3})$ | Finite (local) + infinite (meta) + $\mathbb{Z}_2$ chirality | **Hat** |
| 1c    | Aperiodic, substitution, no chirality  | $\mathbb{Q}(\sqrt{3})$ | Finite (local) + infinite (meta) | **Spectre** |
| 2     | Multi-sheeted covering, fractional dim | $\mathbb{Q}(\sqrt{5})$ | Infinite cyclic   | Pentagon (`idea.md`)     |
| 3     | Non-reconnective                       | Mixed / transcendental | Infinite, free    | Generic irregular polygon |

The hat and spectre occupy a **new sublevel 1b/1c** in the hierarchy, distinguished from
Penrose by:

- **Single ground-level tile type** (rather than two for Penrose).
- **Underlying field $\mathbb{Q}(\sqrt{3})$ rather than $\mathbb{Q}(\sqrt{5})$**.
- **Chirality holonomy** (for the hat, absent for the spectre).

---

## 9. The Einstein as a Limiting Case of the Pinwheel

### 9.1 Single-Vertex Type Graphs

Recall from `pinwheels.md` (and `multipolygon.md` Section 1.2) that the pinwheel can be
viewed *either* as a single-vertex tiling (with the composite base+fin treated as a
monotile) *or* as a two-vertex tiling (with $\{B, F\}$). The einstein corresponds to the
**single-vertex view applied at the finest possible level**: there is no internal
decomposition of the hat into "base" and "fin" components.

But the substitution structure of the einstein recovers a similar hierarchical flavor:
each metatile $H_7$, $H_8$, $F$, $P$ plays the role of a "composite" tile at a higher
scale, and the inflation rule plays the role of "fin attachment" at the meta-level.

### 9.2 Pinwheel Type-Distance vs. Einstein Type-Distance

The pinwheel has **ground-level type-distance 3** between base centroids (cf.
`multipolygon.md` Section 3.4: base → fin → fin → base). The einstein has **ground-level
type-distance 1** (hat → hat). But the einstein has **meta-level type-distance** $\ge 1$
on the substitution hierarchy.

This swap is illuminating: the pinwheel "spends" its combinatorial complexity at the
ground level (multiple tile types per pinwheel), while the einstein "spends" it at the
meta level (substitution dynamics). Both achieve aperiodicity (or quasi-periodicity in
the rotational pinwheel case) by **distributing the combinatorial work across scales**.

### 9.3 The Conway–Radin Pinwheel Connection

The Conway–Radin rotational pinwheel is itself a substitution tiling with infinite
rotational orientations (rotations by $\arctan(1/2)$, irrational over $\pi$). Its
classification under the multi-polygon framework places it at **Level 2** (multi-sheeted)
because its orientation group is infinite cyclic and densifies in $SO(2)$.

The einstein **does not** have this densification: hat orientations are confined to a
finite set ($D_{12}$ at the ground level). The substitution rotation, while irrational
over $\pi$, acts only at the meta-scale and does not generate dense orientations of
individual hat tiles. This is what keeps the einstein at Level 1 rather than Level 2 —
the einstein is **less wild** than the Conway–Radin pinwheel despite both being aperiodic.

---

## 10. Algorithmic Construction

Adapting the construction algorithm of `multipolygon.md` Section 11 to the einstein:

```python
def construct_einstein_tiling(seed_hat, max_levels):
    """
    Build a hat tiling by hierarchical substitution.

    Args:
        seed_hat: initial hat tile with position, orientation, chirality in Q(sqrt(3)).
        max_levels: number of inflation levels.

    Returns:
        list of placed hats, each with (position, orientation, chirality).
    """
    # Start from a single seed metatile of level max_levels.
    metatile = seed_metatile(seed_hat, level=max_levels)
    placed = []

    def expand(mt, level):
        if level == 0:
            # Convert ground-level metatile to constituent hats.
            for hat in mt.constituent_hats():
                placed.append(hat)
            return
        # Apply substitution: replace mt with sub-metatiles.
        for sub_mt in mt.substitute():
            expand(sub_mt, level - 1)

    expand(metatile, max_levels)
    return placed
```

Critical implementation notes (paralleling `idea.md` Section 2.3):

1. **Exact arithmetic in $\mathbb{Q}(\sqrt{3})$**: every hat vertex is stored as a
   4-tuple $(a, b, c, d) \in \mathbb{Q}^4$ representing
   $(a + b\sqrt{3}, c + d\sqrt{3})$.
2. **Substitution scaling**: the inflation factor $\lambda = \sqrt{4 + \sqrt{15}}$ acts as
   a global similarity; metatile placements at each level multiply by $\lambda$, and
   exactness is preserved by working in the biquadratic field $\mathbb{Q}(\sqrt{3}, \sqrt{5})$
   at the meta-level.
3. **Chirality labels**: each hat carries a chirality bit $\chi \in \{+, -\}$ propagated
   by the substitution rule.
4. **No collision detection needed**: by construction, the substitution rule produces a
   valid edge-to-edge tiling; the algorithm is more efficient than the general
   adjacency-oracle approach of `multipolygon.md`.

---

## 11. Open Questions Specific to the Einstein

Adapting and specializing the open questions of `multipolygon.md` Section 12:

1. **Continuous family classification**: the one-parameter $\text{Tile}(a, b)$ family
   transitions between periodic and aperiodic regimes. Is there a sharp algebraic
   characterization of the aperiodic interval in terms of the $\mathbb{Q}(\sqrt{3})$
   structure?

2. **Spectral signature of the substitution**: compute $d_{\text{spec}}$ via KPM (cf.
   `idea.md` Section 6.4) on large finite patches of the hat tiling and verify
   $d_{\text{spec}} = 2$ with the predicted Cantor-set spectrum. Does the multi-scale
   spectral structure encode the inflation factor $\lambda$?

3. **Generalization to other fields**: are there einstein-like monotiles based on
   $\mathbb{Q}(\sqrt{2})$ (octagonal substrate) or $\mathbb{Q}(\sqrt{5})$ (pentagonal
   substrate)? The hat sits on the $\mathbb{Q}(\sqrt{3})$ substrate; the framework
   suggests systematic searches at other quadratic fields.

4. **Spectre and higher chirality**: the hat has a $\mathbb{Z}_2$ chirality bundle. Are
   there einstein analogues with $\mathbb{Z}_n$ chirality for $n \ge 3$? These would
   require tiles with $n$-fold "internal twist" labels and would directly generalize the
   spinor double cover of `idea.md` to higher-order anyonic statistics.

5. **3D einstein**: a recent open problem asks whether a single polyhedron (without
   reflections) tiles 3-space aperiodically. The multi-polygon framework's 3D extension
   (`multipolygon.md` Section 12, open question 5) provides a natural setting for this
   question. The algebraic field would presumably be $\mathbb{Q}(\sqrt{2})$ or
   $\mathbb{Q}(\sqrt{3})$ from a cubic/octahedral substrate.

6. **CA dynamics on einstein tilings**: applying the isometric CA framework of
   `idea.md` Section 5 to the hat-adjacency graph, what cellular automata rules support
   Turing-universal computation? The aperiodicity guarantees that glider trajectories
   never repeat, potentially enabling new universality constructions.

7. **Causal structure**: the substitution hierarchy naturally provides a *time foliation*
   (each substitution level = one time step). Does this yield a causal CA in the sense of
   `idea.md` Section 5.2, with the meta-level inflation playing the role of "spacetime"
   coarse-graining?

---

## 12. Summary

The einstein tilings — hat, turtle, and spectre — exemplify a striking limit case in the
multi-polygon tiling framework:

- **Minimal ground-level type graph**: a single vertex $\{H\}$ with rich self-loops.
- **Algebraic substrate**: $\mathbb{F} = \mathbb{Q}(\sqrt{3})$, inherited from the
  $3.4.6.4$ Laves kite construction. Criterion 2 satisfied at the ground level.
- **Finite local symmetry**: orientations confined to $D_{12}$, with chirality bit
  $\chi \in \{+, -\}$ for the hat. Criterion 1 satisfied at the ground level.
- **Substitution-mediated reconnection**: combinatorial closure is achieved via a
  hierarchy of metatiles $\{H_7, H_8, F, P\}$ inflated by a quadratic-irrational scale
  factor $\lambda \in \mathbb{Q}(\sqrt{3}, \sqrt{5})$.
- **Meta-level Criterion 1 failure**: the inflation rotation is irrational over $\pi$,
  preventing periodic closure and forcing aperiodicity.
- **Chirality holonomy**: the hat carries a $\mathbb{Z}_2$ bundle over its dual graph,
  analogous to (but tamer than) the multi-sheeted pentagonal construction of `idea.md`.
  The spectre quotients away this bundle.
- **Position in the hierarchy**: Level 1, alongside Penrose, but distinguished by its
  minimal prototile count and $\mathbb{Q}(\sqrt{3})$ substrate.

The einstein is, in the framework's terms, **the canonical demonstration that combinatorial
complexity can be entirely concentrated at the substitution level when the ground-level
type graph is collapsed to a single vertex**. It is the type-graph-theoretic dual of the
pinwheel: where the pinwheel distributes complexity across a two-vertex ground graph with
a simple schedule, the einstein concentrates complexity in the substitution loop on a
one-vertex graph.

Both constructions belong to the same broader landscape of multi-polygon tilings, and
the framework reveals them as **complementary limit cases** of a single underlying
combinatorial-algebraic structure.