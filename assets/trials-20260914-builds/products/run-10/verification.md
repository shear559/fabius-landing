# Verification

Environment: Python 3.9.6 (stdlib for `solution.py`), plus `numpy`
2.0.2, `scipy` 1.13.1 and `sympy` 1.14.0 used **only** by the two
verification scripts below (never imported by `solution.py`). No
network access, no external files, no hidden test material was used —
all checks below are self-contained and reproducible from this
directory.

Two scripts were written and executed:

* `symbolic_checks.py` — exact algebraic verification with `sympy`
  (no floating point): the `f_t → g_t` reduction identity, Hessian
  positive-definiteness, exact polygon-vertex enumeration, exact KKT
  stationarity solve per piece, exact per-piece value-function formulas
  with C¹ continuity at every breakpoint and the envelope-theorem
  identity `φ'(t) = -2x*(t)`, and the exact contradiction that rules
  out the two "dead" edges for every real `t`.
* `verify.py` — independent numerical verification: a from-scratch
  SLSQP solve (`scipy.optimize.minimize`, 8 random restarts per `t`), a
  fine brute-force grid search over the feasible polygon (`numpy`), a
  feasibility check of the closed-form point, continuity checks
  straddling every breakpoint, a numeric re-derivation of KKT
  multipliers via least squares (independent of `solution.py`'s
  internal formulas), a finite-difference check of the envelope
  theorem, and domain/type-error handling.

## Commands run

```bash
python3 symbolic_checks.py
python3 verify.py
```

## Results — symbolic_checks.py

```
=== 1. exact reduction identity ===
f_t(x,y,1-x-y) - g_t(x,y) simplifies to: 0  (must be 0)

=== 2. Hessian of g_t is positive definite ===
Hessian: [[8, 8], [8, 12]]  eigenvalues: {10 - 2*sqrt(17): 1, 2*sqrt(17) + 10: 1}

=== 3. polygon vertices (exact pairwise intersection) ===
vertices: [(0, 0), (0, 1), (1/2, 0), (3/5, 1/10), (3/5, 2/5)]

=== 4. exact KKT stationarity per piece ===
P1 [-2,-3/2]: nu=-21/4  l1=-2*t - 3
P2 [-3/2,-1]: nu=t - 15/4
P3 [-1,-1/2]: nu=3*t/2 - 13/4  l2=2*t + 2
P4 [-1/2,0]: nu=2*t - 3  l2=-2*t  l5=2*t + 1
P5 [0,9/5]: nu=11*t/6 - 3  l5=10*t/9 + 1
P6 [9/5,4]: nu=3/10  l4=2*t - 18/5  l5=3

=== 5. value function: exact per-piece formula, continuity, C^1 ===
P1..P6 phi(t): 29/8 ; -3t^2/4-9t/4+31/16 ; -t^2/4-5t/4+39/16 ;
                5/2-t ; -t^2/18-t+5/2 ; 67/25-6t/5
all 5 breakpoints: value AND derivative match on both sides (C^1)
envelope theorem phi'(t) = -2 x*(t): verified exactly on every piece

=== 6. the two "dead" edges: exact contradictions ===
edge V3V4 free y-minimizer: -3/20 (constant, outside [1/10,2/5] for all t)
edge V4V5: x*=(t+3)/2 needs t<=-9/5 to stay in range, but lambda3=2t-3
           needs t>=3/2 -- contradiction for every real t

ALL SYMBOLIC CHECKS PASSED
```

This matches every table in `solution.md` exactly (the exact rational
expressions are bit-for-bit identical to the hand derivation).

## Results — verify.py

```
[sweep] 241 t-values checked
[sweep] infeasible closed-form points: 0
[sweep] max(closed_form - slsqp_best) = 2.931e-13   (should be ~0 or negative)
[sweep] max(closed_form - grid_best)  = 8.882e-16   (should be ~0 or negative)
```

241 values of `t` evenly spaced over `[-2,4]` (step 0.025): the
closed-form point is always feasible, and never beaten (up to solver
noise ~1e-13/1e-16) by either an independent 8-restart SLSQP solve or a
241×60-point brute-force grid search over the polygon.

```
[continuity] approaching each of the 6 breakpoints from both sides (eps=1e-6):
  every max-abs-diff in (x,y,z,value) is within 1.2e-6 of the eps used,
  i.e. Lipschitz-continuous, at t = -2, -1.5, -1, -0.5, 0, 1.8, 4
```

```
[KKT] 13 representative t (one or more per piece):
  max stationarity residual (independently re-derived multipliers via
  least squares, not solution.py's formulas): 3.77e-15
  multipliers with wrong sign: []  (none)
```

Sample rows (multiplier values match `solution.md` §7 exactly, e.g.
`t=-0.75: λ2=0.5` matches `2t+2=0.5`; `t=0.9: λ5=2.0` matches
`(9+10t)/9=2`; `t=2.9: λ4=2.2, λ5=3` matches `2t-18/5=2.2`).

```
[envelope] max |dvalue/dt - (-2x(t))| = 5.999e-10   (central finite
           difference, h=1e-6, skipping points within 5e-5 of a breakpoint)
```

```
[domain] t=-2.0001, 4.0001, -10, 10 -> ValueError raised, as expected
[types]  solve(-2) with int input -> works, returns expected dict
```

## Additional ad hoc checks (run inline, not saved as a script)

* Random cross-check of the `f_t(x,y,1-x-y) = g_t(x,y)` identity over
  2×10⁵ random `(t,x,y)` with `x,y ∈ [-5,5]`: max abs difference
  `2.8e-13` (floating rounding only) — superseded by the exact symbolic
  proof in `symbolic_checks.py` §1.
* Margin check that the four "dead" faces are never competitive: for
  121 values of `t ∈ [-2,4]`, `g_t` evaluated at `V1=(0,0)`,
  `V4=(0.6,0.4)`, `V5=(0,1)`, an interior point of edge `V3V4`
  `(0.6,0.25)`, and an interior point of edge `V4V5` `(0.3,0.7)`, minus
  our optimal value, gave minimum margins `0.375, 1.44, 3.375, 0.585,
  2.535` respectively — always strictly positive, consistent with §6.7
  of `solution.md`.

## Limitations

* SLSQP and the grid search are local/discretized methods; they
  corroborate but (on their own) do not *prove* global optimality —
  that comes from the convexity + KKT sufficiency argument in
  `solution.md` §2 and §9. The numerics here are used only to catch
  transcription/arithmetic mistakes in the closed form, not as the
  proof itself.
* The grid search uses a finite mesh (241×60 points per `t`), so
  `max(closed_form - grid_best)` can be very slightly negative (closed
  form better than the nearest grid point); this was observed and is
  expected, not a bug.
* Floating-point continuity checks (`verify.py`) use `eps=1e-6`, not
  the exact symbolic limit; the exact statement (equality of value and
  one-sided derivative at each breakpoint) is proved separately and
  exactly in `symbolic_checks.py` §5.
* No claim is made about behavior outside `[-2,4]`; the "dead face"
  exclusions in `solution.md` §6.7 happen to hold for all real `t`, but
  this was verified only as a byproduct of the argument's algebra, not
  swept numerically outside the stated domain.

## Reproduce

```bash
cd <this directory>
python3 symbolic_checks.py   # exact, ~1s
python3 verify.py            # numeric, ~20-25s (SLSQP restarts dominate)
python3 -c "from solution import solve; print(solve(-2)); print(solve(1.8)); print(solve(3))"
```
