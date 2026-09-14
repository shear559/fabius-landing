# Verification record

Executed locally with **Python 3.9.6**, using only the Python standard
library. No numerical optimization package, internet access, external
data, or hidden evaluation material was used.

## Reproduce the functional checks

From the directory containing the delivered files, run:

```sh
python3 --version
python3 -B verify_solution.py
```

The verification script uses `fractions.Fraction` for an independent exact
geometric oracle. It intersects all pairs of constraint lines, filters
the resulting feasible vertices, identifies all five polygon edges, and
minimizes the quadratic on each closed edge. It also checks the
unconstrained stationary point when feasible. The quadratic coefficients
are recovered by evaluating the original objective, not by copying the
piecewise optimizer. The least objective among these candidates is the
exact global optimum: an optimum in the polygon interior is stationary,
and any boundary optimum lies on one of its enumerated closed edges.

The script performs these checks:

- **18 exact certificate evaluations:** both endpoints and the midpoint
  of each regime. It checks feasibility, all multiplier signs, all three
  original KKT stationarity equations, complementary slackness, exact
  objective values, and agreement with the geometric oracle. Because
  coordinates, slacks, and multipliers are affine in the parameter,
  endpoint signs establish interval-wide signs. Stationarity is affine;
  complementary products and objective identities are at most quadratic,
  so three distinct exact evaluations establish those identities.
- **All five boundary joins:** adjacent optimizer, multiplier, and value
  formulas agree exactly. The coordinate join also checks matching
  derivatives through the displayed identity $V'=-2x^*$.
- **1,201 rational grid points:** exact formula/oracle comparison at
  $t=-2+k/200$, for $k=0,\ldots,1200$, including every transition.
- **3,341 int/float cases:** the corresponding float grid; every integer
  in the domain; 2,000 pseudorandom parameters with seed `20260910`; all
  transitions and endpoints; up to four successive `math.nextafter`
  neighbors in each direction; offsets of $10^{-2},10^{-5},10^{-10},
  10^{-14},10^{-15},10^{-16}$; signed zero; and positive and negative
  minimum subnormal floats. The oracle uses the exact rational value of
  each input float. Coordinate and value tolerances are `2e-15` and
  `5e-15`. Separate assertions check feasibility, finite numeric outputs,
  dictionary keys, and reevaluation of the original objective.
- **Input validation:** eight invalid values, including nonfinite values,
  floats immediately outside the domain and a huge integer; six invalid
  types.
- **Import behavior:** silent import with application file-open and input
  functions blocked, plus a fresh-process silent import.
- **Negative control:** the oracle comparison correctly rejects a
  feasible but nonoptimal constant solution at $t=1$.

Actual output:

```text
PASS: import is silent; execution performs no application file reads or input
PASS: 18 exact certificate evaluations; all 5 boundary joins
PASS: 1201 rational grid points against the exact geometric oracle
PASS: 3341 int/float cases against the exact geometric oracle
Maximum coordinate error: 1.1102230246251565e-16
Maximum value error: 4.4408920985006262e-16
PASS: 8 invalid values and 6 invalid types rejected
PASS: negative control rejects a feasible nonoptimal point
ALL CHECKS PASSED
```

## Additional executed checks

The following syntax and Markdown source checks also passed:

```sh
python3 -B - <<'PY'
import ast
from pathlib import Path
for name in ('solution.py', 'verify_solution.py'):
    ast.parse(Path(name).read_text(), filename=name)
    print('PASS: syntax', name)
s = Path('solution.md').read_text()
assert not any(ord(ch) < 32 and ch not in '\n\t' for ch in s)
display = False
for line in s.splitlines():
    if line == '$$':
        display = not display
    elif not display:
        assert line.count('$') % 2 == 0, line
assert not display
print('PASS: solution.md math delimiters and control characters')
PY
```

Actual output:

```text
PASS: syntax solution.py
PASS: syntax verify_solution.py
PASS: solution.md math delimiters and control characters
```

The solution text was also read back and reviewed for the exact regime
formulas, multiplier sign convention, active sets, endpoints, and value
regularity. `solution.md` provides the mathematical proof over the entire
closed real interval; finite sampling is supplementary evidence.

## Limits and delivered files

The Python result uses ordinary binary floating-point arithmetic, so its
coordinates and objective are rounded; subnormal calculations can
underflow. The checks do not enumerate every possible float or real
parameter. Correctness over the continuum follows from the exact
certificates and strict-convexity proof, not from numerical samples.
Only Python 3.9.6 was executed. No browser rendering check was needed or
performed for these Markdown and Python artifacts; Markdown source
delimiters were checked as recorded above.

Delivered: `solution.md`, `solution.py`, `verify_solution.py`, and this
`verification.md`. No background server was started.
