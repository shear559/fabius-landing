# Fieldnote — September 30 refinement

A September 30, 2026 product/design iteration of the existing fictional Fieldnote app, with prior source available. It is not a fresh controlled comparison.

The app now opens directly on an editable research workspace. A compact project header, computed status totals and a live next-task shortcut replace the decorative hero. Eight synthetic tasks carry meaningful context and a specific deliverable. Cards and responsive list rows open a detail editor; both new fields round-trip through save, import and export. Existing board/list, project/status/priority/search filters, create, edit, delete/undo, corrupt-data recovery and cross-tab conflict guards remain.

Local storage persists standalone work. When storage access is blocked by an opaque-origin frame, the app uses explicit temporary session storage and keeps controls functional. Full/unwritable persistent storage still refuses a write. Exports preserve all task details. Import replacement uses an in-page confirmation that works without permission for browser-native dialogs.

Serve the directory with a static HTTP server. No install, backend, remote services or dependencies are needed. Rubik remains bundled under OFL.txt. `preview.html` differs only by the host tour bridge.

September 30 checks: `node --check app.js`; `node verify.mjs`. The model checks cover fixtures, import compatibility and validation. Browser appearance, interaction and production CSP require parent verification. Historical September 16 scenario totals do not apply to this revision.
