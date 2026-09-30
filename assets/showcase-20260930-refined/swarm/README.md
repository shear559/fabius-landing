# COHORT

A local, deterministic agent-workbench demo. Start a static server in this directory and open `index.html`; the product has no dependencies and makes no network requests beyond loading its own HTML, CSS, and scripts.

## Use

1. Use **Run through** for the whole graph, or **Run next round** for single steps. Planner unlocks Designer and Engineer.
2. Run the next round. With concurrency 2 or 3, both start together. With 1, only one starts.
3. The Reviewer becomes ready only after both succeed. Run it to assemble the handoff packet.
4. Reset, enable **Engineer failure**, and repeat. The failed Engineer holds review. **Retry Engineer** reruns only that task; successful artifacts are retained.
5. Select graph nodes or artifact tabs to inspect the brief, outline, design specification, component source, review checklist, and final packet.

## Simulation limits

- The launch brief, four specialist roles, graph, work durations, and artifact content are fixed synthetic fixtures.
- No language model, real agent, external tool, backend, account, or provider is called. Concurrent work is represented by independently scheduled local timers.
- This is a round-based scheduler. Finishing a task makes its dependents eligible; single-step mode waits for the user; Run through dispatches the next ready round after the current one finishes and pauses on failure.
- Concurrency is a cap, not a promise of full utilization. This graph has at most two independent runnable tasks, so capacity 3 leaves a lane idle.
- The injected fault fails the Engineer's first attempt. Retry reuses its completed dependencies and produces the fixed component fixture.
- State exists only in memory. Reset or reload discards it. Reset cancels timers and guards against stale callbacks.
- The review checklist is a fixture describing the sample handoff, not an independent code audit or quality score.

## Implementation

`model.mjs` contains pure state transitions shared by the app and `verify.mjs`. It is deliberately classic-script-compatible and exposes `globalThis.CohortModel`: sandboxed opaque-origin frames can load the same implementation without module CORS requirements. `app.js` owns DOM rendering and cancellable local task timers. There are no inline scripts, handlers, storage access, or application fetch calls.

Run `node verify.mjs` for the scheduler checks. Run `node --check app.js` and `node --check model.mjs` for syntax checks. Browser verification is performed by the integrating parent task; this directory's builder did not run a browser.

## Visual system

Surface mode: operate. Bands: compact controls → coordination rail + rendered launch component + agent input/output inspector → event ledger.

| Token role | Use | Never |
| --- | --- | --- |
| Paper / white | Workspace and readable artifacts | Simulated status signals |
| Ink / dark slate | Text and monochrome controls | Decorative gradients on controls |
| Violet | Active dependency signals and the launch-artifact backdrop | Per-role colors or quality scores |
| System sans | Headings, controls, body | External font dependency |
| System monospace | Filenames, step counters, source | Long body copy |

The graph stays compact and vertical; desktop places it beside the live artifact and inspector, while mobile leads with the artifact. Controls have at least 44px targets; keyboard focus, named statuses, and reduced-motion handling are explicit.

## Refinement provenance

Refined on 2026-09-30 with Fabius Decor critique and Cohors guidance. The scheduler and fixture outputs are unchanged. The dominant workspace now renders the actual completed Engineer HTML with the Luma visual specification; before completion it is explicitly labelled a reference target. Added preview/source views, input/output ownership, and cancellable run-through control. Failure still pauses execution and retains completed artifacts. This is a product refinement, not a controlled model comparison. `index.html` and `preview.html` are twins except for the preview host bridge.
