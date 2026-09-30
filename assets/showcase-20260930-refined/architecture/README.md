# RELAY

An offline architecture explorer for a fictional media-processing system. Run one synthetic job, advance each event, interrupt the worker, restore delivery, and replay the same request. Select any topology node with a pointer or keyboard to inspect its responsibility and failure contract.

## Run

Serve this directory through any static HTTP server and open `index.html`. No dependencies, installation, persistence or network calls are used by the artifact. `model.mjs` is a pure state machine exposed as a frozen global through a classic script, so the same file can run in opaque-origin gallery frames and be imported by Node without browser module CORS requirements. The host must permit both external scripts and styles in its CSP.

## Verify

```sh
node --check app.js
node --check model.mjs
node verify.mjs
```

The verifier covers success, worker unavailability before delivery, interruption during processing, recovery, replay while queued/processing/completed, terminal output uniqueness, reset, immutable inputs, determinism and all action sequences through seven events. Browser and host-CSP verification belong to the gallery integration pass.

## Walkthroughs

Choose **Worker interruption & recovery**, **Uninterrupted delivery**, **Repeated request**, or **Worker unavailable before delivery**. **Play scenario** runs the shared recipe; **Step** executes one transition. Pause or Reset cancels the timer. Manual worker/replay controls switch to manual exploration and retain current state. Click a service to inspect its ownership contract and exact current record.

`scenarios.js` holds the same four recipes used by the browser and verifier. `TOUR.json` contains five deterministic gallery steps ending with recovery, a committed output, and an idempotent replay.

## Design and limits

Operate/explore surface. Bright drafting paper and ink form the work surface. Blue denotes current job ownership; the request envelope, queue slots, worker attempt, and committed record expose actual model state. System sans typography; a branched topology below 760px; keyboard-selectable service nodes and 44px controls. Neither accent nor gradient is used to decorate functional controls.

The in-memory model handles one fixed request and treats output, completion status and acknowledgement as one commit. The queue models retention and redelivery; it is not real durable storage. Store failures, partial commits, concurrent workers, real media and production provider behavior are outside its scope. Reloading or Reset clears the model.

## Refinement provenance

Refined on 2026-09-30 with Fabius Decor and its critique guidance. The original pure `model.mjs` is unchanged. Added shared scenario recipes, cancellable playback, a packet/ownership topology, per-service JSON snapshots, and an output receipt. Source artwork is illustrative; no media file is processed. This is a Fabius-assisted product refinement, not a controlled model comparison. `index.html` and `preview.html` differ only by the preview host bridge.
