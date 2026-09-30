# Math & visualization — See the optimum move

A focused, interactive presentation of one strictly convex quadratic program. Change the incentive t or choose any of six regimes. A dominant feasible-region plot, three coordinate paths, the minimum objective curve and five slack bars all show the same computed state. The geometry uses equal units on both axes. Its clipped elliptical bands are actual objective sublevel sets, not an illustrative heatmap.

Fabius guides organizing the derivation, visualization and checks. This authored example reuses the established exact solution and proof; it is not a model comparison or a guarantee about arbitrary mathematics. Every interaction computes locally. No model call, remote service, installation or local storage is required. All assets, including the existing proof renderer, are local.

Serve the directory with any static HTTP server and open `index.html`. `preview.html` is identical except for the gallery-owned `../demo-control.js`. The exact proof, locally bundled KaTeX, original `solution.md`, Python solver and rational-arithmetic certificate verifier are included. Licenses accompany Rubik and KaTeX.

## Controls

- `#parameter`: range input, t from −2 to 4 in 0.005 increments.
- `#parameter-entry`: numeric entry; clamps to the domain and rounds to the same step. Empty input restores the current value.
- `#regime-select`: six regimes, values `0`–`5`; selects an interior sample.
- `#geometry`: pointer inspection or focused arrow keys compare a point's objective with the current minimum. Outside points are identified explicitly.
- `#certificate-state`: idempotently opens the current numerical certificate. Native summary `#certificate-toggle` also opens/closes it.
- `proof.html`: the complete exact derivation, formulas and optimality proof.

No automatic animation runs. Reduced-motion mode keeps every interaction available. The five transitions retain all binding constraints, including boundaries whose multipliers are zero at the join. Supporting values use three decimal places; certificate residuals retain scientific notation.

## Execute the checks

```sh
node verify.mjs
python3 verify.py
MATH_QA_DIR=/tmp/focused-math-qa node verify-browser.mjs
```

`model.mjs` is pure and importable by Node. Its six coordinate and multiplier formulas are preserved from the prior exact proof. `verify.mjs` independently minimizes the reduced quadratic over every boundary segment and the feasible unconstrained stationary point at 6,001 parameters. It also checks joins, derivatives, invalid inputs and portable/preview parity, then runs the original Python verifier. The Python solver evaluates the formulas with floating-point arithmetic; `verify.py` separately proves polynomial KKT identities and interval signs with `fractions.Fraction`.

The optional browser verifier uses an existing Playwright installation plus Chrome and WebKit. Set `PLAYWRIGHT` to an installed module path if needed. It tests 390px before 1440px, all regimes/joins, actual SVG scale, controls, keyboard probe, certificate/proof rendering, overflow, console and network. Screenshots and browser results go outside the repository through `MATH_QA_DIR`; nothing is installed.

The six short tour steps use the host's 3,400ms cadence. The final certificate action is safe to repeat. Source archives, the gallery bridge, production CSP and live deployment checks are integrated by the host project.
