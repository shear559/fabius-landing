Fieldnote Board is complete and verified in `[study]/runs/run-07/work/`.

**Files delivered:** `index.html`, `styles.css`, `app.js` (single IIFE, no deps), `README.md`. `BRIEF.md` untouched.

**Verification performed:** Wrote a Playwright harness (in the designated `playwright-qa` dir, served the app from a nested path via `python3 -m http.server`, deleted the harness after) and ran 40 assertions against the real DOM/localStorage/storage-events/downloads — all passing. Covered: seed shape (8 tasks/3 projects/all statuses), create with tag trim+dedupe+cap, field validation (blank/overlong title) with modal staying open, cancel, Escape+focus-restore, edit preserving other records, status change via card control, combined search+filter to no-results, delete+undo+persistence-across-reload, export (full board incl. filtered-out), import (valid replace, atomic rejection of bad enum/invalid date/malformed JSON, cancelled-confirm no-op), corrupt-storage recovery (byte-exact preservation, download, reset→reseed), a genuine two-tab conflict (second tab's write triggers banner in first tab, blocks mutation, reload picks up the write), and `prefers-reduced-motion` collapsing animation. Screenshotted at 360px and 1440px and reviewed the layout.

**One real bug found and fixed during testing:** `.modal-overlay { display: flex }` (and similarly for other toggled panels) was beating the browser's default `[hidden]{display:none}` rule at equal specificity, so setting `.hidden = true` wasn't actually hiding the modal — it stayed clickable/interceping pointer events. Fixed with a global `[hidden]{display:none!important}` rescue rule in `styles.css`.

**Design decisions worth flagging:**
- Cross-tab conflict handling: block-and-reload (`location.reload()`) rather than a live merge — simplest provably-safe reconciliation, per the brief's explicit allowance.
- `<input type="date">` structurally can't hold impossible calendar dates (e.g. Feb 30) via the picker, so the app's own `isValidDateString` check is exercised in practice through the JSON import path (same validator used by both).
- Storage-write failures never claim success: create/edit keeps the modal open with the user's typed values; delete/status/undo/import roll back rather than diverge from what's actually persisted.

Full data-model, error-handling rationale, and the complete list of executed checks are written up in `README.md`.