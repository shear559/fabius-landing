## Summary

Solved the parametric QP $\min f_t(x,y,z)$ subject to $x+y+z=1$, $x,y,z\ge0$, $x\le3/5$, $2y+z\ge1/2$, for all $t\in[-2,4]$.

**Approach**: eliminated $z=1-x-y$ to get a strictly convex 2‑variable QP (Hessian/2 = $\begin{pmatrix}4&4\\4&6\end{pmatrix}$, det $=8>0$) over a fixed pentagon with vertices $(0,0),(1/2,0),(3/5,1/10),(3/5,2/5),(0,1)$. Strict convexity makes KKT necessary *and* sufficient, so exhibiting a correctly-signed KKT point for every $t$ proves global uniqueness. Solved all 11 candidate faces (interior, 5 edges, 5 vertices) symbolically with `sympy`; six faces exactly tile $[-2,4]$ with matching values/derivatives at every breakpoint, and the other five are proven (via multiplier signs) to never apply on $[-2,4]$ — three of them never apply for *any* real $t$.

**Result** — six regions, each with exact closed forms (see `solution.md` §8 for the full table):
- $[-2,-3/2]$: constant point $(0,1/4,3/4)$
- $[-3/2,-1]$: interior, $(6t{+}9)/8,\,-(t{+}1)/2,\,(3{-}2t)/8$
- $[-1,-1/2]$: edge $y=0$
- $[-1/2,0]$: vertex $(1/2,0,1/2)$
- $[0,9/5]$: edge $2y+z=1/2$
- $[9/5,4]$: vertex $(3/5,1/10,3/10)$

The value function is continuous and $C^1$ (concave, via envelope theorem $V'(t)=-2x^*(t)$) across all five breakpoints, confirmed symbolically.

**Deliverables** in `[study]/runs/run-09/work/`:
- `solution.md` — full derivation, KKT multipliers (explicit sign convention, both reduced-2D and full-3D with equality multiplier ν), exhaustive proof that no face/parameter range was missed, continuity/differentiability proof.
- `solution.py` — stdlib-only `solve(t)`; import-safe (verified silent), returns floats, raises `TypeError`/`ValueError` appropriately.
- `verification.md` + `verify.py` — reproducible script (`python3 verify.py`) cross-checking `solve()` against an independent exact-`Fraction` re-implementation (354 points incl. random samples and ±1e-9/1e-6/1e-3 around every breakpoint: max error 1.1e-16) and against `scipy.optimize.minimize`/SLSQP from 6 restarts at 18 points (max error 7.8e-9). Both passed cleanly on the final run.

Temporary derivation scripts (`scratch/`) were deleted after all checks passed; `BRIEF.md` was left untouched (verified via checksum before/after).