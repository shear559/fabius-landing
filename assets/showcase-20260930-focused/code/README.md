# Tidy — Clear code, visible behavior

An authored, local task transformation built for the Fabius focused gallery on 2026-09-30. Fabius 3.3.0 parcus, disciplina and decor instructions guided this implementation and its refinement. This is a working example, not a live model call, a controlled comparison, a benchmark, or evidence that shorter code is universally better.

## Run

Serve this directory with a static HTTP server and open `index.html`. No install, build, dependency, storage access or network API is required. `preview.html` is the same page with the parent gallery's `../demo-control.js` bridge added; the standalone archive uses `index.html`.

```sh
python3 -m http.server 8829
node verify.mjs
```

## Behavior and boundaries

`model.mjs` defines the pure `buildPlan` and `validateTasks` functions, presets and executable fixture checks. It works as a classic browser script and as an importable Node module, exposing `globalThis.ClearCode`. The visible code is generated directly from each executing function's `toString()`, using text nodes and syntax tokens. Editing the JSON never executes code.

Input is an array of at most 50 task objects. `id`, `title` and `project` are trimmed non-empty strings of at most 60 UTF-16 code units. `minutes` is an integer from 0 to 480, and `done` is a boolean. Extra fields are discarded. All rows are validated before filtering, including duplicate and completed rows. IDs and project names are case-sensitive. The first trimmed ID wins even when that row is subsequently excluded. Duplicate status takes precedence over completed and over-limit status. Completed tasks are excluded unless explicitly included; the per-task limit is inclusive. It is not a total time budget. Zero-minute tasks remain visible. Groups are ordered by descending minutes, with first appearance retained for tied totals. `Map` permits ordinary labels including `__proto__` safely. Source objects are not changed.

The browser additionally caps JSON text at 30,000 characters. The slider provides 0–180 minutes in five-minute steps; the function itself accepts 0–480 whole minutes. Presets, slider and completed checkbox run immediately. Manual JSON edits mark the previous plan as stale and run on the explicit button or the next parameter change. Invalid input hides the old plan and clears JSON/trace output; it never displays a partial result. The fixed fixture-check suite tests the implementation, not the visitor's current input. Empty data, rejected data and an empty selection have distinct states. Nothing persists after reload.

## Verification

`node verify.mjs` reruns the 15 UI fixture checks, exact initial outputs, normalization, case sensitivity, field lengths and the largest permitted total; a separate direct oracle compares 768 input/option combinations. The count printed by the command is authoritative. Browser QA covers Chromium and WebKit at 390px and 1440px, edited JSON, all presets, error/recovery, parameter changes, source tabs, JSON output, keyboard focus and reduced motion. Live deployment verification belongs to the host publishing pass.

## Visual system

Light surface; Rubik typography; paper canvas, green emphasis, monochrome controls. Teal distinguishes the second project in the minutes chart and amber identifies excluded/invalid data. A single contained dark code pane carries real source. The result precedes source on phones. The flow shows actual counts at validation, deduplication, selection and grouping. No decorative network, generated claims, fabricated uplift or user data.

Rubik is reused byte-for-byte from the landing's self-hosted font. Its SIL Open Font License is included in `OFL.txt`. All other demonstration code and UI were authored for this gallery and remain subject to the repository's license.

## Tour and selectors

`TOUR.json` provides six deterministic steps. Main controls: `#preset`, `#limit`, `#include-done`, `#run-plan`, `#input-json`, `#apply-input`, `#restore`, `#source-transform`, `#source-validate`, `#show-json`, `#run-checks`. Results: `#total-minutes`, `#task-count`, `#groups`, `#trace-list`, `#result-error`, `#checks-status`. `body[data-result="success"|"error"]` identifies the current run state.
