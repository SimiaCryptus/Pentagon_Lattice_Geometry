# sheet_fix.md — Authoritative Correction of the Sheet / Fiber Model

## Status

**Normative.** This document corrects a foundational error that propagated through the
entire analysis. All other documents (`README_DEV.md`, `idea.md`, `analysis.md`,
`experiment.mac`, `sweep_ngon.md`, `affine.md`) must be brought into agreement with the
statements here. Any claim elsewhere that contradicts this file is a bug to be fixed.

---

## 1. Summary of the Error

A single mistaken assumption was woven through the analysis: the concept of **sheets** and
**fiber coordinates** was mis-translated. Specifically, the analysis conflated two
unrelated quantities:

1. The **combinatorial return length** around a pentagon vertex (how many tile-steps bring
   you back to the starting tile).
2. The **number of sheets** of the covering space (the size of the fiber / structure
   group).

These are *not the same number*. The first is a property of the adjacency graph; the
second is a property of tile orientation. The analysis incorrectly derived a `Z5` or `Z10`
fiber structure from the return length and then invented "edge delta rules" (the `signed3`
rule, sheet shifts in `{−1, 0, +1}`, vortex fractions of `2/3`, etc.) to make that fiber
consistent. That entire edifice is **flawed and must be removed**.

---

## 2. The Correct Model

### 2.1 There are exactly two sheets — the cover is Z₂

The fiber is determined by **orientation of the pentagon**, nothing else. A pentagon has
two orientation states (call them `+` and `−`). Any pentagon adjacent to a given pentagon
carries the **flipped** orientation. Therefore:

- The structure group is **Z₂**.
- There are **exactly 2 sheets**.
- The single generator (crossing one edge) is the non-trivial element of Z₂, i.e. an
  orientation flip.

There is **no Z5** and **no Z10** anywhere in the correct model. Any coordinate,
arithmetic, or rule that produces a 5-fold or 10-fold fiber is wrong.

### 2.2 The "10 steps" fact is about the base graph, not the fiber

It is true that there are vertices around which **10 steps** returns you to the starting
tile, and that this return is a **double cover** in the orientation sense (you pass through
each of the two orientation classes five times). But:

- "10 steps" is the **combinatorial length of the vertex cycle** in the adjacency graph.
- It is **not** the order of the fiber group.
- The double-cover structure is `Z₂`, realized geometrically by the fact that the 10-cycle
  visits alternating orientations `+ − + − + − + − + −`.

### 2.3 The holonomy around a vertex is ZERO (trivial)

This is the most important correction. **The holonomy is 0.** When you travel around the
vertex through all 10 steps in the associated adjacency graph, you return to the **starting
tile exactly** — same tile, same sheet, no residual shift.

Consequences:

- There is **no** "sheet shift of −1" per single loop.
- There is **no** requirement for a "double loop to restore identity."
- The claimed **spinor-like / spin-½ holonomy is false** and must be deleted everywhere.
- The 10-step vertex cycle is a **closed, trivial loop**: net orientation change over the
  full cycle is `(−1)^10 = +1`, i.e. identity.

The orientation *does* flip on each individual edge (that is the real Z₂ content), but the
**closed loop around a vertex has even length (10)**, so all flips cancel and holonomy is
trivial.

---

## 3. Specific Claims That Are Now WRONG (must be deleted or rewritten)

The following claims appear across the documents and are all incorrect under the corrected
model:

| Wrong claim (as currently stated)                                   | Correction                                          |
|---------------------------------------------------------------------|-----------------------------------------------------|
| Fiber / structure group is Z5, Z10, or "double cover of Z5"         | Fiber is **Z₂** (orientation only)                  |
| `signed3` rule assigns sheet shifts ∈ {−1, 0, +1}                   | **No such rule exists**; the only map is a Z₂ flip  |
| Sheet shifts are "cyclic mod 3"                                     | There is no mod-3 or mod-5 structure                |
| "Vortex edge fraction = exactly 2/3"                                | **Every** edge flips orientation; fraction = 1 (Z₂) |
| Single loop around a vertex → sheet shift of −1                     | Single loop → **shift of 0** (holonomy trivial)     |
| Double loop required to restore identity                            | Identity restored after the **single** 10-cycle     |
| Spinor-like / spin-½ / 4π holonomy analogy                          | **Delete**; holonomy is trivial, not spinorial      |
| "10 pentagons × 3 full turns to close a loop" as fiber justification| 10 is the base-cycle length; turns ≠ fiber order    |
| Vortex fraction as "arithmetic invariant" / topological-defect rule | Delete; artifact of the invented rule               |

---

## 4. What Remains Valid

The correction is confined to the **fiber / sheet / holonomy** layer. The following are
NOT affected by this document and may stand on their own merits (subject to independent
verification):

- The **base geometry** of the pentagon and its angular deficit (36°).
- The coordinate field `Q(√5)` and golden-ratio arithmetic, as a description of the
  **base tiling coordinates** (not as a fiber).
- Effective-dimension (`d_eff`) measurements of the **base adjacency graph**, provided they
  are recomputed on the corrected Z₂ cover (2 sheets) rather than a 5- or 10-sheet object.
- The fact that a 10-step cycle exists around pentagon vertices.

⚠️ **Recompute anything downstream of the fiber.** Any `d_eff`, `d_spec`, or `d_w` value
that was computed on a 5- or 10-sheeted graph, or that used the `signed3` edge deltas, is
invalid and must be regenerated on the Z₂ (2-sheet) cover with trivial vertex holonomy.

---

## 5. Required Fixes by File

### `README_DEV.md`
- Replace all "multi-sheeted (n sheets)" language with **"double cover (Z₂, 2 sheets)."**
- Delete Finding 5 ("Spinor-Like Holonomy") and the spin-½ / 4π analogy in full.
- Delete "Vortex Fraction as an Arithmetic Invariant" (Finding 4) and the `2/3` constant.
- In the verification table:
  - Remove the `signed3` / vortex-fraction row.
  - Change "single-loop holonomy = 1 (τ = −1)" to **"vertex-loop holonomy = 0 (trivial;
    10-cycle has even length, flips cancel)."**
  - Keep "Z₂ cover: order = 2" but describe it as an **orientation** cover, not a
    sheet-shift cover.
- In "Topological Quantum Computing": remove the anyonic / spin-½ claim; the trivial
  holonomy does not support it.

### `idea.md`
- Rewrite the fiber definition: fiber = pentagon orientation ∈ {+, −}; group = Z₂.
- State explicitly: **adjacent tiles carry flipped orientation.**
- State the holonomy theorem: the vertex loop has length 10 (even) ⇒ net flip = +1 ⇒
  **trivial holonomy.**

### `analysis.mac` / `analysis.md`
- Remove symbolic "verification" of Z5/Z10 fibers, sheet shifts, and vortex fractions.
- Add a check that the vertex cycle has **even length (10)** and that the product of edge
  flips around it equals **identity** in Z₂.

### `experiment.mac` / `sweep_ngon.mac`
- Delete the `signed3` rule and all `{−1,0,+1}` sheet-shift assignment code.
- Replace with a **single Z₂ orientation flip on every edge**.
- Recompute all spectral/dimension outputs on the 2-sheet cover.

### `affine.md`
- The algebraic-field classification may remain as a statement about **base coordinates**,
  but must not be presented as determining a multi-sheet fiber count. The fiber is always
  Z₂ when it exists at all.

---

## 6. One-Line Restatement

> The cover is **Z₂** (orientation only, two sheets); adjacent pentagons flip orientation;
> the 10-step loop around a vertex has even length, so **holonomy is trivial (0)** — there
> is no Z5, no Z10, no `signed3` rule, and no spinor behavior.