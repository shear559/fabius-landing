# Visual refinement — September 16, 2026

This is a further iteration on the illustrative worked refinements. It is not a new paired trial or a measurement of causal uplift. Original study submissions and scores remain unchanged.

## What changed

- **Lattice:** colored grain on the product composition, feature stage and Studio plan; a consistent inlined Phosphor Duotone icon family, with its MIT license in the standalone source. The grain tile is deterministic monochrome noise; color comes from the product's own gradients.
- **Fieldnote:** cobalt controls, a sky-to-violet project panel, a blue orbital illustration and blue/teal status surfaces. Data handling and the standalone storage model are unchanged.
- **Mathematics:** equal units on both axes, a pentagon generated from the actual constraint vertices, objective sublevel bands and labeled constraint edges. The orange highlight is calculated from constraint slack, including binding constraints whose multiplier is zero at a transition. A color key gives objective value above the current minimum; its intervals match the discrete bands. The optimum trajectory and mini value curve come from the same verified solver.
- **Fabius:** a sharp spiral emblem with a static green halo in the navigation, hero product panel and footer. There is no idle pulse or scale animation.

## Why the plot is the problem

After eliminating z, the objective is

`g(x,y) = 4x² + 8xy + 6y² − (5 + 2t)x − 3y + 4`.

Its unconstrained center is `c = (9/8 + 3t/4, −1/2 − t/2)`. For displacements `(dx,dy)` from that center,

`g(c + (dx,dy)) − g(c) = 4(dx + dy)² + 2dy²`.

Every colored contour is generated from this identity, clipped to the actual feasible pentagon. The maximum over this convex polygon is obtained at a vertex; that sets the upper end of the color key. Colors rescale with the displayed minimum and maximum for each parameter value. They do not mark unrelated categories or invented confidence levels.

## Checks and limits

- Website functional suite: **28/28** scenarios across Chromium and WebKit at 360/1440 CSS pixels.
- App functional suite: **68/68** scenarios across the same engines and widths.
- Gallery integration: **279/279** checks, including solver-backed browser probes, sandboxed walkthroughs, keyboard interaction, no-JavaScript/reduced-motion behavior and console/network checks.
- Visual and geometry checks: **92/92** checks across Chromium and WebKit at 390/1440 CSS pixels. They evaluate every rendered contour point against the original objective, equal screen scale, feasibility and binding constraints at thirteen parameter positions including every transition. Screenshot review remains separate from these numerical assertions.

The visual pass caught a WebKit artifact in layered transparent radial gradients on the blue app panel. The final panel uses a continuous linear color field and a small local grain tile. A subsequent targeted screenshot pass checks this correction. Green functional checks alone did not establish visual correctness.

The exact Python solver and certificate are unchanged from the earlier verified version. Earlier solver receipts remain historical and are not counted as a fresh run. Browser engine checks are not physical iPhone tests, aesthetic scores or user research.

Execution records: `evidence/visual-refresh-website.json`, `visual-refresh-app.json`, `visual-refresh-geometry.json` and `visual-refresh-integration.json`. Reproduction: `verification-tools/visual-refresh.mjs`, plus the existing functional and integration tools. The manifest records the final downloadable file bytes.

Icon source: https://github.com/phosphor-icons/core/tree/main/assets/duotone . License: `website/PHOSPHOR-LICENSE.txt`.
