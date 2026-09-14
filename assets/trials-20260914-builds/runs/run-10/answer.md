All deliverables are complete in the working directory (BRIEF.md untouched, size 1791 bytes as originally read).

## Summary

Solved the parametric QP by eliminating `z=1-x-y` to get a strictly convex 2-variable problem `g_t(x,y)=4x²+6y²+8xy-(5+2t)x-3y+4` over a pentagon with vertices `(0,0),(1/2,0),(3/5,1/10),(3/5,2/5),(0,1)`. Strict convexity (Hessian `[[8,8],[8,12]]`, eigenvalues `10±2√17`) gives a unique global minimizer for every `t`; Slater's condition makes KKT necessary and sufficient.

The optimizer is piecewise-exact across six regimes on `[-2,4]`:
- `[-2,-3/2]`: `(0, 1/4, 3/4)` (constant)
- `[-3/2,-1]`: interior, `x=(9+6t)/8, y=-(1+t)/2, z=(3-2t)/8`
- `[-1,-1/2]`: edge `y=0`, `x=(5+2t)/8, z=(3-2t)/8`
- `[-1/2,0]`: vertex `(1/2,0,1/2)`
- `[0,9/5]`: edge `2y+z=1/2`, `x=(9+t)/18, y=t/18, z=(9-2t)/18`
- `[9/5,4]`: vertex `(3/5,1/10,3/10)`

Completeness was proved two ways: (1) a general monotonicity lemma (`x*(t)` non-decreasing in `t`, proved from bare optimality with no convexity assumption), and (2) an exhaustive KKT test of all 10 boundary faces + interior of the pentagon, showing the four untested faces (vertices V1/V4/V5, edges V3V4-interior and V4V5) never satisfy KKT for *any* real `t` (exact algebraic contradictions, e.g. `t≤-9/5` vs `t≥3/2`). The value function turns out to be globally concave and **C¹** (not just continuous) — every one-sided derivative matches at all 5 breakpoints, confirmed both by hand and exactly in sympy.

Verification (`/private/tmp/.../work/verification.md`) covers: exact symbolic re-derivation of the reduction identity, Hessian, vertices, KKT multipliers, and value function (`symbolic_checks.py`, all passed exactly); independent numeric cross-checks via 8-restart SLSQP and a fine grid search across 241 values of `t` (max gap ~1e-13/1e-16), continuity checks straddling every breakpoint, an independent least-squares KKT re-derivation, an envelope-theorem finite-difference check, and domain/type-error handling (`verify.py`, all passed).

`solution.py` is stdlib-only (`math`, `fractions`), has no import-time side effects (confirmed via captured-stdout test), rejects bool/NaN/inf/out-of-range inputs, and its `solve(t)` returns a dict with finite `x,y,z,value` plus `active`/`piece` metadata.

Files: `[study]/runs/run-10/work/{solution.md, solution.py, verification.md, verify.py, symbolic_checks.py}`.