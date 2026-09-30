# Optimization explorer

A deterministic interactive worked example for one strictly convex quadratic program. Change the parameter to explore the feasible polygon, the unique optimum, all three coordinate paths, the active constraints, multiplier values and numerical KKT residuals.

Open `index.html` through a static HTTP server. No build, network service or installation is required. `proof.html` contains the exact derivation and locally bundled KaTeX. `solution.py` is an independent exact-arithmetic implementation; `verify.py` checks its certificate.

```sh
python3 -m http.server 8799
python3 verify.py
```

The September 30 refinement replaces the presentation and adds synchronized coordinate paths, editable parameter entry, constraint slack table, residual inspection and an exact regime table. The six original solution formulas and exact solver are unchanged. This is a revised demonstration made with Fabius, not a new controlled model comparison.

The gallery-specific preview bridge is excluded from the portable source archive. Rubik and KaTeX include their license files.
