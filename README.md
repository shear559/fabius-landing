# fabius — landing page

The public site for **fabius — one set of rules above every model**.

[Website](https://fabius-landing.vercel.app) · [Rules repository](https://github.com/shear559/fabius) · [Whitepaper](fabius-as-a-system.pdf)

![Fabius — one set of rules above every model](assets/preview-rules-2026-09-09.webp)

## Content baseline

Aligned with the **3.0.1** Fabius source. The page leads with “one set of rules above every model”, retaining the green palette, Barlow typography, system map and three capability outcomes. The previously removed skill-card grids, setup split and explainer video remain absent.

Fabius supplies instructions, workflows and original local helpers for scheduling, retrieval, design and completion evidence. The host supplies the model, tools and permissions. Model marks illustrate families; they do not establish tested integration or a universal quality gain.

| Public claim | Canonical Fabius source |
| --- | --- |
| Fifteen skills and capability ownership | `README.md`, `ARCHITECTURE.md`, `skills/*/SKILL.md` |
| Installation, updates and active-session loading | `README.md`, `skills/fabius/references/skill-frontmatter.md` |
| Twenty-two core rules, mathematical assumptions and heuristics | `RESEARCH.md`, `paper/proofs.json` |
| Historical gains, regressions and missing artifacts | `BENCHMARKS.md`, `evals/verify-receipts.mjs` |
| September 10 paired mathematics, page and app trials | `assets/trials-20260910/protocol.html`, `report.html`, `runs.json` |
| Local execution, provider processing and permission limits | `runtime/README.md`, `runtime/src/tools.mjs` |
| Content hashes, signed releases and timestamp status | `PROVENANCE.md`, `provenance/verify.sh` |

The reviewer example uses explicitly hypothetical probabilities. Its independence assumption and cost comparison are stated. Research curves are illustrative decision models, not measured performance. The page does not equate release checks with improved model quality.

## Structure and design

Static `index.html`, `styles.css` and `main.js`; no build or package installation. The page contains the hero, three capability outcomes, the paired trial explorer, system/research explanations, installation tabs and thirteen FAQ entries. The FAQ and its JSON-LD must remain word-for-word equivalent.

The design uses the existing green tokens (`#76b900`, with darker text variants), self-hosted Barlow, square buttons and green-on-black system diagrams. The map has sixteen nodes: router, lean core, thirteen specialists and the shared reference spine. Its twenty-eight connectors are built from the specialist table in `main.js`. On narrow screens the map scrolls inside its own container. Reduced motion renders a static diagram.

## Paired artifact trials

The `#trials` section reads the published `assets/trials-20260910/results.json`. Its external `trial-lab.css` and `trial-lab.js` provide task tabs, both repeated pairs, a mobile condition switch, an actual-sample math plot, captured walkthroughs and inspectable checks. The report includes every generated source artifact and its recorded usage. The control retains native Codex instructions; the treatment adds the pinned Fabius 3.0.1 contracts and reference resources.

A separate expandable view describes actual planning, tool use, verification and correction sequences from each trace. This process audit was requested after outcomes existed and is explicitly retrospective and unblinded. It has no score. Delegation and external services were unavailable in both conditions, so the study does not claim to measure the full orchestration surface.

The three briefs cover a six-regime constrained optimization problem, the fictional Lattice landing page, and the Fieldnote Board local-first application. Functional criteria, parameter probes and repeated browser configurations are different units; none is an overall quality percentage. Proof and design reviews are explicitly identified as blinded agent assessments. Ties, failed criteria, time caps and infrastructure attempts remain visible in their respective records.

Animations advance through actual captured states or recorded math samples only. They require a user action, can be paused, and respect reduced motion. They are labelled as composed walkthroughs, not recordings of model generation. Source ZIPs provide the generated products; their JavaScript is not executed on the main site's origin. Public text files normalize private machine paths, with original/public hashes and a redaction list in each run receipt. The dated study does not change the source release or the historical whitepaper.

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
