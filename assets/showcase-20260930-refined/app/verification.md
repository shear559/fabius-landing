# September 30 verification scope

This is the September 30, 2026 refinement. Earlier browser totals have not been relabelled as evidence for these bytes.

Executed: `node --check app.js`; `node verify.mjs`.

The verifier exercises functions exported from the actual app: all eight rich fixtures, status totals, full normalization of context/deliverable fields, legacy imports with those fields absent, malformed metadata, duplicate IDs, invalid calendar dates, tag deduplication and form validation. Both HTML twins are checked for external scripts and editable detail fields.

Not verified by this builder: actual browser create/edit/filter/export/import/undo/recovery interactions, storage failure transitions, keyboard focus, phone/desktop layout, downloads or production iframe CSP. Parent integration owns browser verification. Code preservation is not claimed as browser proof.

## Visual-identity correction

The original product composition was restored after the owner rejected the flatter presentation. The current local production-header mirror passed real notebook/task interactions and both guided tours in Chromium and WebKit at 390px/2× and 1440px. The production correction is recorded separately in `../identity-browser-results.json`; the earlier all-demo browser record remains historical. No physical device is claimed.
