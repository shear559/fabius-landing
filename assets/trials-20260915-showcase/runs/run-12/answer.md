All four deliverables are in place and verified, and BRIEF.md is untouched (still its original timestamp/size).

## Summary

Solved the parametric QP by eliminating `z`, proving strict convexity of the reduced 2‑variable objective (Hessian `[[8,8],[8,12]]`, det 32 > 0) over the fixed pentagon `A(0,0)–B(1/2,0)–C(3/5,1/10)–D(3/5,2/5)–E(0,1)`, then running a full KKT case analysis across all 5 vertices and 5 edges. The optimizer traces exactly 6 regimes over `t∈[-2,4]`, joined `C¹`-continuously at breakpoints `t = -3/2, -1, -1/2, 0, 9/5`, with the two never-active faces (edge CD, vertex D) and three never-active corners/edge (A, E, edge DE) ruled out via algebraically-always-negative KKT multipliers (valid for *all* real `t`, not just sampled points).

Delivered in this directory:
- **`solution.md`** — exact answer table, geometry, full KKT derivation with explicit sign convention for every regime, proof of exhaustiveness, and value-function continuity/differentiability proof.
- **`solution.py`** — stdlib-only `solve(t)`, validated against exact `Fraction` arithmetic (error ~1e-16), continuity at breakpoints, and a 6001-point feasibility sweep (0 violations); silent on import.
- **`verification.md`** — the actual checks run (sympy symbolic KKT, independent scipy/SLSQP cross-check with 1.1e-8 max deviation, solution.py tests, headless-Chrome diagram render) plus a reproducible script and stated limitations.
- **`diagram.svg`** — self-contained, no external resources, confirmed to render cleanly at 360px mobile width via headless Chrome screenshot, showing the pentagon and the labeled optimizer path.