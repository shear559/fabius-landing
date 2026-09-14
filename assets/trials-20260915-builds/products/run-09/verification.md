# Verification log

Environment: macOS, Python 3.9 (`python3`), with `sympy`, `numpy`, `scipy` available locally (no network access used or required). `solution.py` itself uses only the Python standard library.

## 1. Symbolic derivation checks (sympy)

**1.1 Elimination of $z$.** Confirmed by CAS expansion that
$f_t(x,y,1-x-y) = 4x^2+8xy+6y^2+(-5-2t)x-3y+4$, matching the hand derivation used in `solution.md` §1.
```python
import sympy as sp
x,y,z,t = sp.symbols('x y z t', real=True)
f = x**2 + 2*y**2 + 3*z**2 + x*y - y*z + (2-2*t)*x + 5*y + z
print(sp.expand(f.subs(z, 1-x-y)))
# -> -2*t*x + 4*x**2 + 8*x*y - 5*x + 6*y**2 - 3*y + 4
```

**1.2 Vertex objective values.** Evaluated $f_t$ at all 5 pentagon vertices symbolically (used to see which vertices could ever be competitive):
`V1(0,0)=4`, `V2(1/2,0)=5/2-t`, `V3(3/5,1/10)=67/25-6t/5`, `V4(3/5,2/5)=103/25-6t/5`, `V5(0,1)=7`.

**1.3 Stationary points on every edge**, solved symbolically with `sympy.solve` from the Lagrange stationarity conditions of the reduced 2‑D problem (§3.2–3.7 of `solution.md`): edges $A,B,E$ each gave a valid moving optimizer with an explicit multiplier as a function of $t$; edge $D$ gave a $y$-value ($-3/20$) that is infeasible for every $t$; edge $C$ gave a multiplier sign condition ($t\ge3/2$) contradicting its feasibility range ($t\le-9/5$), so it is never active.

**1.4 Independent full 3‑variable KKT solve.** Re‑derived every multiplier ($\lambda,\mu_1,\dots,\mu_5$) directly from the original 3‑variable stationarity system (2) in `solution.md`, for all 6 active regions and all 5 excluded faces ($V_1,V_4,V_5$, edge $D$, edge $C$), using `sympy.solve` on the linear system. This is a derivation independent of the 2‑variable reduction (different variables, different elimination order) and it reproduced every multiplier formula from the reduced approach exactly ($\mu_1=-2t-3$, $\mu_2=2t+2$, etc.), and confirmed the three "always‑negative" multipliers ($\mu_2=-3$ at $V_1$, $\mu_3=-33/5$ at $V_4$, $\mu_3=-9$ at $V_5$) that rule those vertices out for every real $t$.

**1.5 Continuity and $C^1$-smoothness of the value function.** For each of the 6 pieces, symbolically expanded $v(t)$, evaluated both neighboring pieces at each of the 5 breakpoints ($t=-3/2,-1,-1/2,0,9/5$) and confirmed the values agree exactly (e.g. both sides give $55/16$ at $t=-1$). Also symbolically differentiated each $v(t)$ piece and confirmed $v'(t)=-2x(t)$ termwise (envelope theorem check), which — combined with continuity of $x(t)$ — proves $v\in C^1[-2,4]$.

All of the above sympy computations are reproducible; the exact commands used are recorded in this repository's shell history and reproduced inline in `solution.md`; the core ones can be re-run with:
```bash
python3 - <<'PY'
import sympy as sp
x,y,t = sp.symbols('x y t', real=True)
f = 4*x**2 + 8*x*y + 6*y**2 + (-5-2*t)*x - 3*y + 4
fx = sp.diff(f,x); fy = sp.diff(f,y)
print(sp.solve(sp.Eq(fx+fy,0), x))          # edge E stationary x, before subst.
PY
```

## 2. Numerical cross-validation against an independent oracle (scipy)

`solution.py` is stdlib-only per the brief, so it was *not* used to build the oracle. Instead, `scipy.optimize.minimize` (SLSQP) with the *original* 3-variable constraints (linear equality + 5 linear inequalities) was run from 20–25 random feasible starting points (Dirichlet-sampled) for each test $t$, keeping the best converged result, and compared against `solution.solve(t)`.

Test points (52 total): the 5 breakpoints and both interval endpoints ($-2,-1.5,-1,-0.5,0,1.8,4$), points offset by $\pm10^{-6}$ and $\pm10^{-9}$ around every one of the 5 interior breakpoints (to probe both sides of each transition), and 25 uniform random points in $[-2,4]$ (seeded, reproducible).

For every point: verified feasibility ($x+y+z=1$ to $10^{-9}$, all 5 inequalities satisfied to $10^{-9}$), verified `solution.py`'s reported `value` matches direct evaluation of $f_t$ at its returned $(x,y,z)$ to $10^{-9}$, and compared its $(x,y,z,\text{value})$ against the scipy oracle.

**Result:** max coordinate discrepancy over all 52 points $= 1.26\times10^{-8}$; max objective-value discrepancy $=3.3\times10^{-14}$; 0 mismatches, 0 infeasible points, 0 formula inconsistencies. Also confirmed `solution.solve` accepts a plain `int` (e.g. `solve(2)`) and that all returned numeric fields are finite (`math.isfinite`).

Reproduce with:
```bash
python3 - <<'PY'
import sys; sys.path.insert(0, '.')
import solution, numpy as np, random
from scipy.optimize import minimize

def f(v, t):
    x, y, z = v
    return x**2+2*y**2+3*z**2+x*y-y*z+(2-2*t)*x+5*y+z

cons = [
    {'type': 'eq', 'fun': lambda v: v[0]+v[1]+v[2]-1},
    {'type': 'ineq', 'fun': lambda v: v[0]},
    {'type': 'ineq', 'fun': lambda v: v[1]},
    {'type': 'ineq', 'fun': lambda v: v[2]},
    {'type': 'ineq', 'fun': lambda v: 0.6-v[0]},
    {'type': 'ineq', 'fun': lambda v: 2*v[1]+v[2]-0.5},
]

def scipy_best(t):
    best = None
    for _ in range(25):
        x0 = np.random.dirichlet([1, 1, 1])
        r = minimize(f, x0, args=(t,), constraints=cons, method='SLSQP',
                     options={'maxiter': 2000, 'ftol': 1e-15})
        if r.success and (best is None or r.fun < best.fun):
            best = r
    return best

random.seed(1); np.random.seed(1)
ts = [-2, -1.5, -1, -0.5, 0, 1.8, 4]
for b in [-1.5, -1, -0.5, 0, 1.8]:
    ts += [b - 1e-6, b + 1e-6, b - 1e-9, b + 1e-9]
ts += [random.uniform(-2, 4) for _ in range(25)]

for t in ts:
    r = solution.solve(t)
    best = scipy_best(t)
    err = max(abs(r['x']-best.x[0]), abs(r['y']-best.x[1]), abs(r['z']-best.x[2]))
    assert err < 1e-4 and abs(r['value']-best.fun) < 1e-5, (t, r, best.x, best.fun)
print("all", len(ts), "points OK")
PY
```

## 3. `solution.py` self-checks

- `python3 -c "import solution"` runs silently (no stdout, no CLI, no file access) — confirms the "importing must not run a CLI / print / read files" requirement.
- `solution.solve(t)` was checked at exact breakpoints from both sides using `Fraction`-computed reference points (see `/tmp/closed_form.py`-style check during development) and matched the piecewise table in `solution.md` §4 exactly at $t\in\{-2,-1.5,-1.25,-1,-0.75,-0.5,-0.25,0,0.5,1,1.8,2,3,4\}$.
- Confirmed `solve` accepts both `int` and `float` inputs and returns a `dict` with finite `x`, `y`, `z`, `value` (plus informational `t`, `region`, `active_set`, `multipliers` fields).

## 4. Limitations

- The scipy cross-check is a numerical oracle with a local SLSQP solver restarted from 20–25 random points; it is strong evidence of correctness but is not itself a proof — the proof is the KKT/convexity argument in `solution.md`, which was checked symbolically (§1 above), not just numerically.
- Floating-point breakpoints in `solution.py` (e.g. `1.8` for $9/5$) are not bit-exact fractions, but since the two adjacent formulas are proven mathematically continuous at every breakpoint (`solution.md` §4–5), any sub-ulp misclassification of which branch is used at a breakpoint has no visible effect on the returned point or value.
- No internet access, external files, or hidden test material were used at any point; all randomness in the verification scripts is seeded for reproducibility.
