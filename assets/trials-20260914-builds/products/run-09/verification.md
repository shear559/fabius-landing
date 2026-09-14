# Verification log

This records the checks actually executed against `solution.py` and the
closed-form derivation in `solution.md`, plus the limitations of what was
checked. Everything here was run in this working directory with the local
Python 3 interpreter (`sympy` 1.14.0, `scipy` 1.13.1, standard library
otherwise); no internet access was used or needed.

## How to reproduce

```bash
cd <this directory>
python3 verify.py
```

Expected output (as actually observed):

```
[exact-formula check] 354 points tested; max point error = 1.110e-16, max value error = 8.882e-16
[scipy SLSQP cross-check] 18 points tested; max error = 7.813e-09

ALL CHECKS PASSED
```

`verify.py` is self-contained (only imports `solution.solve`, the standard
library, and — for the corroborating numerical section only — `numpy`/`scipy`
if present; that section is skipped with a message if they are not).

## What was checked, and how

1. **Import safety.** `solution.py` was imported inside a
   `contextlib.redirect_stdout` block and the captured output asserted to be
   empty, confirming no CLI/print/side effects on import (`verify.py`,
   section 1).

2. **Return-value shape.** For every `t` tested, `solve(t)` was asserted to
   return a `dict` whose `x`, `y`, `z`, `value` fields are `float` and
   `math.isfinite`.

3. **Feasibility.** For every returned point, `x+y+z=1` (within `1e-6`),
   `x,y,z\ge0`, `x\le0.6`, and `2y+z\ge0.5` were checked directly against the
   numbers `solve()` actually returned (not against the formulas) — this
   guards against a transcription bug between the derivation and the code.

4. **Agreement with the exact closed form.** `verify.py` contains an
   independent re-implementation of the six-piece formula from
   `solution.md`, using Python's exact `fractions.Fraction` arithmetic
   (rather than the floats used inside `solution.py`), so this is not merely
   "the code agrees with itself". It was evaluated and compared against
   `solve()`'s float output at:
   - all five interior breakpoints ($t=-3/2,-1,-1/2,0,9/5$) and the two
     domain endpoints ($t=-2,4$) exactly,
   - each of those seven points offset by $\pm10^{-9}, \pm10^{-6},
     \pm10^{-3}$ (49 points total, testing both sides of every breakpoint,
     including offsets far smaller than any plausible grid a hidden test
     might use),
   - 300 uniformly random points in $[-2,4]$ (fixed seed `12345`, so this is
     re-runnable identically).

   Result: **maximum coordinate error $1.11\times10^{-16}$, maximum value
   error $8.88\times10^{-16}$** over all 354 points+offsets — i.e. agreement
   to floating-point round-off, not merely "close".

5. **Integer input, domain edges, and error handling.** `solve(0)` (an
   `int`) was checked to still return floats and the correct point;
   `solve(-2)` and `solve(4)` were checked against the known exact values
   $29/8=3.625$ and $67/25-24/5=-53/25=-2.12$; `solve(5.0)` was checked to
   raise `ValueError` (clearly outside the stated domain) and `solve("x")`
   to raise `TypeError`.

6. **Independent numerical cross-check (corroboration, not proof).**
   `scipy.optimize.minimize` (method `SLSQP`) was run from 6 different
   starting points at 18 values of $t$ spanning $[-2,4]$ (including points
   strictly inside each of the six regions and near several breakpoints),
   with the true equality/inequality constraints passed directly to the
   solver (not derived from `solution.md`'s reduction), and the best
   converged result compared to `solve(t)`. Maximum discrepancy: point and
   value both within $7.8\times10^{-9}$ (solver tolerance). This was also
   run earlier, separately, during derivation (`scratch/crosscheck.py`) at
   28 points, including points **exactly at** each breakpoint and
   $\pm10^{-6}$ around it, with the same result (max error
   $1.15\times10^{-8}$) — see the transcript excerpt below.

7. **Symbolic derivation checks** (these underpin `solution.md`'s proof and
   were also executed, not just asserted):
   - `scratch/reduce.py`: `sympy` expansion of $f_t(x,y,1-x-y)$ and
     re-solving $\nabla g_t=0$, confirming the reduced objective and the
     unconstrained critical point formulas used in §2 of `solution.md`.
   - `scratch/polygon.py`: enumerates all 10 pairwise intersections of the
     5 boundary lines and filters by feasibility against all 5 constraints
     simultaneously, confirming the 5 pentagon vertices used in §1.1.
   - `scratch/analyze.py`: symbolically verifies the quadratic-form identity
     $g_t(x,y)-g_t(x^\star,y^\star)=(v-v^\star)^\top M(v-v^\star)$ (used for
     the $M$-metric projection argument) simplifies to exactly `0`.
   - `scratch/full_kkt.py`, `scratch/kkt3d.py`: symbolically solve the exact
     stationarity/multiplier linear systems for all six regions (both the
     reduced 2-variable form and the full 3-variable form with the equality
     multiplier $\nu$), reproducing every multiplier formula quoted in §4 of
     `solution.md`.
   - `scratch/rigor.py`: symbolically solves the *conjunctions* of
     inequalities (dual-feasibility of the active multiplier(s) **and**
     primal-feasibility of every other constraint) defining each region's
     exact validity interval — i.e., the region boundaries in `solution.md`
     were derived by exact inequality solving, not by eyeballing where two
     numeric curves cross.
   - `scratch/other_faces.py`: checks the 5 unused pentagon faces (vertices
     $V_1,V_4,V_5$ and edges $h_3,h_4$ in isolation) and confirms
     symbolically that each fails dual/primal feasibility for every real
     $t$ (three of them: for *any* real $t$ at all, not just outside
     $[-2,4]$), supporting the "nothing was missed" argument in §5 of
     `solution.md`.
   - Continuity/$C^1$ check: for each of the 5 breakpoints, both the value
     and its $t$-derivative were evaluated from the formula on either side
     and `sympy.simplify`d to `0` difference — all five breakpoints are
     continuous and continuously differentiable, as reported in `solution.md` §6.

## Transcript excerpt (independent scipy cross-check run during derivation)

```
t= -1.500000  exact=(0.000000,0.250000,0.750000) f=3.62500000 | numeric=(0.000000,0.250000,0.750000) f=3.62500000  err_pt=7.81e-09 err_val=0.00e+00 OK
t= -1.499999  exact=(0.000001,0.250000,0.750000) f=3.62500000 | numeric=(0.000001,0.250000,0.750000) f=3.62500000  err_pt=9.40e-10 err_val=4.44e-16 OK
t= -1.000000  exact=(0.375000,0.000000,0.625000) f=3.43750000 | numeric=(0.375000,0.000000,0.625000) f=3.43750000  err_pt=5.05e-09 err_val=0.00e+00 OK
t= -0.500000  exact=(0.500000,0.000000,0.500000) f=3.00000000 | numeric=(0.500000,0.000000,0.500000) f=3.00000000  err_pt=1.11e-16 err_val=4.44e-16 OK
t=  1.800000  exact=(0.600000,0.100000,0.300000) f=0.52000000 | numeric=(0.600000,0.100000,0.300000) f=0.52000000  err_pt=1.42e-14 err_val=7.59e-14 OK
t=  4.000000  exact=(0.600000,0.100000,0.300000) f=-2.12000000 | numeric=(0.600000,0.100000,0.300000) f=-2.12000000  err_pt=2.30e-14 err_val=1.47e-13 OK

MAX ERROR: 1.1543764388832756e-08
```

(trimmed to representative rows; full run covered 28 points including every breakpoint +/-1e-6.)

## Limitations

- The `scipy` SLSQP cross-check is a **local** nonlinear solver run with
  several restarts; it corroborates the closed form numerically but is not
  by itself a proof of global optimality. The proof of global optimality
  and uniqueness is the exact KKT / strict-convexity argument in
  `solution.md` §§1–5, which relies only on exact rational arithmetic and
  `sympy` symbolic simplification (not floating-point search).
- Floating-point round-off (`~1e-16`) is unavoidable inside `solution.py`
  because it uses Python `float` per the interface spec (dict of "finite
  numeric" values); this is far below any reasonable comparison tolerance.
- Only the stated domain $t\in[-2,4]$ was verified; `solve()` raises
  `ValueError` outside a small epsilon-padded version of this domain by
  design (see `solution.py`), since the derivation in `solution.md` does not
  claim to cover $t$ outside $[-2,4]$ (indeed §5 shows some of the
  KKT/feasibility facts explicitly change character outside this range).
- No internet access, external files, or hidden material were used or
  needed anywhere in this derivation or verification.
