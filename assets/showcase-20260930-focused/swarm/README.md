# Agent teams

**Divide the work. Keep the result together.** A focused, benefit-led demonstration of explicit roles, checkable handoffs, parallel work, and a shared result. The finished output is Luma, a working reading journal.

Run a static server in this directory (`python3 -m http.server 8767`) and open `index.html`. The standalone product is `product.html`. No installation, provider, account, network service, or storage is needed.

## What this demonstrates

Fabius Cohors calls for specialized roles, explicit output contracts, a shared specification, integration of combinable results, and separate review. This authored example makes those rules inspectable. The host/model would supply real agent capabilities; this demonstration uses deterministic fixtures and independently scheduled local timers. It is not a controlled model-uplift measurement.

The graph encodes the actual scheduler: Specification unlocks Interface, Data, and Accessibility. Integration waits for all three accepted outputs. Review runs six computed data/markup checks; Release depends on its passing receipt. Select any node or artifact tab to inspect its owner, inputs, attempt count, and complete emitted source.

The round chart is derived only from recorded dispatch and completion events. It uses rounds, not wall-clock timing or claimed performance improvements. Teal “Kept” nodes identify outputs accepted before the first failure and retained through recovery. The rejected Data attempt and successful retry occupy distinct chart cells.

## Use and recovery

- **Build the journal** executes the graph. **One round** advances a single ready group. During a manual round or retry, **Continue automatically** queues the remaining graph after that round settles. Slots 1–3 cap concurrent work.
- **Reset → Test a failed handoff → Build the journal** duplicates a note identity. The actual data validator rejects it and blocks Integration. At three slots, Specification, Interface, and Accessibility are kept.
- **Retry Data → Build the journal** repairs only Data and completes integration, review, and release. Completed artifacts keep their object identities.
- The result supports selecting books, filtering notes, saving thoughts, and composing a local note. Source and Checks show the actual composed HTML and computed receipt.

## Files and verification

The verified scheduler, renderer, validator, and product behavior are reused from the seven-task COHORT build. `view-model.mjs` adds pure, evidence-derived retention and round projections. `app.js` renders the new graph and chart; `styles.css` uses the focused showcase's Rubik/green design tokens. `rubik.woff2` is the existing bundled Rubik asset. Luma keeps its editorial book-cover illustration, translated into the shared green palette.

Run `node verify.mjs`: 21 checks cover all specialist completion orders, capacity limits, real template/data/label consumption, failed quality gates, retry without duplicated work, immutable transitions, mutation control, and the two new event-derived visualizations. Run `node build-delivery.mjs` to regenerate the seven delivered artifacts and complete handoff.

Browser verification: Chromium and WebKit at 390×844 and 1440×1000; graph edges, completed and retained states, actual round cells, all six tour scenes, product interactions, six checks, targeted retry, reset during execution, and no document overflow or browser/resource errors. QA evidence is kept outside the published directory by the integrating task. Final production verification and source ZIP packaging belong to the host.

`preview.html` matches `index.html` plus the host's `../demo-control.js`. All application scripts are external classic scripts, including the Node-importable pure `.mjs` files. No application fetch, localStorage, inline executable handlers, or parent-scrolling calls are used.

## Tour checkpoints

`TOUR.json` has six scenes at a 3400ms host cadence. Scene 0 arms and runs the fault; by scene 1 Data is rejected and three outputs are kept. Scene 2 retries Data. Scene 3 arms automatic continuation, including if retry is still running; by scene 4 the count is `7/7` and six checks pass. Scene 5 returns to the working product and the full handoff. Fast tests must await the initial rejection before the Retry scene and final `7/7` before asserting release. The retry-to-continuation transition itself can be immediate.

## Scope

All roles, content, and durations are deterministic fixtures. No live agent/model calls, deployment, or persistence occur. Review checks bounded data/markup contracts; it is not a complete accessibility or security audit. Reset/reload clears local state and product edits.

Provenance: focused on 2026-09-30 from the verified COHORT build using Fabius Cohors and the shared focused-showcase brief. Source guidance: `fabius-cohors/SKILL.md` in the installed Fabius 3.3.0 plugin, particularly explicit output contracts, parallel fan-out/gather, and specialized non-overlapping roles.
