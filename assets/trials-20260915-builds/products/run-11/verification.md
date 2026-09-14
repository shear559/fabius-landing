# Verification

## What was checked, and how

All checks below are implemented in `verify.py` (standard library + numpy/scipy,
used only for independent verification — `solution.py` itself imports nothing
but the standard library, as required). Run:

```
python3 verify.py
```

Actual output obtained (Python 3.9.6, numpy 2.0.2, scipy 1.13.1, no network access):

```
[OK] import solution -> no stdout output
[OK] 6001 grid points: all feasible, f_t(x,y,z) == returned value
[OK] continuity: max change between adjacent grid points (step=0.001500) is 0.001800
[OK] 4001 grid points: all KKT inequality multipliers alpha_i >= 0
[OK] 200 points: gradient of f_t lies in span of active constraint normals (true KKT stationarity, not just numerical proximity)
[OK] envelope theorem v'(t) = -2 x(t) holds numerically (max finite-difference error 4.12e-10)
[OK] 111 points agree with independent scipy SLSQP solve (max coord err 6.84e-09, max value err 9.53e-13)

All verification checks passed.
```

### 1. Import hygiene
`check_import_is_silent()` imports `solution` with stdout captured and asserts
the captured output is empty (the `if __name__ == "__main__"` smoke-test block
in `solution.py` cannot run on import). Also manually confirmed `solve` raises
`ValueError` for `t` outside `[-2, 4]` and does not read any file.

### 2. Feasibility + objective consistency, dense grid
`check_feasibility_and_value_dense()` evaluates `solve(t)` at 6001 evenly
spaced points across `[-2, 4]` and checks, for every point: `x+y+z=1` (to
`1e-9`), `x,y,z >= 0`, `x <= 3/5`, `2y+z >= 1/2`, and that the *raw* objective
`f_t(x,y,z)` recomputed from scratch equals the `"value"` field returned by
`solve`. 0 failures out of 6001.

### 3. Continuity across all five breakpoints
`check_continuity_dense()` walks a 4001-point grid and measures the largest
change in `(x,y,z,value)` between adjacent grid points (step ≈ 0.0015). The
observed max change (0.0018) is consistent with a continuous, piecewise-affine
$(x,y,z)$ (bounded slope) and shows no jump at $t\in\{-1.5,-1,-0.5,0,1.8\}$,
where a bug (mismatched formulas on either side of a breakpoint) would produce
an $O(1)$ jump instead of an $O(\text{step})$ one.

### 4. KKT multiplier non-negativity
`check_kkt_multipliers_nonnegative()` checks, over 4001 grid points, that
every returned inequality multiplier $\alpha_1,\dots,\alpha_5$ is $\ge -10^{-8}$
(i.e. numerically non-negative), which is required for KKT-optimality of a
convex program.

### 5. True stationarity on the active set (not just proximity to a numerical solver)
`check_reduced_stationarity()` is the sharpest correctness check: at 200
sample points it takes the analytic gradient $\nabla f_t(x,y,z)$ at the point
`solve(t)` returns, builds the normal vectors of the equality constraint and
of every constraint `solve(t)` claims is active (from the `"active_set"`
field), and checks that $\nabla f_t$ lies in the span of those normals (via a
least-squares projection residual, required $<10^{-6}$). This directly
verifies the KKT stationarity equation $\nabla f_t+\mu(1,1,1)+\sum\alpha_i\nabla h_i=0$
holds at the reported point with the reported active set — i.e. that
`solution.py`'s formulas are not merely "close to optimal" but exactly satisfy
the first-order optimality condition used in the proof in `solution.md`.

### 6. Envelope theorem cross-check of the value function
`check_envelope_theorem()` picks 40 random points, computes a centered finite
difference of `solve(t)['value']` with $h=10^{-6}$, and compares it to
$-2x(t)$ as predicted in `solution.md` §11. Max error $4.1\times10^{-10}$ —
confirms the closed-form value function's derivative matches its closed-form
optimizer, an identity that a copy/algebra error in either formula would very
likely break.

### 7. Independent numerical optimizer (scipy SLSQP), many points including near-breakpoint
`check_against_scipy()` solves the *original* 3-variable problem with
`scipy.optimize.minimize` (SLSQP, linear equality/inequality constraints,
analytic Jacobian, `ftol=1e-15`, multiple restarts, best of 4 taken) at:
all 6 breakpoints exactly ($-2,-1.5,-1,-0.5,0,1.8,4$), 4 points at
$\pm10^{-3}$ and $\pm10^{-6}$ around each breakpoint (to probe both sides of
every transition), and 80 uniform-random points in $[-2,4]$ — 111 points
total (some near-breakpoint offsets fall outside $[-2,4]$ and are skipped).
Max discrepancy in the optimizer: $6.8\times10^{-9}$; in the value:
$9.5\times10^{-13}$ — at the resolution of SLSQP's own convergence tolerance,
i.e. no detectable disagreement.

## Limitations

- Scipy's SLSQP is itself a local numerical solver; it is used here only as
  an *independent* check that does not share code with `solution.py`'s
  formulas, not as a substitute for the closed-form optimality proof in
  `solution.md` (which relies on strict convexity of the fixed Hessian +
  KKT sufficiency for convex programs, proved in §1 there). Agreement with
  SLSQP to $10^{-9}$–$10^{-13}$ across 111 points spanning the whole domain
  and every breakpoint is strong evidence against a formula error, but §5
  above (exact analytic stationarity check) is the check that is actually a
  proof-adjacent verification rather than a numerical coincidence.
- The dense-grid checks (6001 and 4001 points) sample $[-2,4]$ but cannot
  literally test every real number; combined with the exact-arithmetic
  algebra in `solution.md` (every region's formulas were also verified by
  hand substitution at both endpoints, and cross-checked two independent
  ways — direct KKT solve and completing-the-square via $-\tfrac14b^\top A^{-1}b$
  — matching to the last digit) this is considered sufficient.
- No network access was used or required; all checks are local.
