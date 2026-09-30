# September 30 source verification

This artifact is a September 30, 2026 product refinement. No September 16 browser totals are carried forward as verification of this version.

Executed: `node --check app.js`; `node --check model.js`; `node verify.mjs`.

The deterministic verifier checks the real notebook model: reciprocal valid links, search results, capture validation and immutability, new-note linking, idempotent links, invalid/self-link denial, source-complete draft and edited-draft export. It also checks both HTML files for external-script-only markup.

Not verified by this builder: rendered desktop/mobile appearance, browser interaction paths, download behavior and production iframe CSP. Parent integration owns the browser pass.

## Visual-identity correction

The original product composition was restored after the owner rejected the flatter presentation. The current local production-header mirror passed real notebook/task interactions and both guided tours in Chromium and WebKit at 390px/2× and 1440px. The production correction is recorded separately in `../identity-browser-results.json`; the earlier all-demo browser record remains historical. No physical device is claimed.
