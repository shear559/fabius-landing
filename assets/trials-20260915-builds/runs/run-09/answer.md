All three deliverables are complete and verified in this directory:

- **`solution.md`** — full derivation: reduces to a strictly convex 2‑variable QP over a pentagon, sets up KKT with an explicit sign convention, works out all 6 active regions that actually occur (constant point → interior → two edges → two vertices) with exact breakpoints at $t=-\tfrac32,-1,-\tfrac12,0,\tfrac95$, proves the other 5 possible faces are *never* KKT-valid for any real $t$ (so nothing is missed), and gives the exact optimal value function with proof of continuity and $C^1$-smoothness (envelope theorem).
- **`solution.py`** — stdlib-only, exposes `solve(t)` returning `x,y,z,value` (plus diagnostic fields); silent on import.
- **`verification.md`** — documents the sympy symbolic checks (two independent derivations: 2‑variable reduction and full 3‑variable KKT, agreeing exactly) and a numerical cross-check against an independent `scipy` SLSQP oracle over 52 points (boundaries, ±1e-6/1e-9 straddling every breakpoint, random points), with max error ~1e-8, plus reproducible commands.

BRIEF.md was left untouched throughout.