# Verification record

The checks below were executed successfully in this task directory using **Python 3.9.6**, with only the Python standard library. The mathematical derivation and global certificate are in `solution.md`; the implementation is `solution.py`. The additional file `verify.py` reproduces the checks without external data, dependencies, or network access.

## Reproduce

From the directory containing these files, run:

```sh
python3 --version
python3 verify.py
```

The verification command exited with status 0 and printed:

```text
PASS: independent polygon has 5 vertices and 5 edges
PASS: 18 exact polynomial-certificate points across 6 closed regimes
PASS: all 5 transitions match in optimizer, value, multipliers, and value derivative
PASS: 2091 exact rational geometric-oracle comparisons
PASS: 2963 floating-point geometric-oracle comparisons
max coordinate error: 1.1102230246251565e-16
max optimal-value error: 8.8817841970012523e-16
max value/objective discrepancy: 1.3322676295501878e-15
max feasibility residual: 1.1102230246251565e-16
PASS: 7 integer inputs; 11 rejected invalid inputs; silent import and guarded module execution
```

## What was checked

1. **Independent exact geometric oracle.** Using `fractions.Fraction`, the script intersects every pair of the five reduced constraint lines and retains feasible intersections. It derives all five edges from those vertices. For each parameter, it compares all vertices, the exact stationary minimum of the objective on every edge (clamped to the edge's endpoints), and the unconstrained stationary point if feasible. These candidates exhaust the polygon: any minimum is either interior, in an edge's relative interior, or a vertex. The oracle evaluates the original three-variable objective and does not use the proposed transition values or regime selection to choose its answer. It also checks that all candidates attaining the minimum have the same coordinates.

2. **Exact formulas and KKT identities.** At the two endpoints and midpoint of each of the six regimes, the script checks exact feasibility, `z >= 3/10`, multiplier nonnegativity, all three original stationarity equations, every complementary-slackness product, and equality between the original objective and the stated value. Every identity being checked is a polynomial in `t` of degree at most two, so agreement at three distinct points certifies each polynomial identity throughout that regime. Feasibility expressions and multipliers are affine, so their endpoint signs certify the whole closed regime. These algebraic checks supplement the explicit proof in `solution.md`.

3. **Transition matching.** At all five rational transition values, both neighboring formulas agree exactly in all coordinates, the optimal value, and every KKT multiplier. Their value derivatives also agree exactly and equal `-2*x`. Both outer interval endpoints are checked by the regime-certificate and oracle tests.

4. **Exact rational comparisons.** The 2,091 distinct parameters comprise a uniform grid of 1,501 points over the closed interval, all boundaries, and points `boundary +/- 10**(-k)` for `k = 1,...,60` that remain in the interval, with duplicates removed. The exact formulas and KKT certificate agree with the exact geometric oracle at every point.

5. **Floating-point implementation.** The 2,963 distinct inputs comprise floating-point conversions of the exact test set, 1,000 pseudorandom uniform inputs with seed `20260910`, and the first 20 representable neighbors in each direction from every transition and outer endpoint, restricted to the interval. This includes the smallest positive and negative subnormal floats next to zero. For each input, the oracle receives `Fraction.from_float(t)`, preserving the precise input value rather than a rounded decimal interpretation. The checks cover required dictionary keys, finite numeric outputs, coordinates and value against the oracle, the original objective evaluated at the returned point, and every feasibility condition. All use an absolute acceptance tolerance of `2e-14`; observed maxima are shown above. The solver itself uses no tolerance bands.

6. **API and import behavior.** All seven integer inputs from -2 through 4 agree with their float equivalents. Six invalid numeric inputs (including NaN, both infinities, and an enormous integer) raise `ValueError`; five invalid types raise `TypeError`. A direct import captures no stdout or stderr. A separate Python process with closed input also imports silently and exits successfully. Executing the module definitions with `open`, `input`, and `print` replaced by functions that raise confirms that the module executes none of those operations. Source inspection confirms no CLI, imports, or external-file reads in `solution.py`.

## Limits

`solve` returns ordinary binary floating-point numbers, so exact rational coordinates and objective values may incur rounding; displacements below representable spacing can round away. The recorded feasibility residual is rounding, not a change in the mathematical constraints. Finite sampled oracle comparisons alone do not prove a continuum claim: the complete-interval guarantee comes from the exact convexity/KKT proof and the affine-sign and polynomial-identity checks described above. No numerical optimizer, third-party symbolic system, browser, or external service was used or needed. No background process was started.
