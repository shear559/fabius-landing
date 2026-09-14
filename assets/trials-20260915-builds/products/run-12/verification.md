# Verification

All work done locally, offline, standard-library-plus-scipy/numpy already
present in the environment. No network access used or needed.

## What was executed

`verify.py` (included in this directory, not part of the graded deliverables)
runs four independent checks against `solution.py`:

1. **Feasibility + internal consistency**, on 136 points covering a uniform
   grid over `[-2,4]` plus every claimed regime breakpoint
   (`-1.5, -1, -0.5, 0, 1.8`) plus each breakpoint ±1e-9:
   for every point, checks `x+y+z=1`, `x,y,z>=0`, `x<=3/5`, `2y+z>=1/2`
   (tolerance `1e-7`), and recomputes `f_t(x,y,z)` from the raw formula,
   comparing to the `value` field returned by `solve` (tolerance `1e-8`).
2. **Independent numerical oracle**: `scipy.optimize.minimize` (SLSQP) on the
   reduced 2-variable problem, with linear constraints matching the original
   five inequalities, run from 20 different starting points per `t` (5 fixed
   + 15 random, seeded) on 26 values of `t` spanning the interval and every
   breakpoint, keeping the best result. This is a solver with no knowledge of
   the closed-form regimes — it is not the same code path as `solution.md`'s
   derivation.
3. **Continuity at breakpoints**: `solve(bp - 1e-9)`, `solve(bp)`, and
   `solve(bp + 1e-9)` compared pairwise for each interior breakpoint, to
   confirm the piecewise formulas from adjacent regimes agree in the limit
   (this directly tests the "arbitrarily close points on either side"
   requirement).
4. **Import hygiene**: `solution.py` imported under `contextlib.redirect_stdout`
   and confirmed to print nothing; `solve` confirmed to return plain
   `float`s for `int` and `float` inputs alike.

## Results

```
grid points checked (feasibility+value self-consistency): 136
oracle points checked: 26
max |coord diff| vs scipy oracle: 9.934e-09
max |value diff| vs scipy oracle: 3.215e-13
failures: 0
ALL CHECKS PASSED
```

Spot values (also hand-derivable from the exact fractions in `solution.md`):

| `t` | `x,y,z` | `value` | exact |
|---|---|---|---|
| `-2` | `0, 0.25, 0.75` | `3.625` | `29/8` |
| `4`  | `0.6, 0.1, 0.3`  | `-2.12` | `-53/25` |
| `2.5`| `0.6, 0.1, 0.3`  | `-0.32` | `-53/50` (regime 6, still vertex C) |

Import produces no output (`repr('') == "''"`).

## Reproduce

```bash
python3 verify.py
python3 -c "from solution import solve; print(solve(-2)); print(solve(4)); print(solve(1.8))"
```

## Limitations

- The scipy oracle is itself a numerical (not exact/symbolic) solver; it
  corroborates the closed-form solution to ~1e-8–1e-9 but is not a
  substitute for the algebraic KKT/convexity proof in `solution.md`, which is
  the actual proof of global optimality and uniqueness.
- The oracle was run on 26 of the ~∞ values of `t` in `[-2,4]` (plus the
  dense 136-point self-consistency grid); this is a sampling check, not
  exhaustive verification of every real `t` — exhaustiveness for *all* `t` is
  established analytically in `solution.md` (the six regimes are shown to
  tile `[-2,4]` exactly, with KKT multiplier sign conditions solved in closed
  form for the *entire* validity range of each regime, not just sampled
  points).
- SLSQP is a local solver; multi-start (20 starts including boundary/vertex
  points) mitigates but does not formally exclude missing a better local
  optimum. Strict convexity of `f_t` (proved in `solution.md` §2 via the
  positive-definite Hessian) is what formally guarantees a unique global
  optimum exists and that KKT stationarity is sufficient, independent of the
  oracle.
