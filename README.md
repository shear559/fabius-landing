# fabius — landing page

The public site for **fabius — one set of rules above every model**.

[Website](https://fabius-landing.vercel.app) · [Rules repository](https://github.com/shear559/fabius) · [Whitepaper](fabius-as-a-system.pdf)

![Fabius — one set of rules above every model](assets/preview-rules-2026-09-09.webp)

## Content baseline

Aligned with the **3.2.0** Fabius source (whitepaper `fabius-as-a-system.pdf`, 51 pages, SHA-256 `67c3634f1375ac28a0c9c8307ce4fedd12b2daddadf4a69d2f6c8b46db1e021e`). The page leads with “one set of rules above every model”, retaining the green palette, Rubik typography, system map and three capability outcomes. The previously removed skill-card grids, setup split and explainer video remain absent.

Fabius supplies instructions, workflows and original local helpers for scheduling, retrieval, design and completion evidence. The host supplies the model, tools and permissions. Model marks illustrate families; they do not establish tested integration or a universal quality gain.

| Public claim | Canonical Fabius source |
| --- | --- |
| Fifteen skills and capability ownership | `README.md`, `ARCHITECTURE.md`, `skills/*/SKILL.md` |
| Installation, updates and active-session loading | `README.md`, `skills/fabius/references/skill-frontmatter.md` |
| Twenty-two core rules, mathematical assumptions and heuristics | `RESEARCH.md`, `paper/proofs.json` |
| Historical gains, regressions and missing artifacts | `BENCHMARKS.md`, `evals/verify-receipts.mjs` |
| September 21 skill lab (one real run per skill, with its checks) | `assets/skills-20260921/data.json`, `runs/<skill>/`, `harness/`, `checks/` |
| September 10 paired mathematics, page and app trials | `assets/trials-20260910/protocol.html`, `report.html`, `runs.json` |
| September 15 showcase (twelve fresh generations on enriched briefs) | `assets/trials-20260915-showcase/protocol.html`, `report.html`, `results.json`, `all-artifacts.zip` |
| September 15 original bare-session build trials | `assets/trials-20260915-builds/protocol.html`, `report.html`, `results.json`, `all-artifacts.zip` |
| September 14 build trials (superseded: baseline context not bare; kept for the record) | `assets/trials-20260914-builds/protocol.html`, `report.html` |
| September 14 behavior trials (sixteen runs, two blind judges) | `assets/trials-20260914/protocol.html`, `report.html`, `results.json`, `all-artifacts.zip` |
| Local execution, provider processing and permission limits | `runtime/README.md`, `runtime/src/tools.mjs` |
| Content hashes, signed releases and timestamp status | `PROVENANCE.md`, `provenance/verify.sh` |

The reviewer example uses explicitly hypothetical probabilities. Its independence assumption and cost comparison are stated. Research curves are illustrative decision models, not measured performance. The page does not equate release checks with improved model quality.

## Structure and design

Static `index.html`, `styles.css` and `main.js`; no build or package installation. The page contains the hero, three capability outcomes, the fifteen-skill lab, system/research explanations, installation tabs and thirteen FAQ entries. The FAQ and its JSON-LD must remain word-for-word equivalent.

The design uses the existing green tokens (`#76b900`, with darker text variants), self-hosted Rubik, square buttons and green-on-black system diagrams. The map has sixteen nodes: router, lean core, thirteen specialists and the shared reference spine. Its twenty-eight connectors are built from the specialist table in `main.js`. On narrow screens the map scrolls inside its own container. Reduced motion renders a static diagram.

## Fifteen-skill lab — September 21

`#trials` shows every Fabius skill on a task it was built for: one fresh headless Claude Code session per skill (claude-sonnet-5, Claude Code 2.1.275, only the Fabius 3.2.0 plugin loaded, web tools off, a fresh working folder each time). The council run uses the shipped `concilium` script with three seats and a chairman; its first attempt lost a seat to a usage limit and is published beside the second.

- **Router widget.** `assets/skills-20260921/runtime/route.mjs` is a byte-identical copy of the plugin's `runtime/src/route.mjs`, with two browser stand-ins (`providers.mjs`, `config.mjs`). Typing a task shows the skills, the capability rung and the model tier, and lights the matching tiles.
- **Stage.** Each run shows its brief word for word, its outputs, the rules the skill held to, the checks run afterwards, every file it wrote and a replay of its tool steps. Live pages (decor, ludus) run in sandboxed frames; every model output is inserted as text, never markup. The catena seal is recomputed in the browser (SHA-256 leaves, Merkle root, Ed25519 over the root); editing any byte breaks it.
- **Honesty rules.** Outputs are shown as the run left them. Checks live in `harness/checks.py` and write `checks/<skill>.json`; hidden oracles and planted truth sit in `truth/`. Misses stay visible (scientia called no genes; disciplina left the half-cent rounding rule flagged but unfixed). The praesidium prototype-key bypass was found by the run; the probe that confirms it was added afterwards and is labelled that way.
- **Rebuild.** `harness/run.sh <skill>` reruns one session; `harness/checks.py` reruns the checks; `harness/build.py` writes `data.json` and `runs/`, masking machine paths, the account name and anything passed in `MASK_NAMES`, and prints how many leaks remain (it must read 0). The catena demo private key is never copied.
- **Headers.** `vercel.json` serves the lab with must-revalidate caching, `.mjs` as JavaScript, run files as sandboxed plain text, and the two live pages under a frame-only CSP.

The earlier refinement gallery (`assets/showcase-20260916/`) is no longer linked from the page; its files and verification notes remain deployed at their old paths.

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
