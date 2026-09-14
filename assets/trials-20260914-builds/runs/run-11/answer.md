Everything is in place and verified. BRIEF.md is untouched.

## Summary

Solved the parametric QP (strictly convex objective — Hessian eigenvalues 4, 4±√6 in the original 3 variables, and 10±2√17 after eliminating z — over a compact convex polytope), so KKT is both necessary and sufficient and the minimizer is unique for every t.

Reducing via z=1−x−y, the feasible region is a non-degenerate pentagon (verified by checking all 10 constraint-pairs and all 10 constraint-triples). The unconstrained minimizer traces a straight line in t; it's feasible only for t∈[−3/2,−1]. Exhaustively solving KKT for all 11 possible active sets (interior, 5 edges, 5 vertices) shows exactly 6 are ever realized, tiling [−2,4] with breakpoints at t = −3/2, −1, −1/2, 0, 9/5; the other 5 candidates are proved impossible for *any* real t (e.g. constant negative multipliers). The optimizer and value function are continuous and C¹ across every breakpoint, independently confirmed via the envelope theorem (V′(t) = −2x*(t), exact on every piece).

Deliverables (all in `[study]/runs/run-11/work/`):

- **solution.md** — full rigorous derivation: convexity proof, exact pentagon enumeration (all pairs/triples of constraints checked), exhaustive KKT case analysis for all 11 candidate active sets (6 realized, 5 proved impossible), the six closed-form piecewise formulas for (x*,y*,z*) and V(t), multipliers with explicit sign convention, and C¹ continuity proof at every breakpoint.
- **solution.py** — stdlib-only `solve(t)` implementing the six branches; importing produces no output/side effects (confirmed via fresh subprocess).
- **verification.md** — records checks actually run: symbolic sympy cross-derivation, dense-grid feasibility (6001 pts, 0 violations), breakpoint continuity, envelope-theorem finite-difference check, and an independent multi-start SLSQP solve across 108 t-values (worst disagreement ~3e-13 in value, ~9e-9 in point) — plus stated limitations.
- **verify.py** — the reproducible script behind those numerical checks (`python3 verify.py`, ~5.5s, all checks pass).