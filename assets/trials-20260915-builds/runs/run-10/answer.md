BRIEF.md is untouched (mtime unchanged, only original files there). All four deliverables are complete in this directory:

- **solution.py** — `solve(t)` uses exact `fractions.Fraction` arithmetic internally, returns `x,y,z,value` plus region/active-set/KKT-multiplier fields; silent on import; raises `TypeError`/`ValueError` for bad input.
- **solution.md** — reduces the QP to 2 variables, proves strict convexity (Hessian PD, independent of `t`), identifies the feasible pentagon, derives the 6-region piecewise optimizer and value function with exact KKT multipliers, and proves exhaustiveness by showing 3 vertices and 2 edges are *never* optimal for *any* real `t` (sign-contradiction argument, not just search) and that the remaining 6 regions tile `[-2,4]` exactly.
- **verify.py** — reproducible stdlib script: independent grid-search cross-check, breakpoint continuity, KKT sign/complementary-slackness, exact-fraction spot checks, and input-contract tests.
- **verification.md** — documents exactly what was run and its results (all passed), plus stated limitations.

I ran `verify.py` and the earlier grid-search script; both confirm the closed-form optimizer matches an independently coded brute-force search to floating-point precision at every tested point, including points `1e-6`–`1e-7` on either side of all five breakpoints.