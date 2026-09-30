# September 30 verification scope

This is the September 30, 2026 refinement. Earlier browser totals have not been relabelled as evidence for these bytes.

Executed: `node --check app.js`; `node verify.mjs`.

The verifier exercises functions exported from the actual app: all eight rich fixtures, status totals, full normalization of context/deliverable fields, legacy imports with those fields absent, malformed metadata, duplicate IDs, invalid calendar dates, tag deduplication and form validation. Both HTML twins are checked for external scripts and editable detail fields.

Not verified by this builder: actual browser create/edit/filter/export/import/undo/recovery interactions, storage failure transitions, keyboard focus, phone/desktop layout, downloads or production iframe CSP. Parent integration owns browser verification. Code preservation is not claimed as browser proof.
