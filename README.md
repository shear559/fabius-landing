# fabius — landing page

The public site for **fabius — one set of rules above every model**.

[Website](https://fabius-landing.vercel.app) · [Rules repository](https://github.com/shear559/fabius) · [Whitepaper](fabius-as-a-system.pdf)

![Fabius — one set of rules above every model](assets/preview-rules-2026-09-09.webp)

## Content baseline

Aligned with the **3.1.0** Fabius source (whitepaper `fabius-as-a-system.pdf`, 51 pages, SHA-256 `a002c8c8d94903d33b541bcaf1f7cca65eb0acf043e684d168167035484dabd9`). The page leads with “one set of rules above every model”, retaining the green palette, Rubik typography, system map and three capability outcomes. The previously removed skill-card grids, setup split and explainer video remain absent.

Fabius supplies instructions, workflows and original local helpers for scheduling, retrieval, design and completion evidence. The host supplies the model, tools and permissions. Model marks illustrate families; they do not establish tested integration or a universal quality gain.

| Public claim | Canonical Fabius source |
| --- | --- |
| Fifteen skills and capability ownership | `README.md`, `ARCHITECTURE.md`, `skills/*/SKILL.md` |
| Installation, updates and active-session loading | `README.md`, `skills/fabius/references/skill-frontmatter.md` |
| Twenty-two core rules, mathematical assumptions and heuristics | `RESEARCH.md`, `paper/proofs.json` |
| Historical gains, regressions and missing artifacts | `BENCHMARKS.md`, `evals/verify-receipts.mjs` |
| September 10 paired mathematics, page and app trials | `assets/trials-20260910/protocol.html`, `report.html`, `runs.json` |
| September 15 showcase (twelve fresh generations on enriched briefs) | `assets/trials-20260915-showcase/protocol.html`, `report.html`, `results.json`, `all-artifacts.zip` |
| September 15 original bare-session build trials | `assets/trials-20260915-builds/protocol.html`, `report.html`, `results.json`, `all-artifacts.zip` |
| September 14 build trials (superseded: baseline context not bare; kept for the record) | `assets/trials-20260914-builds/protocol.html`, `report.html` |
| September 14 behavior trials (sixteen runs, two blind judges) | `assets/trials-20260914/protocol.html`, `report.html`, `results.json`, `all-artifacts.zip` |
| Local execution, provider processing and permission limits | `runtime/README.md`, `runtime/src/tools.mjs` |
| Content hashes, signed releases and timestamp status | `PROVENANCE.md`, `provenance/verify.sh` |

The reviewer example uses explicitly hypothetical probabilities. Its independence assumption and cost comparison are stated. Research curves are illustrative decision models, not measured performance. The page does not equate release checks with improved model quality.

## Structure and design

Static `index.html`, `styles.css` and `main.js`; no build or package installation. The page contains the hero, three capability outcomes, the interactive refinement gallery, system/research explanations, installation tabs and thirteen FAQ entries. The FAQ and its JSON-LD must remain word-for-word equivalent.

The design uses the existing green tokens (`#76b900`, with darker text variants), self-hosted Rubik, square buttons and green-on-black system diagrams. The map has sixteen nodes: router, lean core, thirteen specialists and the shared reference spine. Its twenty-eight connectors are built from the specialist table in `main.js`. On narrow screens the map scrolls inside its own container. Reduced motion renders a static diagram.

## Worked refinement gallery — September 16

`#trials` opens three newly refined products under `assets/showcase-20260916/`: Lattice, Fieldnote and an interactive exact optimization proof. It supports an initial/refined switch, phone/desktop framing, controlled walkthroughs, full-size previews and standalone ZIP downloads. Rubik is self-hosted with its OFL and checked for Hebrew/Latin coverage.

This is explicitly an iterative illustration using additional work and reference access, not a new controlled comparison. The original neutral viewer is retained at `build-study.html`. The initial artifacts are the first baseline submissions (01/05/09); original study assets are unchanged. App logic starts from run 06, then receives a new interface and targeted robustness fixes.

Measured standalone checks: website 28/28 browser scenarios, app 68/68; math 1,233/1,233 numerical probes plus 182 exact and 72 numerical certificate/solver assertions. Method, failure history, execution receipts, source and portable evaluators are linked from `assets/showcase-20260916/verification.html`.

The subsequent visual update adds colored grain and Phosphor Duotone icons to Lattice, a blue Fieldnote palette, a static green Fabius emblem glow, and a mathematically faithful equal-scale diagram with objective bands and all binding constraints highlighted at transitions. See `assets/showcase-20260916/visual-refresh.md` for source, checks and visual-review limits.

## Preserved paired artifact trials

The `build-study.html` page presents the September 15 showcase (`assets/trials-20260915-showcase/`): twelve fresh claude-sonnet-5 generations, two per condition per task. The baseline is a bare headless Claude Code session. The treatment loads Fabius 3.1.0 and explicitly requests its relevant contracts. Both receive the same enriched brief, tools and time limit. The website brief requests distinct feature states and a user-controlled product demonstration; the app adds Board/List views; the math brief adds a feasible-region diagram and a compact exact answer.

The viewer in `assets/trials-20260910/trial-lab.js` and `trial-lab.css` opens on Website, followed by App and Math. It shows both run pairs, live products and captured states, desktop/phone framing and full-size previews. Mobile switches between conditions. Mathematics loads a pinned, self-hosted KaTeX 0.18.7 copy on demand to typeset submitted equations; its MIT licence and upstream hashes are in `assets/vendor/katex-0.18.7/`. It includes the submitted diagrams, an interactive plot of actual solver samples, six regime controls, the proof, code and verification notes. Checks and methodology stay collapsed until requested.

Generated executable files are preserved. Preview wrappers add an Escape-key bridge and, for apps, an in-memory Storage stand-in; they run in an opaque-origin sandbox with restrictive headers. A full-size preview is a fresh instance. Source ZIPs contain the submitted executable bytes. Machine-specific paths in Markdown documentation are replaced with placeholders, with original and published hashes recorded in `source-transforms.json`. Captures are real browser states, not recordings of model generation.

Functional criteria, browser scenarios and parameter probes are different units. The original functional oracle is preserved and does not score every new visual requirement. The full app suite is rechecked across every app submission after correcting equivalent-wording recognition and the reset-confirmation selector; original, corrected and merged records are published. Two blinded proof judges assess eight dimensions; both must pass a dimension for it to count. Check counts are not design ratings. Ties, misses and caps remain visible. The public report and protocol link the older studies; this edition changes neither the Fabius release nor the historical whitepaper.

## Local preview and verification

```sh
python3 -m http.server 8799
```

Serve from the repository root. Before publishing, check the actual page in a browser at phone, tablet and desktop widths, including WebKit. Exercise menu, keyboard tabs, copy buttons, FAQ parity, internal links, images, console and network failures. Inspect reduced motion and verify that the PDF bytes match the Fabius artifact manifest. Test production security headers as well; a plain local server does not supply them.

A local browser result does not establish deployment. Production status and PDF bytes must be checked separately after publication.

## Publication

The existing Vercel project is linked to `main`; pushing the website can publish it. Owner approval is required before pushing. Verify the deployed HTML, scripts, stylesheet, PDF hash, console and rendered page on the exact website URL above.

`vercel.json` supplies a same-origin CSP and restricts microphone, camera and geolocation. Keep executable scripts external. Files under `assets/` are cached immutably: use a new filename for a replaced image. Root CSS and JavaScript references carry dated version suffixes when those files change. The whitepaper is served at the root and must match the corresponding Fabius release.

Public source does not imply an open-source licence. Fabius is proprietary with a personal-use installation grant; its [licence](https://github.com/shear559/fabius/blob/main/LICENSE) states the terms.
