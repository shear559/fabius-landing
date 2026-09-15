# Blinded web contract oracle

This is a held-out browser oracle for the fixed Lattice landing-page and Fieldnote Board application briefs. The rubric was written before candidate artifacts were inspected. It measures observable contract compliance; screenshots need a separate blinded design review. Scenario counts are coverage, not independent trials, model-quality evidence or security certification.

Frozen rubric SHA-256: `dce74ebefa667827386eafd630efb81f79f0cbe431c5ee815efc307829278cd5`.

The runner accepts a neutral run identifier and a candidate directory or base URL. It never loads a treatment mapping. With `--directory`, it starts a temporary static server under `/nested/benchmark/` to exercise relative asset paths. It does not write candidate files. Every scenario uses a fresh disposable browser context; only that context receives the controlled board, storage failures or second-tab events. Remote resources are blocked and recorded. It does not access the user's browser profile or storage.

```sh
node web-oracle/grade.mjs --kind landing --directory /absolute/candidate/path --run-id run-01 --output /absolute/results/path
node web-oracle/grade.mjs --kind app --directory /absolute/candidate/path --run-id run-02 --output /absolute/results/path
node web-oracle/selftest.mjs
```

The default matrix is Chromium and WebKit at 360×844 and 1440×1000. `--browsers chromium`, `--widths 360`, and `--only A07,A14` support controlled diagnostics. Any restricted run must be described as such. No-JavaScript and reduced-motion contexts are independent. The app's A16 has two variants in each environment; this makes 68 app executions across 16 grouped criteria. Landing has 28 executions across 7 grouped criteria.

Each result includes observed values, expected predicates, exceptions, console/network evidence, elapsed time and actual screenshot names. `results.partial.json` preserves progress during execution; `results.json` is the completed report. Exit status 0 means all executed scenarios passed, 1 means at least one candidate scenario failed, and 2 means launch/infrastructure failure. Missing required DOM controls and browser action timeouts are product failures; failure to launch the browser is infrastructure. Any unexpected runner exception must be inspected before presenting a product verdict.

Positive and deliberately defective fixture implementations are private oracle controls, not benchmark candidates or showcase artifacts. They prove checks catch menu Escape, tab visibility, billing, invalid atomic import, oversized import, HTML injection, corrupt-data overwriting, silent quota failure, stale-tab overwrite and missing replacement confirmation. The fixtures intentionally implement only the relevant control surfaces and are not production software.

Do not change score criteria after inspecting candidate outputs. Record a runner correction and rerun every affected candidate symmetrically when an actual harness defect is demonstrated. Keep failed observations and avoid turning the rubric into a count of low-value assertions. Manual adjudications, such as an equally safe documented conflict reconciliation, must remain explicit.

## Executed control validation

The final self-test matched all 13 positive/negative control cases across 52 browser scenario executions. This includes both engines on the main positive controls, the ten intended defect modes and a positive control with reversed JSON keys/record order. Every negative control failed at its expected observation key. No candidate artifact had been inspected when this receipt was written. See `oracle-receipt.json`, `selftest-results/summary.json` and `runner-corrections.md`. Playwright 1.60.0 exercised Chromium 148.0.7778.96 and WebKit 26.4 on macOS x64 / Node v26.0.0.

## Later revisions and adjudications

The original complete matrices are never silently rewritten. `public-oracle-receipt.json` records the current revision and the preserved runner hashes. Corrections to genuinely equivalent UI behavior use positive and negative controls and symmetric reruns. For revision 4, the original full app matrices remain intact and each app's A08 rerun lives under `web/revision-4-A08/`; its adjudication identifies the combined verdict and its sources. Pointer-open and keyboard-open focus probes remain separate. The project named `all` edge is explicitly exploratory, includes its sentinel ambiguity, and does not change the primary matrix scores.
