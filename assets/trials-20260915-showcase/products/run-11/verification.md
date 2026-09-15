# Verification

This records the checks actually executed against `solution.md` / `solution.py`, with
reproducible commands, and states the limitations honestly. The proof of optimality lives in
`solution.md` (convexity + KKT); everything here is *corroborating* evidence that the algebra
and the code match that proof, not a substitute for it.

## Environment

* Python 3.9 (system), `sympy` 1.14.0 and `scipy` 1.13.1 available locally and used only for
  scratch-checking (never imported by `solution.py`, which is standard-library only).
* No network access was used or required.

## 1. Symbolic algebra checks (sympy)

Run interactively; the key steps and their results:

```python
import sympy as sp
x, y, z, t = sp.symbols('x y z t', real=True)
f = x**2+2*y**2+3*z**2+x*y-y*z+(2-2*t)*x+5*y+z
g = sp.expand(f.subs(z, 1-x-y))
# g == 4*x**2 + 8*x*y - 5*x + 6*y**2 - 3*y - 2*t*x + 4          (matches solution.md §2)

H = sp.hessian(g, (x, y))               # Matrix([[8, 8], [8, 12]])
H.eigenvals()                            # {10 - 2*sqrt(17): 1, 10 + 2*sqrt(17): 1}  (both > 0)
```

* **Result:** confirms the reduced objective and strict positive-definiteness of its Hessian for
  every $t$ (used in solution.md §2 to justify convex-QP / KKT-sufficiency).

**Pentagon vertex feasibility** — each of the 5 claimed vertices, substituted with exact
`Fraction`/`sympy.Rational` arithmetic, satisfies all 5 original constraints
($x\ge0,y\ge0,z\ge0,x\le3/5,2y+z\ge1/2$) with $z=1-x-y$:

```
(0,0) True   (1/2,0) True   (3/5,1/10) True   (3/5,2/5) True   (0,1) True
```

**KKT system per regime** — for each of the six regimes A–F, the $3\times3$ stationarity system
$$F_x=\nu+\lambda_1-\lambda_4,\quad F_y=\nu+\lambda_2+2\lambda_5,\quad F_z=\nu+\lambda_3+\lambda_5$$
was solved symbolically in `sympy` with the stated active set (all other $\lambda_i$ fixed to 0),
substituting the regime's closed-form $(x^\*(t),y^\*(t),z^\*(t))$. The solver returned a unique
closed form for $(\nu,\lambda_{\text{active}})$ in every regime, exactly matching the table in
`solution.md` §3 (e.g. regime D: $\nu=3-2t,\ \lambda_2=-2t,\ \lambda_5=2t+1$). The same procedure
applied to the three *non-optimal* vertices $V_1,V_4,V_5$ produced a permanently-negative
multiplier at each:
```
V1=(0,0):        lambda2 = -3            (always < 0)
V4=(3/5,2/5):    lambda3 = -33/5         (always < 0)
V5=(0,1):        lambda1 = -2t-6, lambda3 = -9   (lambda3 always < 0)
```
confirming these vertices are never optimal for any $t\in[-2,4]$, as claimed in solution.md §5.

**Boundary consistency** — at each of the 5 internal junctions
$t\in\{-3/2,-1,-1/2,0,9/5\}$, the position formulas of the two adjacent regimes were substituted
and their difference simplified to exactly `0`; likewise for the value function $\varphi(t)$
(both position and value match at all 5 junctions, and the derivatives $\varphi'(t)$ from the two
sides match too — i.e. $\varphi\in C^1$).

**Envelope identity** — $\varphi'(t) - (-2x^\*(t))$ was simplified to `0` symbolically in every
one of the six regimes, independently confirming the value-function formulas in solution.md §1
(§4 of solution.md explains why this identity must hold).

## 2. Numerical cross-checks

### 2a. Black-box optimizer (scipy SLSQP) vs. `solution.py`

The **original 3-variable** problem (not the reduced 2D form) was solved with
`scipy.optimize.minimize(method="SLSQP")`, 6 random restarts per $t$, over 284 values of $t$: a
121-point uniform grid on $[-2,4]$, 150 random points (seeded), and the 5 internal regime
boundaries probed at $t^-,t,t^+$ (offset $10^{-6}$) to stress-test both sides of every transition.

* **Result:** maximum $|f_{\text{SLSQP}} - f_{\texttt{solution.solve}}|$ over all 284 points =
  **$3.5\times10^{-13}$** — at the level of SLSQP's own floating-point convergence noise, not a
  real discrepancy.

### 2b. Independent stdlib-only finite-candidate oracle vs. `solution.py`

A second, completely independent oracle (`verify.py`, standard library only, does not call any of
`solution.py`'s regime logic) minimizes $g_t(x,y)$ over the pentagon by evaluating it at: the
unconstrained minimizer (if feasible), all 5 vertices, and the ternary-search-refined stationary
point of each of the 5 edges — the textbook finite candidate set for the minimum of a strictly
convex function over a convex polygon.

* **Result over the same 284 points:** maximum value error **$8.9\times10^{-16}$**, maximum
  position error **$1.5\times10^{-8}$** (limited by the ternary search's iteration count, not a
  disagreement).

### 2c. Direct property checks of `solution.py`

* `import solution` in a stdout-capturing wrapper produces **zero output** (no CLI, no prints).
* For every one of the 284 test points, the returned `(x, y, z)` satisfies $x+y+z=1$ to
  $10^{-9}$ and all 5 inequality constraints to $10^{-7}$.
* `solution.solve(-2.0000001)` and `solution.solve(4.0000001)` raise `ValueError`;
  `solution.solve("0")` raises `TypeError`.
* Both `int` and `float` inputs accepted; e.g. `solve(-2)` and `solve(2)` (ints) return the same
  values as the corresponding floats.
* At each regime boundary, evaluating `solve` at $t_0-10^{-6}$, $t_0$, $t_0+10^{-6}$ gives
  $(x,y,z,\text{value})$ that agree with each other to $\sim10^{-6}$ (continuity across the
  switch in formula), and the returned `regime` label switches exactly at $t_0$.

## 3. How to reproduce

From this directory:

```bash
python3 verify.py
```

Expected final line: `ALL CHECKS PASSED`, preceded by the two oracle summaries above. Actual
output obtained when this was run:

```
[stdlib oracle] 284 points checked; max |value error| = 8.882e-16; max |position error| = 1.549e-08
[scipy SLSQP]  284 points checked; max |value error| = 3.477e-13
ALL CHECKS PASSED
```

`verify.py` degrades gracefully if `scipy`/`numpy` are not installed (it prints "scipy not
available ... skipped" and still runs the stdlib-only oracle), so it remains runnable in a
minimal Python environment.

## 4. Limitations

* Numerical checks (scipy, ternary search) are inherently finite-precision and finite-sample;
  they corroborate the exact formulas at the tested points (dense grid + random + all boundary
  straddles) but cannot, by themselves, *prove* correctness for all real $t\in[-2,4]$ — that proof
  is the convexity + KKT argument in `solution.md` §§2–5, which is exact (fractions/symbolic
  algebra) and holds for every real $t$ in the interval, not just sampled ones.
* SLSQP is a local solver; it is only trustworthy here *because* the problem is independently
  proven convex (so any KKT point it finds is global) — we did not rely on SLSQP to establish
  convexity, only to cross-check the arithmetic, and used 6 random restarts per point as an extra
  safety margin.
* The finite-candidate stdlib oracle assumes the polygon's vertex list is correct; that list is
  itself independently verified in §1 (exact feasibility of all 5 vertices) and derived
  geometrically in `solution.md` §2, not merely asserted.
* `diagram.svg` was visually inspected by rendering it (via headless Chromium/Playwright) at a
  375 px viewport width and at a desktop width, embedded in a plain responsive `<img>`, to confirm
  no clipping, no overlapping labels, and no external resource requests; this is a visual check,
  not an automated pixel-diff test.
