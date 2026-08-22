# Critique and Resolution: Multi-Sheeted n-gon Tilings

This document records a long adversarial dialogue about the project, then
reconciles that dialogue against what the actual source (`experiment.mac`,
`experiment.md`, `sweep_ngon.md`, `analysis.mac`) really contains. The
original exchange was conducted on the strength of the `README_DEV.md` preview
alone. Reading the code changes several conclusions, so this rewrite
separates **what the critique got right**, **what it got wrong**, and
**what the code actually shows**.

---

## 1. The Setup

A skeptical reader was shown the `README_DEV.md` and produced a sharp,
specific critique. The single strongest objection was an **internal
consistency check**, not a vibe:

> You report `d_eff ≈ 2.37`, `d_w ≈ 7`, `d_spec ≈ 1.1`. The
> Alexander–Orbach relation says `d_spec = 2·d_eff / d_w`. Plug in:
> `2(2.37)/7 ≈ 0.68`, not `1.1`. Those three numbers are presented as
> measurements of one object and they don't satisfy the relation that
> connects them.

This is a real, checkable arithmetic point and it deserves a real answer.
The rest of the dialogue circled the meta-question ("is the skepticism
fashionable / orthodox / AI-scented?") which is not worth re-litigating.
The math is.

---

## 2. What the Critique Got Right

### 2.1 The AO relation does not close on the headline numbers

Correct, and the code agrees. From `experiment.md` (medium preset, n=5):

| Quantity | Method           | Value |
| -------- | ---------------- | ----- |
| `d_eff`  | BFS interior     | 2.369 |
| `d_w`    | MSD early-time   | 7.62  |
| `d_spec` | P₀ decay         | 2.81  |
| `d_spec` | Alexander–Orbach | 0.62  |
| `d_spec` | Dense DOS (CDF)  | 1.91  |
| `d_spec` | KPM integrated   | 0.26  |

The AO prediction `2·d_eff/d_w = 0.62` does **not** match any of the
directly-measured `d_spec` values (1.91, 2.81, 0.26). The critique's
arithmetic was right.

### 2.2 The code itself already says these are artifacts

What the critique could not know from the README — but the code states
plainly — is that `experiment.mac` and `experiment.md` **already diagnose
`d_w ≈ 7` as a finite-size artifact**. The relevant text in
`experiment.md`:

> The unusually large `d_w` and the direct/AO mismatch are clear
> finite-size artifacts: with BFS radius 3 the walker saturates the
> cluster almost immediately, truncating the diffusive regime.

And in the code, the MSD fit is deliberately split into an early-time and
a late-time window precisely to expose this:

```maxima
    MSD_FIT_LO : 2 $
    MSD_FIT_HI : max(4, min(T_STEPS, BFS_DEPTH)) $
    ...
    print("MSD late-time log-log slope =", fit[1],
          "  (near 0 => boundary saturation)")
```

The late-time slope `≈ -0.017` is reported in `experiment.md`, confirming
saturation. So the README's `d_w ∈ [6.3, 9.4]` is **not** presented in the
code as a clean measurement; the code's own commentary flags it. The
README over-sold a number the source already treated with suspicion.

### 2.3 The applications section is analogy, not derivation

Correct. Nothing in `experiment.mac` derives a connection to quantum
gravity, anyons, cryptography, or protein networks. Those are
`README_DEV.md`-only prose. The "Z₂ cover, order 2" computation in
`analysis.mac` is abelian; calling it "non-Abelian anyonic statistics"
in the README is a genuine overreach the code does not support.

---

## 3. What the Critique Got Wrong

### 3.1 "The numbers are independent unreliable fits"

Partly wrong. The code computes `d_spec` **three independent ways** and
cross-validates them on purpose:

- `d_spec_value` from P₀ return-probability decay (Section 6),
- `d_spec_dos` from dense Laplacian eigenvalue CDF (Section 4),
- `d_spec_kpm` / `d_spec_kpm_cdf` from KPM Chebyshev moments (Section 18).

`experiment.md` explicitly names the **dense DOS estimate (1.91)** as the
reliable one and explains _why_ the others are corrupted (KPM rescaling
warning, random-walk boundary saturation). This is not a project blind to
its own fit quality; it is a project that instruments fit quality heavily.
The skeptic's "they slid from 'script ran' to 'claim proven'" applies to
the `README_DEV.md`, but **not** to `experiment.md`, which is consistently
hedged.

### 3.2 "d_eff marching linearly is just where the line crosses"

The trend `1.70, 2.07, 2.37, 2.62, 2.83, 3.02` is dismissed as a fitting
artifact, but `analysis.md`/`sweep_ngon.md` give it a **closed-form
prediction** independent of the fit:

```
    d_eff(n) ≈ log(n)/log(2) + correction
```

and the BFS cluster size has an exact combinatorial form
`N(n) ≈ 1 + n·((n-1)³+1)/(n-2)`. The near-linear march in `n` is then not
"where the line crosses" — it's `log(n)/log(2)` sampled at integer `n`,
which is _approximately_ linear over `n = 3..8`. The skeptic mistook a
predicted log curve for an unconstrained linear fit.

Whether that `d_eff` is a _converged_ fractal dimension is a separate
question (see §4.2 below) — but it is not arbitrary.

### 3.3 "Universal d_spec ≈ 1.1 just means you built a 1D backbone"

This was offered as the boring explanation, and it is a good hypothesis —
but the code contains the exact control that tests it. Section 19
("Per-sheet random walk diagnostics") computes the **intra-sheet** walk
dimension separately from the full walk dimension:

```maxima
    print("Intra-sheet MSD slope =", slope_intra,
          "  =>  d_w_intra =", d_w_intra),
    print("Compare full d_w =", d_w_value, ...)
```

Result (`experiment.md`): `d_w_intra ≈ 3.31` vs `d_w_full ≈ 7.62`, ratio
`0.435`, with **two-thirds of all walker steps crossing a sheet**. So the
transport is _not_ a quasi-1D backbone — it is dominated by inter-sheet
vortex edges, exactly the degree of freedom the construction adds. The
"you just built a 1D chain" null hypothesis is directly contradicted by
the per-sheet diagnostic.

---

## 4. What the Code Actually Shows (The Honest State)

### 4.1 The controls the skeptic demanded are partly already present

The skeptic asked for three controls. The code's status on each:

- **C1 (square lattice → d=2):** `experiment.mac` supports `N_GON=4`. The
  sweep reports `d_eff(4) = 2.07` (interior) — _near_ 2 but not exactly,
  and the code's own caveat is that BFS depth 3 is too shallow for a
  clean integer recovery. **Partially addressed; not yet a clean pass.**
- **C2 (Sierpiński → d_f=1.585, d_w=2.32, d_s=1.365):** **Not present.**
  `analysis.mac` _references_ the Sierpiński values as a symbolic
  reference point (`d_spec_AO(log3/log2, log5/log2) ≈ 1.365`) but does
  **not** run the BFS/MSD/KPM pipeline on an actual Sierpiński graph. This
  is the single most important missing control and the dialogue was right
  to demand it.
- **C3 (adjacency audit):** The code includes a **bipartiteness check**
  (every edge connects chirality 0↔1 for odd n; 0 violations reported)
  and a **degree-statistics check**. This is a partial adjacency audit,
  and it passes. But it does not hand-verify _geometric_ locality, which
  is where the dialogue's "path bug" suspicion lives.

### 4.2 The convergence study (F2) is the real gap

The decisive test — does `d_eff` / `d_spec` plateau as `N → 2N → 4N → 8N`?
— is **not run**. Every reported number is at a single BFS depth.
`experiment.md` says this outright:

> For publication-quality dimensional estimates ... the `large` or `huge`
> presets at BFS depth ≥ 5 are required. This medium run serves as a fast
> regression test.

So the strongest version of the skeptic's objection survives: **we do not
yet know whether `d_eff = 2.37` is a converged dimension or a depth-3
snapshot.** The code has the machinery (presets up to `xhuge`, BFS depth 6) but the convergence sweep across depths has not been assembled into a
single plateau test.

### 4.3 The holonomy claim is unmeasured at this scale, by the code's own admission

The README's headline — "single loop → sheet shift −1" — is a
path-consistency property. `experiment.md` reports that under the medium
preset with `signed3`:

> 0 triangles, 0 long cycles, girth > 8 ... The cluster is locally
> tree-like at this depth ... Holonomy cannot be measured without cycles.

`sweep_ngon.md` §6 confirms this is a finite-size effect: the BFS radius
(3) is below `k_close = 10` for the pentagon, so no loop encloses the
origin. The holonomy is therefore **asserted from the Z₂/Z_n symbolic
cover in `analysis.mac`** (where it is genuinely true as group theory) but
**not yet observed on the constructed graph**. The dialogue's instinct to
"hand-walk one loop" is exactly right and remains undone numerically.

### 4.4 The nondeterminism / "race condition" question

The dialogue's most interesting late turn — that sheet assignment at small
radius may be nondeterministic / gauge-dependent — maps onto a real
feature of the code. `add_neighbor` assigns the neighbor's sheet via
`ns : s + tau_rule(i, k)`, where `tau_rule` depends on the **integer cell
ID `i`**, not on a coordinate-canonical label. Cell IDs are assigned in
BFS discovery order:

```maxima
    add_neighbor(i, k) := block(
        ...
        ds : tau_rule(i, k),
        ns : s + ds,
        nb_id : get_cell(nc, nchir, ns),
        ...
```

Because `tau_rule(i,k)` keys on `i` (discovery order) and `k` (local edge
index), **the sheet a cell lands on can depend on the order in which
cells were discovered**, which is the BFS frontier order. This is the
mechanism behind the "race condition" intuition: it is a real
order-dependence in the _labeling_, not (necessarily) in the _geometry_.

The clean discriminator proposed in the dialogue — compute the
smallest-loop holonomy product across several runs and check whether it is
invariant — is the correct test and is **not currently in the code**. It
is also unrunnable at depth 3 because there are no loops (see §4.3). It
becomes meaningful only at BFS depth ≥ 5.

---

## 5. Revised Verdict

| Claim                                   | Status                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| AO relation closes on headline numbers  | **False.** Code agrees; flags `d_w≈7` as boundary artifact.                                                        |
| `d_eff ∈ (2,3)` is meaningful           | **Plausible but unconverged.** Has a `log(n)/log 2` prediction; no plateau test.                                   |
| `d_spec ≈ 1.1` universal                | **Overstated.** Best single-run value is DOS≈1.91; KPM noisy. Universality claim rests on the sweep, not this run. |
| Sub-diffusion (`d_spec < d_eff`)        | **Supported** by the reliable DOS estimate (1.91 < 2.37).                                                          |
| Spinor holonomy on the graph            | **Unmeasured.** True as symbolic group theory; no cycles at depth 3.                                               |
| "Rule-dominated, not polygon-dominated" | **Genuinely supported** by Section 19/20 controls (intra vs full d_w).                                             |
| Applications (gravity, anyons, crypto)  | **Cut.** Pure analogy; unsupported by any code.                                                                    |

The honest one-line summary: **the construction is real and instrumented
far more carefully than the README suggests, but its three headline
dimensions are single-scale and do not yet cohere; the decisive missing
pieces are (a) a Sierpiński/square control run through the full pipeline,
(b) a convergence-vs-depth plateau test, and (c) a loop-holonomy
invariance check at depth ≥ 5.**

---

## 6. The Minimal Program to a Defensible Paper

Ordered by leverage, and cross-referenced to existing code:

1. **Sierpiński control (C2).** Add a graph constructor for the gasket and
   run the _existing_ `bfs_volumes`, MSD, and KPM sections on it. Target:
   reproduce `d_f≈1.585, d_w≈2.32, d_s≈1.365`. This reuses Sections 5, 6,
   18 verbatim; only the graph builder is new. **Highest leverage; not yet
   present.**

2. **Convergence sweep (F2).** Loop the pentagon over `BFS_DEPTH = 3..6`
   (the presets already define these) and plot `d_eff`, `d_spec_dos`,
   `d_spec_kpm` vs `N`. Plateau ⇒ real; drift ⇒ artifact. The code can do
   this today by batching `experiment.mac` across presets, exactly as
   `sweep_ngon.mac` batches across `N_GON`.

3. **Loop-holonomy invariance.** At depth ≥ 5 (where `sweep_ngon.md` §6
   says cycles appear), enumerate cycles through the origin
   (`enumerate_simple_cycles`, already in Section 16) and verify the raw
   `loop_holonomy` reduces to a run-invariant value mod the fiber group.
   This is the dialogue's discriminator and the code is one wrapper away
   from it.

4. **Fix or canonicalize `tau_rule` keying.** Replace the discovery-order
   dependence (`tau_rule(i,k)` on cell ID `i`) with a coordinate-canonical
   key so the sheet _labels_ are reproducible, leaving only genuine gauge
   freedom. Then re-run step 3: if the holonomy product is invariant
   before _and_ after this change, the holonomy is geometric; if it moves,
   it was a labeling race.

5. **Field-universality of `d_spec`.** Run the convergence sweep for
   `N_GON ∈ {4, 5, 8, 12}` (fields `ℚ, ℚ(√5), ℚ(√2), ℚ(√3)`) under a fixed
   (non-`n`-scaled) rule to test whether `d_spec` is field-universal or
   `√5`-specific. The sweep harness already exists.

Steps 1–2 gate everything. If the pipeline reproduces Sierpiński and the
pentagon dimensions plateau, there is a clean **methods paper** ("a
cut-and-project / multi-sheeted pipeline for spectral and walk dimensions
of polygon covers"). If, in addition, AO genuinely fails to close at
convergence _and_ the loop-holonomy is invariant, there is the sharper,
niche result the dialogue identified: **a controlled construction whose
gauge structure breaks the Alexander–Orbach relation for an identifiable
reason.** Both outcomes are real; neither requires the applications
section.

---

## 7. On the Meta-Argument

Much of the original dialogue was spent on whether skepticism was
"orthodox" or "AI-scented." That framing is unfalsifiable and unproductive
and is dropped here. The only thing that ever mattered was whether the
numbers cohere, and the answer the code gives is precise: **they don't
cohere yet, the code knows they don't, and the code names exactly which
runs (convergence, Sierpiński control, depth-5 holonomy) would make them
cohere or prove they can't.** That is a healthier and more honest state
than either "it's a discovery" or "it's slop." It is an unfinished
experiment with its open questions correctly localized.
