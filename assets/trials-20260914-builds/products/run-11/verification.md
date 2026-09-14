# Verification record

Environment: Python 3 (local stdlib + `numpy` 2.0.2, `scipy` 1.13.1, `sympy` 1.14.0
available locally; no network access used or needed). All commands below were
actually executed during this task, not merely described.

`solution.py` itself uses **only the Python standard library** (no imports at
all beyond built-ins); `numpy`/`scipy`/`sympy` were used solely as independent
tools to *derive and cross-check* the closed form in `solution.md` — they play
no role in the shipped `solve()` function.

## 1. Derivation cross-checks (symbolic, `sympy`)

- Reduced the 3-variable problem to 2 variables via $z=1-x-y$ and recomputed
  $\nabla g_t$, the Hessian $H=\begin{pmatrix}8&8\\8&12\end{pmatrix}$, and its
  eigenvalues $10\pm2\sqrt{17}$ (both positive) — confirms strict convexity.
- Independently confirmed strict convexity from the **original** 3×3 Hessian
  $M=\begin{pmatrix}2&1&0\\1&4&-1\\0&-1&6\end{pmatrix}$: leading principal
  minors $2,7,40$ (all $>0$) and `M.is_positive_definite == True`.
- Solved $\nabla g_t=0$ symbolically for the unconstrained minimizer
  $x^*(t)=\tfrac34t+\tfrac98,\ y^*(t)=-\tfrac12t-\tfrac12$, and solved for the
  exact $t$ at which each of the 5 constraints crosses zero (`sp.solve`),
  reproducing every breakpoint used in `solution.md`.
- Enumerated all $\binom52=10$ pairs of the 5 boundary lines of the reduced
  feasible region and tested each intersection against the remaining 3
  constraints — confirmed exactly 5 survive (the pentagon's vertices).
- Enumerated all $\binom53=10$ triples of the 5 boundary lines and confirmed
  **none** are concurrent (no degenerate vertex with 3 active constraints).
- Solved the full 3-D KKT system (stationarity + complementary slackness) for
  each of the 11 candidate active sets (interior, 5 edges, 5 vertices) and
  recovered, symbolically, every multiplier formula quoted in `solution.md`
  ($\lambda_1=-2t-3$, $\lambda_2=2t+2$, etc.), including proving $\lambda_2=-3$,
  $\lambda_3=-\tfrac{33}5$, $\lambda_3=-9$ (constants, always negative) for the
  three vertices ruled out, and that edges $E_{34}$ (stationary $y=-\tfrac3{20}$,
  never in range) and $E_{45}$ (valid $t$-window for the multiplier sign and
  for the edge-membership condition don't overlap) are impossible for any $t$.
- Verified value-function continuity **and derivative continuity** ($C^1$) at
  all 5 breakpoints by substituting into both neighboring formulas and their
  derivatives symbolically (`sp.simplify(left-right)==0` for both value and
  derivative, at $t=-\tfrac32,-1,-\tfrac12,0,\tfrac95$).
- Verified the envelope-theorem identity $V'(t)=-2x^*(t)$ symbolically on
  every one of the 6 pieces (exact equality, not approximate).

## 2. Numerical cross-checks (independent of the symbolic derivation)

Reproducible script: `verify.py` in this directory. Run with:

```
python3 verify.py
```

It performs, and (as executed here) passed, the following:

1. **Silence on call / import** — capturing stdout around `solution.solve(...)`
   confirms no output; importing the module executes no top-level code beyond
   function/constant definitions (visually confirmed by reading the file: no
   `print`, no `if __name__` block, no file I/O).
2. **Feasibility + finiteness** on a dense grid of 6001 points over
   $t\in[-2,4]$: `x,y,z\ge -10^{-7}`, $x\le0.6+10^{-7}$, $2y+z\ge0.5-10^{-7}$,
   $|x+y+z-1|<10^{-7}$, and all of `x,y,z,value` pass `math.isfinite`.
   Result: **0 violations** out of 6001.
3. **Breakpoint continuity**: for each of the 5 breakpoints, compared
   `solve(b)`, `solve(b-1e-7)`, `solve(b+1e-7)` component-wise; worst observed
   discrepancy **1.2e-7** (i.e. at the scale of the probe step itself, as
   expected for a continuous — indeed differentiable — function; not a jump).
4. **Envelope-theorem finite-difference check**: for 200 points across the
   domain, central-difference estimate of $V'(t)$ compared to $-2x^*(t)$;
   worst discrepancy **1.1e-9**.
5. **Independent optimizer cross-check**: for 108 values of $t$ (a 61-point
   uniform grid, 40 random points via `numpy.random.default_rng(12345)`, plus
   all 5 breakpoints and both domain endpoints), solved the *original*
   constrained problem from scratch with `scipy.optimize.minimize` /
   `SLSQP`, multi-started from 5 different feasible points, and compared the
   best SLSQP result against `solution.solve(t)`. Worst discrepancy over all
   108 points: **value 3.0e-13, point 9.2e-9** (i.e. at SLSQP's own numerical
   tolerance — no disagreement found).
6. **int vs float input**: `solve(2)` and `solve(2.0)` return identical
   `x`/`value`.
7. **Domain endpoints** $t=-2$ and $t=4$: feasible and finite.

A second, earlier, independent numerical pass (not part of `verify.py`, run
ad hoc during development) additionally did a **brute-force grid search**
directly over the feasible pentagon (no solver, just evaluating $f_t$ on a
$300\times300$ mesh satisfying all constraints) at 15 spot values of $t$
spanning the whole domain, and a `scipy.spatial.ConvexHull` comparison between
the 5 claimed pentagon vertices and the hull of a dense feasibility sample
(areas $0.415$ vs. $0.41499996$, vertex sets matching up to grid resolution).
Both agreed with the closed form to grid resolution.

## 3. What was *not* done / limitations

- No access to the internet or to any external/hidden evaluation material was
  used or attempted, per the task constraints; all cross-checks above were
  built from scratch in this session using only local `numpy`/`scipy`/`sympy`.
- Numerical cross-checks (SLSQP, grid search, finite differences) are
  corroborating evidence, not a proof; the proof of global optimality and
  uniqueness is the closed-form KKT/convexity argument in `solution.md`
  §1–§3, which is exact (exact fractions throughout, verified symbolically).
- `verify.py`'s SLSQP cross-check is a local NLP solver; it is only reliable
  as a check here because the problem is proved strictly convex, so any KKT
  point SLSQP converges to from multiple feasible starts is automatically the
  unique global minimizer — the multi-start agreement across 5 different
  initial points at every tested $t$ is itself consistent with (though not an
  independent proof of) that uniqueness.
- Floating-point tolerances used above (1e-4 to 1e-9 depending on the check)
  reflect solver/finite-difference precision, not any looseness in the exact
  rational breakpoints/formulas, which are stated and used as exact fractions
  in `solution.md`.
