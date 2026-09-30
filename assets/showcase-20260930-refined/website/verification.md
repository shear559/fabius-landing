# September 30 source verification

This artifact is a September 30, 2026 product refinement. No September 16 browser totals are carried forward as verification of this version.

Executed: `node --check app.js`; `node --check model.js`; `node verify.mjs`.

The deterministic verifier checks the real notebook model: reciprocal valid links, search results, capture validation and immutability, new-note linking, idempotent links, invalid/self-link denial, source-complete draft and edited-draft export. It also checks both HTML files for external-script-only markup.

Not verified by this builder: rendered desktop/mobile appearance, browser interaction paths, download behavior and production iframe CSP. Parent integration owns the browser pass.
