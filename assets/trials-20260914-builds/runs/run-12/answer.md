Everything reproduces exactly as documented. All three deliverables are complete and cross-verified.

## Summary

Solved the parametric QP (minimize a strictly-convex quadratic over a pentagonal feasible region in (x,y), after eliminating z via x+y+z=1) for all real t in [-2,4]. The Hessian of the reduced objective is positive-definite (eigenvalues 10±2√17), giving a unique global minimizer for every t, found via full KKT case analysis over all 11 combinatorial faces of the pentagon (1 interior region, 5 edges, 5 vertices).

Result: six regimes tiling [-2,4] exactly, with continuous, C¹ optimizer and value function:

| t-range | (x*,y*,z*) | value |
|---|---|---|
| [-2,-3/2] | (0, 1/4, 3/4) | 29/8 |
| [-3/2,-1] | ((9+6t)/8, -(1+t)/2, (3-2t)/8) | -3t²/4-9t/4+31/16 |
| [-1,-1/2] | ((5+2t)/8, 0, (3-2t)/8) | -t²/4-5t/4+39/16 |
| [-1/2,0] | (1/2, 0, 1/2) | 5/2-t |
| [0,9/5] | ((9+t)/18, t/18, (9-2t)/18) | -t²/18-t+5/2 |
| [9/5,4] | (3/5, 1/10, 3/10) | 67/25-6t/5 |

The other 3 vertices and 2 edges are shown to never satisfy KKT sign conditions anywhere in [-2,4] (one multiplier is a t-independent negative constant for each, or the stationarity location falls outside the edge's range for every valid-sign t) — this closes the completeness argument in solution.md §6.

Deliverables in `[study]/runs/run-12/work/`:
- `solution.md` — full derivation, convexity proof, pentagon vertex enumeration, six-regime KKT case analysis with explicit multipliers and sign convention, completeness argument, and C¹ continuity proof (envelope theorem, F'(t)=-2x*(t)).
- `solution.py` — stdlib-only `solve(t)`, silent on import, validates domain, returns exact dict with x/y/z/value/branch.
- `verification.md` — describes four executed checks: symbolic re-derivation (sympy), per-regime multiplier/continuity check, completeness check ruling out the other 5 faces, and an independent scipy SLSQP cross-check over 138 t-values (grid + all 5 breakpoints ± 1e-9) with 0 feasibility violations and max value discrepancy 3.4e-13 (numerical noise).
- `verify_sym.py`, `verify_sym2.py`, `verify_sym3.py`, `verify_numeric.py` — the actual reproducible scripts referenced by verification.md, all re-run successfully as the final step.

BRIEF.md was read only, not modified.