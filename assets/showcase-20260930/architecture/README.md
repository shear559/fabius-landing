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

- Happy path: **Run job → Next event → Next event**. One committed synthetic output.
- Failure and recovery: **Reset → Run job → Next event → Take worker offline → Restore worker → Next event → Next event**. The job returns to the queue and completes on delivery attempt two.
- Idempotency: use **Replay same request** while queued, processing or completed. Queue entries, output identity and output count are preserved; the trace records the replay.

`TOUR.json` records six gallery steps, their visible targets and the actual control actions. The preview-only host bridge executes the recovery sequence above. The downloadable product works independently of that bridge.

## Design and limits

Operate/explore surface. Bright paper and ink form the controls; a dark navy canvas separates topology from the surrounding controls. Cyan denotes the current handoff or successful output. System sans typography; a vertical topology below 640px; 44px controls and keyboard-selectable nodes. Neither accent nor gradient is used to decorate functional controls.

The in-memory model handles one fixed request and treats output, completion status and acknowledgement as one commit. The queue models retention and redelivery; it is not real durable storage. Store failures, partial commits, concurrent workers, real timers, real media and production provider behavior are outside its scope. Reloading or Reset clears the model.
