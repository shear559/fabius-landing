# Verification

Everything below was actually executed in this session (Python 3.9, macOS, `sympy` 1.14, `scipy` 1.13, `numpy` 2.0, and headless Chrome for the diagram — all used only to *check* the work; `solution.py` itself is standard-library only).

## 1. Symbolic derivation checks (sympy)

- Expanded `f` after substituting `z=1-x-y` and confirmed by hand vs. `sympy.expand`: `f2 = 4x²+8xy+6y²-(5+2t)x-3y+4`.
- Computed the pentagon's vertices by intersecting every pair of the 5 boundary lines with **exact `Fraction` arithmetic** and filtering by all 5 constraints — recovered exactly `A(0,0), B(1/2,0), C(3/5,1/10), D(3/5,2/5), E(0,1)` and no others.
- For each of the 6 accepted regimes and the 4 rejected faces (vertex A, vertex E, edge CD interior, edge DE interior, vertex D), solved the full 3-variable KKT system symbolically (`sympy.solve`) and recorded `λ` and every `μᵢ` as an exact function of `t`. Confirmed the sign condition (`μᵢ≥0` on accepted faces over their claimed range; some `μᵢ` identically negative on rejected faces) purely algebraically.
- Confirmed `f*(t)` and `f*'(t)` (value and derivative) agree exactly, as rationals, on both sides of all 5 breakpoints (`t=-3/2,-1,-1/2,0,9/5`) — i.e. `C¹` continuity, not just continuity.

## 2. Independent numeric cross-check (scipy, oracle-style)

Solved the original 3-variable QP with `scipy.optimize.minimize` (`SLSQP`, equality + 5 inequality constraints, 6 random restarts per `t`, `ftol=1e-14`) on a grid of 121 points over `t∈[-2,4]`, and compared to the closed-form `(x*,y*,z*,f*)`:

```
max deviation over the full grid (position + value): 1.1e-8
```

This is an *independent* solver (generic nonlinear KKT solver, not the analytic derivation) landing on the same answer everywhere, including inside every regime and near every breakpoint.

## 3. `solution.py` self-consistency tests

Ran (see reproduction script below):

- **Import hygiene**: `import solution` under `contextlib.redirect_stdout` produces no output (no CLI, no prints).
- **Exact agreement**: at all 5 breakpoints, both interval endpoints (`t=-2,4`), and several interior points per regime, `solution.solve(t)` matches the `Fraction`-exact formulas to `<1e-9` (observed max `8.9e-16`, i.e. double-precision rounding only).
- **Near-boundary continuity**: `solve(bp±1e-6)` for every breakpoint `bp` stays within `1e-4` of `solve(bp)` (observed far tighter) — checks "arbitrarily close points on either side" behave consistently, not just the exact breakpoint value.
- **Feasibility on a dense grid**: `t` stepped by `0.001` over the full `[-2,4]` (6001 points) — every returned `(x,y,z)` satisfies `x+y+z=1`, `x,y,z≥0`, `x≤3/5`, `2y+z≥1/2` to `1e-9`, and every field is finite (`math.isfinite`). **0 violations.**
- **Input validation**: `solve(-2.1)` raises `ValueError`; `solve("1")` raises `TypeError`.

## 4. Diagram checks

Rendered `diagram.svg` headlessly (`Google Chrome --headless --screenshot`) at a mobile viewport (`360×600`) and inspected the resulting PNG: the pentagon, all 5 vertex labels, the 5 edge/constraint labels, and the optimizer polyline with its 4 breakpoints and `t`-labels are all visible with no clipping or overlap. The SVG has no `<image>`, `xlink:href`, `@import`, or network reference of any kind — only inline shapes, text, and a system font stack.

## 5. Reproduction

Run from this directory (only the standard library plus, optionally, `sympy`/`scipy` for the independent cross-checks):

```bash
python3 - << 'EOF'
from fractions import Fraction as F
import math
import solution

def exact(t):
    t = F(t)
    if t <= F(-3,2):   x, y = F(0), F(1,4)
    elif t <= F(-1):   x, y = (9+6*t)/8, -(1+t)/2
    elif t <= F(-1,2): x, y = (5+2*t)/8, F(0)
    elif t <= 0:       x, y = F(1,2), F(0)
    elif t <= F(9,5):  x, y = F(1,2)+t/18, t/18
    else:              x, y = F(3,5), F(1,10)
    z = 1-x-y
    val = x**2+2*y**2+3*z**2+x*y-y*z+(2-2*t)*x+5*y+z
    return x, y, z, val

breakpoints = [F(-2), F(-3,2), F(-1), F(-1,2), F(0), F(9,5), F(4)]
for tf in breakpoints:
    x, y, z, val = exact(tf)
    r = solution.solve(float(tf))
    err = max(abs(r['x']-float(x)), abs(r['y']-float(y)),
              abs(r['z']-float(z)), abs(r['value']-float(val)))
    assert err < 1e-9, (tf, r, (x, y, z, val))
print("breakpoint exactness: OK")

for i in range(-2000, 4001):
    t = i/1000
    r = solution.solve(t)
    x, y, z = r['x'], r['y'], r['z']
    assert all(math.isfinite(v) for v in (x, y, z, r['value']))
    assert abs(x+y+z-1) < 1e-9
    assert x >= -1e-9 and y >= -1e-9 and z >= -1e-9
    assert x <= 0.6+1e-9 and 2*y+z >= 0.5-1e-9
print("feasibility grid (6001 pts): OK")
EOF
```

## Limitations

- The `scipy` cross-check is numeric (finite grid, finite restarts); it corroborates but does not itself prove global optimality — that proof is the strict-convexity + KKT argument in `solution.md` §3–5.
- `solution.py` uses IEEE-754 double arithmetic, so results are exact only up to floating-point rounding (~1e-15), not exact rationals; `solution.md` states the exact fractions.
- The diagram was visually inspected via one rendered screenshot at one mobile width (360px) and reasoned about structurally for larger widths (the SVG uses relative `viewBox` scaling, so it degrades gracefully); it was not tested across every possible viewport.
