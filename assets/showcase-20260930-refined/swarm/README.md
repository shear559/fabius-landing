# COHORT

A deterministic seven-agent production studio that builds an interactive Luma reading journal from inspectable contracts. Run `python3 -m http.server 8767` here and open `http://localhost:8767/index.html`. Open `product.html` for the standalone delivered reading workspace. No package installation is needed.

## Run and inspect

**Run through** dispatches the whole graph; **Run next round** steps once. Capacity 1, 2, or 3 limits concurrent tasks. Select a graph node or artifact tab to inspect its owner, input dependencies, output source, and attempt count. Preview, Source, and Gates show the composed product, emitted HTML, and review evidence.

| Task | Accepted output | Requires |
| --- | --- | --- |
| Specification | `specification.json` | Product brief |
| Interface | `interface.html` | Specification |
| Data engineer | `journal-data.json` | Specification |
| Accessibility | `access-contract.json` | Specification |
| Integration | `reading-room.html` | All three specialists |
| Review gate | `review-receipt.json` | Integration |
| Release | `release-manifest.json` | Passing review |

The interface emits the template Integration actually consumes. Data emits three fictional books and five original notes. Accessibility emits the labels used by the renderer. The delivered journal supports book selection, kind filters, saved notes, and local note creation. Its controls run real JavaScript; local edits do not rewrite the emitted build artifacts.

To exercise recovery: **Reset → Inject data fault → Run through**. The first Data candidate has a duplicate note ID; the data validator rejects it and Integration stays blocked. Inspect Data's candidate and diagnostic, then **Retry Data → Run through**. Accepted artifacts retain their identities. Only Data has a second attempt.

## Quality gate and limits

- The separate reviewer computes six checks against the actual accepted records and composed markup: data identities/references, book bindings, initial note bindings, control labels, document ID uniqueness, and absence of inline executable code. A failing receipt blocks Release.
- These are bounded data/markup contracts, not a complete accessibility or security audit. `verify.mjs` deliberately corrupts artifacts to prove the reviewer rejects them.
- This is a local deterministic simulation. Roles, graph, fixture content, and timer durations are fixed. No language model, external agent, provider, account, backend, network service, or deployment is called.
- Concurrent tasks use independent local timers. The coordinator dispatches a new round after the current round settles; it pauses on failure. Capacity is a cap. This graph has at most three independent runnable tasks.
- Everything lives in memory. Reset/reload discards local edits. Reset cancels timers and ignores stale callbacks. The download contains the same initial fixture and a completed example handoff.

## Source and verification

`product-source.mjs` holds the shared pure renderer and fixture. `quality.mjs` contains data validation and the separate review. `model.mjs` contains pure scheduler transitions. All three expose classic-script globals so opaque-origin sandbox frames can load them without module CORS. `app.js` owns the studio UI and cancellable timers; `product.js` owns the delivered product interactions.

Run `node build-delivery.mjs` to regenerate the included completed handoff files. Run `node verify.mjs`: **19 meaningful cases**, including six specialist completion orders, all three capacity limits, causal template consumption, blocked integration/release, retry identity preservation, corrupted-review rejection, reset, frozen-state purity, and a mutation control that detects uncapped dispatch. Syntax checks use `node --check` on the application scripts and pure model files.

Browser verification on 2026-09-30 used installed Playwright: Chromium at 390×844 and 1440×1080; WebKit at 390×844. All three passed complete 7/7 execution, six review results, real product controls, injected failure/retry, reset during execution, no document overflow, and no browser/network errors. Additional Chromium checks covered capacity controls, nine keyboard-navigable artifact tabs, 44px visible product controls, opaque-origin classic scripts with strict CSP and `connect-src none`, child-only scrolling, and the extracted standalone archive. Verification is local; deployment verification belongs to the host integration.

`index.html` and `preview.html` are twins except for the latter's `../demo-control.js` gallery bridge. The standalone source archive uses `index.html` and excludes this host-only wrapper. Fonts are system fonts; illustrations are local CSS. There are no external asset dependencies, inline scripts, storage calls, or application fetches. `TOUR.json` defines nine gallery scenes; checkpoint waits are 7/7 at scene 2, failed Data at scene 4, accepted Data at scene 5, and 7/7 at scene 7 (zero-based).

## Provenance

Refined on 2026-09-30 with Fabius Decor, Cohors, and Disciplina guidance. Expanded the original four-task launch fixture into seven causal handoffs, actual data and markup gates, and a composed interactive reading journal. The compact DAG, ownership inspector, and execution record retain the studio's slate/violet identity; visual richness belongs to the product's paper surfaces and illustrated book covers. This is a Fabius-assisted product build, not a controlled model comparison or live model orchestration.
