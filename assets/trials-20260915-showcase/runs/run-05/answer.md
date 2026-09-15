Final deliverable is in place: `index.html`, `styles.css`, `app.js`, and `README.md`, with `BRIEF.md` untouched.

**Fieldnote Board** — a local-first task app for a fictional research-publication team ("Trail Data Atlas"), meeting the full functional contract:

- localStorage persistence (`fieldnote-board:v1`), seeded with 8 tasks / 3 projects / all statuses on genuinely empty storage only
- Create/edit/delete with undo, status changes, search + status/project/priority filters with a live count and no-results state
- Export/import with atomic validation (rejects bad enums, dates, duplicate IDs, oversized files) requiring explicit confirmation before replacing the board
- Corrupt-storage recovery (raw bytes preserved + downloadable, explicit reset) and cross-tab conflict detection that blocks destructive edits until reload
- Board/List view switch sharing the same `task-card` test seams, keyboard-accessible modal (Escape + focus return), one custom SVG icon family, reduced-motion support, and a `<noscript>` fallback
- Verified end-to-end with a headless Chromium/Playwright script (all checks passed) and visually reviewed at 360px and 1440px; one mobile layout bug (a flex height quirk after the toolbar switches to a column) was found and fixed during verification

Full details on data model, error handling, and exactly what was tested are in `README.md`.