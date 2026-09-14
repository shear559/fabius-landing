# Verification

All checks below were actually executed locally (Python 3, sympy 1.14.0, scipy 1.13.1, numpy 2.0.2;
no internet, no external files). Four scripts are included in this directory and are reproducible by
running the commands shown.

## 1. Symbolic re‑derivation of the reduction (`verify_sym.py`)

Command: `python3 verify_sym.py`

What it checks: substitutes z=1−x−y into f_t with sympy and expands, confirming
g_t(x,y) = 4x²+8xy+6y²+(−5−2t)x−3y+4 exactly as used in solution.md; computes the Hessian
[[8,8],[8,12]] (i.e. 2×[[4,4],[4,6]]) and its eigenvalues 10±2√17 (both positive ⇒ strict convexity);
solves ∇g_t=0 symbolically, getting x°=3t/4+9/8, y°=−t/2−1/2 — matching solution.md §4 exactly.

Observed output (excerpt):
```
g_t(x,y) = -2*t*x + 4*x**2 + 8*x*y - 5*x + 6*y**2 - 3*y + 4
Hessian: Matrix([[8, 8], [8, 12]])
Hessian eigen: {10 - 2*sqrt(17): 1, 2*sqrt(17) + 10: 1}
unconstrained stationary: {x: 3*t/4 + 9/8, y: -t/2 - 1/2}
```

## 2. Symbolic derivation and multiplier check for all six regimes (`verify_sym2.py`)

Command: `python3 verify_sym2.py`

What it checks, for each of the six regimes in solution.md §5: the closed‑form (x,y,value) as a
function of t; the value **at each breakpoint from both adjoining regimes**, confirming they agree
(continuity, §7); and the KKT multiplier(s) for the active constraint(s) on that regime, solved
symbolically from ∇g_t = Σλᵢ∇cᵢ.

Observed output (excerpt, all values as computed, not hand-checked):
```
value1 = 29/8 (both endpoints of R1/R2 boundary match: 29/8)
value2 = -3*t**2/4 - 9*t/4 + 31/16  (t=-3/2 -> 29/8, t=-1 -> 55/16)
value3 = -t**2/4 - 5*t/4 + 39/16    (t=-1 -> 55/16, t=-1/2 -> 3)
value4 = 5/2 - t                    (t=-1/2 -> 3, t=0 -> 5/2)
value5 = -t**2/18 - t + 5/2         (t=0 -> 5/2, t=9/5 -> 13/25)
value6 = 67/25 - 6*t/5              (t=9/5 -> 13/25)
lam1 = -2*t - 3          (>=0 iff t<=-3/2)
lam2(R3) = 2*t + 2       (>=0 iff t>=-1)
vertex R4: {lam2_4: -2*t, lam5_4: 2*t + 1}     (both >=0 iff -1/2<=t<=0)
lam5(R5) = 10*t/9 + 1    (>=0 throughout [0,9/5])
vertex R6: {lam4_6: 2*t - 18/5, lam5_6: 3}     (lam4>=0 iff t>=9/5; lam5=3 always)
```
Every multiplier sign condition matches the stated regime boundaries in solution.md §5 exactly, and
every breakpoint value matches from both sides.

## 3. Completeness — the other 3 vertices and 2 edges are never optimal (`verify_sym3.py`)

Command: `python3 verify_sym3.py`

What it checks: solves the KKT stationarity equations symbolically for vertex (0,0), vertex (0,1),
vertex (3/5,2/5), the interior of edge C (x+y=1), and the interior of edge D (x=3/5), and reports the
resulting multiplier(s) / required location as a function of t.

Observed output:
```
(0,0):     l1 = -2*t-5, l2 = -3            -> l2 never >= 0
(0,1):     l1b = -2*t-6, l3b = -9          -> l3b never >= 0
(3/5,2/5): l3c = -33/5, l4c = 2*t+18/5     -> l3c never >= 0
edge C:    lambda_C(x) = 2*t - 3; stationary x = t/2 + 3/2
           -> for lambda_C>=0 need t>=3/2, giving x>=9/4, far outside edge C's range [0, 3/5]
edge D:    stationary y = -3/20 (independent of t) -> outside edge D's range [1/10, 2/5]
```
This confirms, independently of the tiling argument in solution.md §6, that these five faces are
never KKT‑valid anywhere in (indeed, well beyond) [−2,4].

## 4. Independent numerical cross‑check against `solution.py` (`verify_numeric.py`)

Command: `python3 verify_numeric.py`

What it does: for 138 values of t (a 121‑point grid over [−2,4], the five interior breakpoints and
the two interval endpoints, and each breakpoint ± 1e‑9 to probe "arbitrarily close points on either
side"), it solves the **original 3‑variable problem** independently with `scipy.optimize.minimize`
(SLSQP, equality constraint x+y+z=1 and the four linear inequalities as `LinearConstraint`s, 6
different starting points per t to guard against a bad local solve) and compares against
`solution.solve(t)`. It also checks feasibility of every returned point against all five original
inequalities plus the equality, and exercises `solve()`'s domain check and int‑vs‑float handling.

Observed output:
```
max value error over grid: 3.36e-13
feasibility violations: 0
breakpoint -1.5: left-diff=0.000e+00 right-diff=7.500e-10
breakpoint -1.0: left-diff=7.500e-10 right-diff=7.500e-10
breakpoint -0.5: left-diff=1.000e-09 right-diff=1.000e-09
breakpoint 0.0:  left-diff=1.000e-09 right-diff=1.000e-09
breakpoint 1.8:  left-diff=1.200e-09 right-diff=1.200e-09
correctly rejected -2.0001 / 4.0001 / 10
```
The value discrepancy (3.36e-13) is at SLSQP's numerical noise floor, not a real mismatch; no
`MISMATCH` line was printed by the script (it prints one for any err>1e-5 or coordinate
err>1e-4 — none triggered). The breakpoint diffs of order 1e‑9 are exactly the size of the probe step
(1e‑9), consistent with a continuous, well‑conditioned formula rather than a jump.

## 5. Sanity checks on `solution.py` itself

- `import solution` produces no stdout (checked by capturing stdout around the import — empty).
- `solution.solve(-2)`, `solution.solve(4)` (int input) return the same values as the float grid
  endpoints.
- Out‑of‑range inputs (`-2.0001`, `4.0001`, `10`) raise `ValueError`.
- `solution.solve(t)["x"]+["y"]+["z"] == 1` and all five inequalities hold at every tested t (see §4,
  0 feasibility violations out of 138 points).

## Limitations

- The scipy cross‑check (§4) is corroborating evidence, not the proof; the proof is the KKT argument
  in solution.md, which is necessary and sufficient here because the problem is convex with affine
  constraints (solution.md §2).
- The grid in §4, while covering both interval endpoints, all five interior breakpoints, and
  ±1e‑9 neighborhoods of each, is still a finite sample; the closed‑form derivation (§1–§3 above,
  and solution.md in full) is what establishes correctness for *every* real t in [−2,4], not the
  sampling.
- No internet access, external files, or hidden evaluation material were used, per the brief.

## Reproduce everything

```
cd <this directory>
python3 verify_sym.py
python3 verify_sym2.py
python3 verify_sym3.py
python3 verify_numeric.py
python3 -c "import solution; print(solution.solve(0)); print(solution.solve(-2)); print(solution.solve(4))"
```
