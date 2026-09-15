# Verification

This records the checks actually executed against `solution.py` /
`solution.md`, how to reproduce them, and their limitations. Everything ran
locally (Python 3, `sympy` 1.14, `numpy`, `scipy` 1.13), no network access.

## How to reproduce

```
cd <this directory>
python3 verify.py
```

`verify.py` is a self-contained script (reads only `solution.py` in this
directory) that runs every check below and prints `PASS`/`FAIL` per check,
exiting non-zero if anything fails. Last run: **all 16 checks passed**
(captured output reproduced at the bottom of this file).

## What was checked

1. **Symbolic re-derivation of the reduced objective.** Using `sympy`,
   substituted $z=1-x-y$ into $f_t$ independently of the hand derivation in
   `solution.md` and confirmed the expansion equals
   $g_t(x,y)=4x^2+8xy+6y^2-(5+2t)x-3y+4$ exactly (symbolic zero difference).
2. **Convexity.** Computed the Hessian of $g_t(x,y)$ symbolically and
   confirmed it is the constant matrix $\begin{pmatrix}8&8\\8&12\end{pmatrix}$
   and is positive definite (`sympy`'s `is_positive_definite`), independently
   confirming the strict-convexity claim used for the KKT-sufficiency
   argument in `solution.md` §3.
3. **Exact continuity at all five regime breakpoints**
   ($t=-\tfrac32,-1,-\tfrac12,0,\tfrac95$). For each breakpoint, evaluated
   `solve(t)` at $t\pm10^{-9}$ and confirmed $x,y,z,\text{value}$ agree to
   better than $10^{-6}$ across the boundary (i.e. no jump).
4. **Feasibility sweep.** Called `solve(t)` at 3001 evenly spaced points over
   $[-2,4]$ and checked $x+y+z=1$, $x,y,z\ge0$, $x\le0.6$, $2y+z\ge0.5$ to
   within $10^{-9}$ at every point. Zero violations.
5. **Independent numeric cross-check (the main test).** Solved the *original*
   3-variable QP directly with `scipy.optimize.minimize` (SLSQP, analytic
   Jacobian, `ftol=1e-14`, 6 different starting points per $t$ to guard
   against SLSQP local-optimum artifacts, keeping the best result) at 111
   values of $t$: a 61-point uniform grid over $[-2,4]$, points $\pm10^{-6}$
   on either side of every regime boundary, and 40 uniform random points.
   Compared against `solve(t)`. Result: max value discrepancy
   $2.975\times10^{-13}$, max point discrepancy $7.906\times10^{-9}$ — at the
   numerical precision floor of SLSQP itself, not evidence of any error in
   the closed form.
6. **KKT multiplier sign sweep.** Evaluated the `multipliers` field of
   `solve(t)` at 601 points over $[-2,4]$ and confirmed every multiplier
   returned is $\ge -10^{-9}$ (i.e. non-negative), consistent with the sign
   convention and per-regime bounds proved in `solution.md` §4.
7. **Envelope-theorem identity.** Checked $v'(t)=-2x^*(t)$ (`solution.md` §6)
   numerically via central finite differences ($h=10^{-6}$) at 400 points
   across $(-2,4)$, agreement to $10^{-4}$ everywhere (finite-difference
   truncation error, not a discrepancy).
8. **API-contract edge cases**: `solve(-1)` (int) returns a dict;
   `solve(5.0)` raises `ValueError`; `solve("1")` raises `TypeError`;
   `solve(-2)` and `solve(4)` (both closed endpoints) return finite dicts.
9. **Import purity.** Imported `solution.py` inside `contextlib.redirect_stdout`
   and confirmed zero bytes of output (no CLI, no prints, no file reads).

## Independent hand/symbolic cross-checks recorded in `solution.md`

Beyond the automated script, `solution.md` itself contains checks that are
proofs, not samples: exact-fraction evaluation of both neighboring formulas
at every one of the five breakpoints (§5a), the $t$-independent argument
ruling out vertices $A,D,E$ and edges $CD,DE$ for *every* $t$ at once (§5b,
not a finite sample), and the monotone comparative-statics lemma
$x^*(t_1)\le x^*(t_2)$ for $t_1<t_2$ proved algebraically for arbitrary
$t_1,t_2$ (§2.2), not checked pointwise.

## Limitations

* The SLSQP cross-check (item 5) is numerical and therefore only certifies
  agreement to floating-point/solver tolerance ($\sim10^{-8}$–$10^{-13}$
  here) at the sampled points, not exactness or completeness over the
  continuum — that is what the algebraic proof in `solution.md` is for.
  SLSQP is itself a local solver; the multi-start (6 starting points)
  mitigates but cannot with 100% certainty rule out it landing on a
  non-global local optimum on some pathological instance. Convexity
  (checked in item 2, and used in `solution.md` §3) is what actually
  guarantees SLSQP's stationary point is the global optimum whenever it
  converges, which is why the symbolic convexity check is included.
* The feasibility/multiplier/continuity sweeps (items 3, 4, 6) are finite
  grids (3001 / 601 points), not exhaustive over the continuum; they are
  consistency checks on `solve()`'s implementation of the closed formulas,
  not a substitute for the closed-form algebra itself.
* No GUI/visual regression testing was done on `diagram.svg` beyond
  rendering it headlessly (Chromium via Playwright) at a 375px-wide mobile
  viewport and visually inspecting the screenshot for legibility, vertex
  label placement, and absence of clipped text.
* All work was done within this directory with no network access, per the
  task constraints; nothing here depends on files or services outside it.

## Captured output of `python3 verify.py`

```
[PASS] reduced objective g_t(x,y) matches solution.md (*)
[PASS] Hessian [[8,8],[8,12]] is positive definite (strict convexity)
[PASS] continuity of solve(t) across breakpoint t=-3/2
[PASS] continuity of solve(t) across breakpoint t=-1
[PASS] continuity of solve(t) across breakpoint t=-1/2
[PASS] continuity of solve(t) across breakpoint t=0
[PASS] continuity of solve(t) across breakpoint t=9/5
[PASS] solve(t) feasible on a 3001-point grid over [-2,4]
    max |value - SLSQP value| over 111 samples: 2.975e-13
    max |point  - SLSQP point| over 111 samples: 7.906e-09
[PASS] solve(t) matches independent SLSQP solve to 1e-6
[PASS] all reported KKT multipliers are >= 0 on a 601-point grid
[PASS] v'(t) ~= -2 x*(t) (envelope theorem) via finite differences
[PASS] solve accepts int input
[PASS] solve rejects t outside [-2,4]
[PASS] solve rejects non-numeric t
[PASS] solve(-2) and solve(4) return finite numeric dicts
[PASS] importing solution.py produces no stdout output

All checks PASSED.
```
