# Verification

All checks below were executed locally (Python 3.9.6, numpy 2.0.2, scipy 1.13.1), no network access, no files outside this directory.

## Reproduce

```
python3 verify.py
```

This runs, in order:

1. **Feasibility + internal consistency.** For 32 values of `t` (including all five transition points ±1e-7, the domain endpoints, interior samples, and plain ints), `solve(t)` is checked against all six original constraints (not the reduced x,y form) and its reported `value` is checked against a direct evaluation of `f_t(x,y,z)` from the original formula (independent of the piecewise derivation in solution.py, since it re-expands `3z²` and `-yz` explicitly rather than reusing the reduced 2-variable polynomial).
2. **Independent numerical solver cross-check.** For the same 32 `t` values, `scipy.optimize.minimize` (SLSQP) is run from 7 different feasible starting points (all 5 pentagon vertices plus 2 interior points) and the best result is compared to the closed form. Result: **max value difference 1.4e-13, max point difference 1.4e-8** — at solver tolerance, i.e. no detectable discrepancy.
3. **Independent grid-search oracle.** At 9 representative `t` values spanning every regime, a brute-force fine grid (900×400 points) over the exact feasible pentagon is scanned directly (this does not call `solution.py`'s formulas or scipy — a fully independent oracle). Result: differences are consistent with grid resolution (≤2.4e-6), confirming no gross error.
4. **Continuity and C¹ smoothness at all 5 regime boundaries** (t = −3/2, −1, −1/2, 0, 9/5). Position (x,y,z) is checked continuous across each boundary (jump < 1e-5), and the one-sided derivatives of `f*(t)` are checked to agree (matching to 1e-3), confirming the value function has no corner at the transitions — only a change in curvature, as claimed in solution.md §5.
5. **Envelope-theorem self-consistency check** (`f*'(t) = −2x*(t)`) at 6 sample points across all regimes, using a central finite difference. This is an internal-consistency check on the derivation, not a substitute for the KKT proof in solution.md.

Actual output from the run used for this submission:

```
=== 1) Feasibility + internal consistency of solve(t) ===
  32 t-values: all feasible, value matches direct evaluation
=== 2) Cross-check vs independent SLSQP solves (scipy) ===
  max |value diff| = 1.39e-13, max |point diff| = 1.35e-08
=== 3) Cross-check vs independent fine-grid oracle at representative t ===
  t=-2     grid_val=3.625002 closed_val=3.625000 diff=2.4e-06
  t=-1.5   grid_val=3.625002 closed_val=3.625000 diff=2.4e-06
  t=-1     grid_val=3.437500 closed_val=3.437500 diff=2.8e-08
  t=-0.5   grid_val=3.000000 closed_val=3.000000 diff=4.9e-08
  t=0      grid_val=2.500006 closed_val=2.500000 diff=5.6e-06
  t=0.9    grid_val=1.555000 closed_val=1.555000 diff=5.6e-08
  t=1.8    grid_val=0.520000 closed_val=0.520000 diff=0.0e+00
  t=2.5    grid_val=-0.320000 closed_val=-0.320000 diff=1.7e-16
  t=4      grid_val=-2.120000 closed_val=-2.120000 diff=8.9e-16
=== 4) Continuity (position, value) and C1 smoothness of f*(t) at all 5 transitions ===
  t=-1.5: pos-jump L=0.0e+00 R=7.5e-08  f*'(left)=0.0000 f*'(right)=-0.0000
  t=-1.0: pos-jump L=7.5e-08 R=2.5e-08  f*'(left)=-0.7500 f*'(right)=-0.7500
  t=-0.5: pos-jump L=2.5e-08 R=0.0e+00  f*'(left)=-1.0000 f*'(right)=-1.0000
  t=0.0: pos-jump L=0.0e+00 R=1.1e-08  f*'(left)=-1.0000 f*'(right)=-1.0000
  t=1.8: pos-jump L=1.1e-08 R=1.1e-16  f*'(left)=-1.2000 f*'(right)=-1.2000
=== 5) Envelope-theorem check: f*'(t) == -2 x*(t) on each regime ===
  t=-1.9   f*'(t)=0.000000  -2x*(t)=-0.000000
  t=-1.3   f*'(t)=-0.300000  -2x*(t)=-0.300000
  t=-0.8   f*'(t)=-0.850000  -2x*(t)=-0.850000
  t=-0.2   f*'(t)=-1.000000  -2x*(t)=-1.000000
  t=0.9    f*'(t)=-1.100000  -2x*(t)=-1.100000
  t=3.0    f*'(t)=-1.200000  -2x*(t)=-1.200000

ALL VERIFICATION CHECKS PASSED
```

## Other checks performed

- `python3 -c "import xml.dom.minidom as m; m.parse('diagram.svg')"` — confirms `diagram.svg` is well-formed XML.
- Confirmed `diagram.svg` contains no external references (no `<image>`, `<link>`, `href` to a URL, fonts, or scripts) other than the mandatory `xmlns="http://www.w3.org/2000/svg"` namespace declaration, which is not a network fetch.
- Rendered `diagram.svg` with headless Chrome (`--headless=new --screenshot`) at both a wide viewport and, embedded in a minimal HTML page via `<img style="width:100%">` inside a 375px-wide container (representative of a mobile viewport), to confirm all labels remain fully visible and legible when the image is scaled down responsively.
- Confirmed `import solution` produces no stdout and defines no `__main__` guard side effects (`io.StringIO` capture around the import was empty).
- Manually re-derived every closed-form piece in solution.md by hand (Lagrangian stationarity + explicit multiplier sign conditions per regime) before writing solution.py, then treated the checks above as independent confirmation rather than the source of the formulas — i.e., the numerics did not generate the proof, they only stress-test it.

## Limitations

- The scipy/SLSQP and grid-search checks are numerical spot checks at finitely many `t` values (plus tight ±1e-7 neighborhoods of each transition); they cannot by themselves certify optimality for the full continuum of `t`, which is why solution.md's §3–§5 give an analytic KKT argument covering every `t` in closed form, including an explicit proof that every non-selected vertex/edge is infeasible in its multiplier sign for **all** `t` in [−2,4] (solution.md §4), not just at sampled points.
- The grid-search oracle's resolution (900×400) bounds its accuracy to ~1e-5–1e-6 in objective value near the true optimum; this is sufficient to catch a wrong regime or a wrong vertex but is not itself an exact certificate — it corroborates, it does not replace, the closed-form proof.
- All work was done offline with the local Python standard library plus numpy/scipy already available in this environment; no internet access or external files were used.
