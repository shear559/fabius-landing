# Executed verification

The checks below ran successfully in this task directory with **Python 3.9.6**, using only the standard library. The executable verifier is `verify.py`; its captured output is `verification-output.txt`.

Reproduce the complete check:

```sh
python3 -B verify.py
```

The commands actually executed to capture the results and identify the interpreter were:

```sh
python3 -B verify.py > verification-output.txt
cat verification-output.txt
python3 --version
```

The captured result was:

```text
Exact certificates: 6 full regimes; 5 boundary matches and active sets PASS
Exact geometric oracle: 1240 rational parameters PASS
Floating-point geometric oracle: 4224 parameters PASS
Max coordinate error: 1.1102230246251565e-16
Max value error: 4.4408920985006262e-16
Max feasibility residual: 5.5511151231257827e-17
Integer inputs and invalid-input handling PASS
Quiet import and absence of module-level I/O/CLI execution PASS
ALL CHECKS PASSED
```

## What was checked

1. **Exact certificates over all six regimes.** The verifier represents the documented optimizer, value, and multiplier formulas with `fractions.Fraction`. For each closed regime it checks both endpoints and the midpoint: feasibility, the equality, dual nonnegativity, complementary slackness, all three original stationarity equations, the original objective against the value polynomial, and `V'(t) = -2x(t)`. Each sign constraint is affine in the parameter, so endpoint signs establish its sign throughout that regime. Each identity is polynomial of degree at most two, so equality at three distinct rational points establishes that identity throughout the regime. This part is an exact algebraic check, not an approximate numerical fit.

2. **All transition boundaries.** At each of the five exact rational transitions, the adjacent optimizer, value, and complete multiplier formulas match exactly. Adjacent value derivatives match exactly. The set of zero inequality functions matches the documented active set, including active constraints whose multipliers vanish. Domain endpoints are included in the closed-regime checks.

3. **Independent geometric oracle.** The verifier starts from the five reduced affine inequalities, derives feasible vertices from all pairwise boundary intersections, and obtains all five edges. For each parameter it evaluates all vertices, the minimum of the quadratic restricted to each entire edge, and the unrestricted stationary point when feasible. It selects the least objective using exact rational arithmetic. This oracle does not use the solution's parameter transitions or piecewise optimizer formulas. The certificate formulas matched it exactly for 1,240 distinct rational parameters: a uniform grid, reproducible random fractions, all boundaries, and offsets as small as `1/10**100` on both sides of the transitions.

4. **Actual `solve(t)` behavior.** The returned coordinates and value were compared with the geometric oracle evaluated at the exact rational value of each input float, using `Fraction.from_float`. The 4,224 distinct inputs include a uniform grid, seeded random values, rational test points converted to floats, both domain endpoints, each transition's floating representation, eight successive representable neighbors in both directions where in the domain, and small positive/negative parameters near zero. Coordinate error was required to be at most `3e-15`, value error at most `1e-14`, and feasibility residual at most `5e-16`. The observed maxima are above. The feasibility residual is the maximum of the equality's absolute residual and each positive inequality violation, measured in ordinary floating-point arithmetic.

5. **API and import behavior.** Every returned required field was finite. All integer inputs in the interval agreed with their floating counterparts. Out-of-range inputs, infinities, NaN, and a very large integer raised `ValueError`; unsupported types raised `TypeError`. A fresh subprocess imported `solution` with stdin disconnected and captured stdout/stderr; it exited successfully with both streams empty. AST inspection confirmed that the module contains only a docstring, the standard-library `math` import, and an undecorated function definition with no defaults: no module-level CLI or file-reading calls execute.

The derivation and tables in `solution.md` were also reviewed against the exact formulas in the verifier. Its exhaustive fixed-coordinate reduction and positive-definite-Hessian/KKT argument provide the proof for all real parameters; the floating-point sample checks are supplementary evidence.

A final artifact read-back confirmed that all five output files were present and nonempty. Both Python sources also passed in-memory compilation with `compile(source, filename, "exec")`; this created no bytecode files.

## Limits

`solution.py` returns binary64 floating-point approximations, not symbolic rational numbers. Constraints can have residuals of a few rounding units; the measured maximum was about `5.55e-17`. At parameters extremely close to a transition, coordinates can round to their boundary values. In particular, dividing a smallest positive subnormal input by 18 can underflow to zero. There is no artificial tolerance band in branch selection.

The floating-point checks are finite and are not an enumeration of every representable input. The algebraic proof covers every real parameter in the full closed interval, while the exact polynomial certificate checks validate the documented formulas on every regime. Only Python 3.9.6 was executed; no claim is made about testing other interpreter versions. No external optimization packages, network resources, or hidden evaluation material were used.
