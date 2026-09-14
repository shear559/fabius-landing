# Executed verification

The deliverables are `solution.md` (exact formulas and proof), `solution.py`
(the callable implementation), and `verify_solution.py` (the reproducible
verification script). This file records the checks actually run.

Run from the directory containing these files:

```sh
python3 --version
python3 -B verify_solution.py
```

The interpreter reported `Python 3.9.6`. The final verification run exited
with status 0 and printed:

```text
PASS: syntax and silent, I/O-free module import
PASS: exact oracle enumerated 5 vertices and 5 edges plus interior
PASS: 1241 exact rational formula, value, and KKT checks
PASS: 7769 float comparisons with exact geometric oracle
PASS: endpoints, transitions, 64 nextafter steps on each available side
PASS: exact boundary active sets, zero multipliers, and value C1 matching
PASS: integer inputs and 14 invalid-input cases
Maximum coordinate absolute error: 1.1102230246251565e-16
Maximum value absolute error: 8.8817841970012523e-16
Maximum constraint violation: 1.1102230246251565e-16
```

An earlier run, before adding explicit boundary active-set and value
derivative assertions to the verifier, also passed with these same counts
and error maxima. The output above is from the final version.

## What was checked

The independent geometric oracle uses `fractions.Fraction`. It constructs
the polygon vertices from pairwise intersections of the original reduced
inequality lines and filters them for feasibility. It identifies all five
edges by their shared tight inequalities. For each parameter it evaluates
every vertex, the exact constrained minimum of the quadratic on every edge,
and the unconstrained stationary point when feasible. It selects the least
original-objective value from these candidates. The oracle does not use the
claimed transition values or the piecewise optimizer. This enumeration is
complete: an interior minimum is stationary, and a boundary minimum lies on
one of the enumerated closed edges.

The 1,241 rational cases comprise the grid with spacing `1/200` throughout
`[-2,4]`, all exact transitions, and points on both sides of each transition
at distances `10**(-k)` for `k` in `1, 2, 6, 12, 30, 100`, with duplicates
removed. For each case the script checks, with exact equality:

- Agreement of the documented optimizer and value with the geometric oracle.
- The equality constraint and all inequality constraints.
- Nonnegativity of every inequality multiplier and complementary slackness.
- All three original-variable KKT stationarity equations.
- The original objective evaluated at the documented point.

Separate exact assertions check the full active set and the active
constraints with zero multipliers at every transition. Adjacent value
polynomials and their first derivatives are checked for equality at all
five transitions; their second derivatives are checked to differ. The
identity `V'(t) = -2*x(t)` is also checked at the endpoints and midpoint of
every regime using rational arithmetic.

The 7,769 distinct float cases comprise a grid with spacing `0.001`, 1,000
pseudorandom inputs generated with seed `20260910`, the endpoints and
floating-point transition representations, and 64 successive
`math.nextafter` steps in each direction from those anchors when in range.
This includes positive and negative subnormal parameters adjacent to zero.
Each float is converted to its **exact binary rational value** before being
passed to the oracle; there is no rounded decimal reinterpretation of the
parameter. In particular, the actual float `1.8` lies just above exact `9/5`.

For these cases the script checks dictionary keys and finite numeric
outputs, all constraints, all three coordinates against the oracle, and
both the optimal value and direct evaluation of the original objective.
The assertion tolerances are `2e-15` for coordinates, `5e-15` for the value,
and `5e-16` for feasibility. The maxima printed above are measured in
ordinary binary64 arithmetic; feasibility uses the maximum of the absolute
equality residual and the positive parts of the inequality violations.

All seven integer inputs in the interval are checked against their float
equivalents. Eight invalid numeric inputs (including NaN, both infinities,
a huge integer, and the adjacent floats outside the closed interval) must
raise `ValueError`. Six unsupported types must raise `TypeError`.

The module source is compiled for syntax checking and inspected with `ast`
to confirm its only top-level statements are its docstring and the undecorated
function definition with no default arguments or return annotation. A fresh
Python interpreter imports it with `builtins.open` and `builtins.input`
replaced by functions that fail if called. That process exits successfully
with empty stdout and stderr. Ordinary Python import-loader access to the
module itself is, of course, necessary. The module has no CLI or external
data dependencies.

## Limits

Finite sampling cannot prove the assertion for all real parameters.
`solution.md` supplies that proof through exact formulas, nonnegative KKT
certificates on entire closed intervals, and strict convexity. The checks
provide an independent implementation cross-check for this one problem.

`solve(t)` uses binary64 arithmetic rather than symbolic output. Coordinates,
values, and equality or inequality residuals can therefore differ from exact
real arithmetic by rounding; sufficiently small positive coordinates can
underflow to zero. The function is specified for Python `int` and `float`
inputs, not `Fraction` or `Decimal`. No external packages, network services,
external data files, or numerical optimization libraries were used. No
background server was started. Browser checks were not needed for these
Markdown and Python artifacts.
