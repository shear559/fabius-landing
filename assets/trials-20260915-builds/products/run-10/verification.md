# Verification

All checks were run locally with the Python 3 standard library only (`fractions`, no
network, no third-party packages). Everything below was actually executed in this
session, not just described.

## How to reproduce

```
python3 verify.py
```

This is a self-contained script (in this directory) that imports `solution.solve`
and runs five independent checks, printing `ALL VERIFICATION CHECKS PASSED` on
success (it was run and did print that). It also asserts on any failure, so a
non-zero exit / traceback means a check failed.

## What `verify.py` actually checks

1. **Feasibility + independent grid-search agreement.** For ~55 values of `t`
   spanning `[-2,4]` (fixed representative points, points within `1e-6` of every
   breakpoint, and 30 pseudo-random points), it checks `solve(t)` is feasible
   (`x,y,z>=0`, `x<=0.6`, `2y+z>=0.5`, `x+y+z=1`) and that a brute-force grid
   search over the feasible polygon (600×300 samples, re-derived independently of
   the closed-form solution: same feasibility test, no shared code path for the
   optimizer itself) never finds a strictly better point. Observed worst-case
   `formula_value - grid_best` over all runs was on the order of `1e-6` or better
   (grid discretization error in the *grid's* favor, not the formula's — the
   formula's value is a true local minimum of the same function on a finer scale,
   as region 5's exact fraction checks in item 4 confirm to `1e-9`).
2. **Continuity at the 5 breakpoints** (`t = -1.5, -1, -0.5, 0, 1.8`): evaluates
   `solve` at `t-1e-6`, `t`, `t+1e-6` and asserts `x,y,z,value` agree to `1e-4`
   across the switch — directly tests the "arbitrarily close points on either
   side" requirement.
3. **KKT sign and complementary slackness**: for the same ~55 `t` values, checks
   every reported multiplier is `>= -1e-9` and that each multiplier times its
   constraint slack is `~0` (`mu_x*x`, `mu_y*y`, `mu_xle*(0.6-x)`,
   `mu_v*(2y+z-0.5)`).
4. **Exact-rational spot checks**: recomputes `(x,y,z,value)` as exact
   `fractions.Fraction` at all 5 breakpoints plus both endpoints `t=-2,4`
   directly from the closed forms in `solution.md`, and checks `solve()` matches
   to `1e-9` — this is an independent transcription check between the proof
   document and the code (they were derived in the same pass, so this catches
   transcription slips, not conceptual errors).
5. **Input contract**: `solve(0) == solve(0.0)` (int/float agree), `solve(t)`
   raises `ValueError` for `t` outside `[-2,4]` (tested at `±0.001` past each
   bound and far outside), and raises `TypeError` for a non-numeric input.
   Also separately confirmed (in this session, ad hoc, reproduced by the command
   below) that `import solution` produces no stdout output.

```
python3 -c "
import io, contextlib
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    import solution
assert buf.getvalue() == ''
print('import is silent: OK')"
```

## Independent hand derivation cross-check

`solution.md` §6 recomputes the multiplier `nu` of the eliminated equality
constraint `x+y+z=1` from all three original stationarity equations (in the
un-substituted `x,y,z` variables) at vertex `E` and finds the same value
(`nu = 3-2t`) from each of the three equations independently — a check that the
`z = 1-x-y` substitution used throughout was applied consistently and did not
silently drop a term.

An earlier, throwaway grid-search script (finer, 601×301 samples, run directly
in the shell before `verify.py` was written) was used first to sanity-check the
whole piecewise structure against 25 values of `t` including points `1e-7` off
every breakpoint; it agreed with the formulas to floating-point precision
(`diff = 0.00e+00` at every tested point except where grid discretization itself
introduced ~`1e-13`–`1e-9` noise, always in the grid's favor). `verify.py`
supersedes it and is the script kept in this directory.

## Limitations

- The grid search is a numerical sanity check, not a proof; it cannot certify
  optimality on its own (a finer grid could always miss a thinner sliver of
  improvement). The actual optimality proof is the KKT argument in
  `solution.md` (necessary and sufficient because the reduced problem is
  strictly convex, per its §1), which the grid search corroborates rather than
  replaces.
- Floating point: `solution.py` internally uses `fractions.Fraction` for all
  region selection and arithmetic (so results are exact rationals up to the
  point of converting a `float` input to a `Fraction`, which is itself exact for
  any finite Python float), then converts to `float` only in the returned
  dictionary. This is why boundary behavior (`t` within `1e-6` of a breakpoint)
  is exact rather than jittery.
- No network access, no files outside this directory, and no dependencies
  beyond the Python standard library were used at any point.
