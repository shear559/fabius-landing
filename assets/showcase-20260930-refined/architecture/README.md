# RELAY — Delivery lab

A local architecture explorer for a fictional preview-processing system. Start with an object that was committed but never acknowledged. Replay the request, expire its lease, reject the late writer, and let a new lease reconcile the exact existing object. The final state has one durable output record and a completion acknowledgement.

## Run

Serve this directory through any static HTTP server and open `index.html`. For example: `python3 -m http.server 8080`. No installation, dependencies, persistence or outbound requests are needed. `model.mjs` is a pure state machine exposed through a classic script; the same file is importable by Node and works in opaque-origin gallery frames without browser module CORS requirements. The host must permit external scripts and styles. `preview.html` additionally needs the gallery’s parent-directory bridge; use `index.html` for the standalone download.

## Explore the failure

The first visit is transition 3 of the **Lost ACK → lease expiry → fenced recovery** recipe: worker 1 committed the object, but the job remains uncertain and has no acknowledged output reference. The proof strip separates active lease, durable object, acknowledgement and rejected writes. **Play scenario** resumes this state; **Step** executes one transition. Reset or reselecting a recipe starts from the beginning.

1. The request key maps to one retained job and worker 1 gets fencing token 1.
2. The fenced object write succeeds, but completion acknowledgement is lost. Durable object count is one while acknowledgement is false.
3. A duplicate request returns the same unresolved job. Lease expiry returns that job to the queue without removing its object.
4. Worker 2 gets token 2. Worker 1’s late write is rejected; the active lease and existing object are unchanged.
5. Worker 2 verifies the object’s job/source identity, adopts its reference and acknowledges completion. No second storage write occurs. A final replay returns the same output.

The six shared recipes also cover late writing after pre-commit lease expiry, worker interruption/recovery, uninterrupted delivery, repeated requests and worker unavailability. Manual controls expose commit-with-lost-ACK, explicit lease expiry, the late writer, worker availability and duplicate requests. Pause/Reset cancel playback. Choose a service to inspect its ownership/failure contract and current record. Select an event title for the transition’s actual facts. The output panel evaluates five model invariants from current state.

## Model contract

- One fixed request key maps to one job and one stable output key.
- Delivery acquires an increasing token and a lease holder. Older attempts may return after expiry, but cannot write.
- The simulated store atomically checks the active lease and token before a put-if-absent at the stable key. This validation and write are one model operation.
- An existing object is adopted only if its job ID and source version match. A collision refuses completion and never overwrites the object.
- Object commit and completion acknowledgement are distinct. Ambiguous completion may leave an object durable while the queue/job does not have its acknowledgement.
- Redelivery can reconcile that object. Successful completion publishes its reference and ACKs it. Replays never create another job, queued entry or object.

This demonstrates idempotent output under at-least-once delivery assumptions. It does **not** claim exactly-once processing: two worker attempts may run, and arbitrary external side effects are not protected by this output-key contract.

## Assumptions and limits

Everything runs in memory. Reloading clears state. Durability is simulated, lease expiry is an explicit transition rather than a clock, and worker availability is a shared pool switch. The fixed request-key mapping and initial enqueue are treated atomically; API-creation crashes, multiple independent jobs, partitions, provider consistency and storage outages are outside the fixture. The store must enforce the lease check and conditional write atomically; a production object store does not necessarily provide this contract by itself. No media file is processed or generated: the result is an inspectable synthetic object record.

## Verification

```sh
node --check app.js
node --check model.mjs
node --check scenarios.js
node verify.mjs
```

The September 30 verifier passes 78,019 immutable, deterministic transitions. It checks all six browser recipes, original action sequences through depth seven, fault sequences through depth six, request identity, queue uniqueness, fencing and ACK/object invariants. Focused cases include lost acknowledgement, stale writes before and after a new lease, unchanged original object on reconciliation, same-lease recovery, wrong-source collision refusal, invalid-phase no-ops and post-completion replay.

Local Chromium and WebKit checks passed at 390 and 1440 CSS pixels (mobile device scale 2): initial committed/unacknowledged split, lease 2 redelivery, token 1 rejection, unchanged single object, reconciliation, completion replay, event inspection, all five visible invariants, Pause cancellation and no horizontal overflow. Screenshots were inspected. Deployed-host CSP and real infrastructure were not tested by this package.

## Files and provenance

`model.mjs` owns transitions and invariants. `scenarios.js` is shared by browser and verifier. `app.js` derives the topology, evidence and records from state. `TOUR.json` contains deterministic gallery actions. `source.zip` contains the standalone runnable assets, verifier, README and tour. `index.html` and `preview.html` are twins except for the gallery bridge.

Refined on 2026-09-30 with Fabius Decor and Disciplina. This revision deepens the original model with independent commit/ACK phases, overlapping attempts, lease fencing and identity-checked reconciliation. It preserves the blue drafting-paper console, adds a first-visit result and inspectable event evidence, and improves desktop column flow. This is a Fabius-assisted artifact, not a controlled model comparison. Verification above was rerun for these changes.
