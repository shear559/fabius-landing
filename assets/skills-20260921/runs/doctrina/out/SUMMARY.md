# Summary

## What I produced

- `out/train.py` — end-to-end, reruns from scratch, deterministic (seed=42),
  numpy + scipy.sparse only (no sklearn, no model APIs, no network).
- `out/metrics.json` — full numeric results: split sizes, chosen
  hyperparameters, CV results, test metrics with bootstrap 95% CIs for both
  model and control, confusion matrix, per-class precision/recall/F1, the
  confidence-based human-fallback analysis, and the calibration diagnostic.
- `out/REPORT.md` — the approach, why it's the smallest one that could hold,
  the methodology, the results vs. control with uncertainty, concrete
  failure examples, and the ship/no-ship call.

**Approach:** bag-of-words Multinomial Naive Bayes (closed-form, Laplace
smoothing) vs. a majority-class control. Data has real duplicate/conflicting
labels, so every split is grouped by exact message text to prevent leakage;
hyperparameters were chosen by 5-fold group CV inside an 80% dev-pool, and
the 20% test set was scored exactly once.

## What I checked, and how (real output)

Ran the deliverable directly, twice, from two different working directories,
to confirm it's reproducible and doesn't depend on CWD:

```
$ python3 out/train.py
Total rows: 720 | unique message groups: 611 (84 groups have >1 occurrence, 14 of those have conflicting labels)
Dev-pool: 575 rows (488 groups) | Test (held out): 145 rows (123 groups)
Best CV hyperparams: alpha=0.05 min_df=1 mean_macro_f1=0.9400 (+/- 0.0195 std across folds)

Test accuracy: model=0.9448 [0.9034, 0.9793] vs control=0.2345 [0.1655, 0.3034]
Test macro-F1: model=0.9468 [0.9077, 0.9793] vs control=0.0950 [0.0710, 0.1164]
Accuracy gap (model-control): 0.7111 95% CI [0.6345, 0.7862] (P(gap<=0) under bootstrap = 0.0000)

Confidence-gated coverage/accuracy on test set:
  threshold=0.0: coverage=1.000 (n=145) accuracy_on_kept=0.9448
  threshold=0.5: coverage=1.000 (n=145) accuracy_on_kept=0.9448
  threshold=0.6: coverage=1.000 (n=145) accuracy_on_kept=0.9448
  threshold=0.7: coverage=1.000 (n=145) accuracy_on_kept=0.9448
  threshold=0.8: coverage=1.000 (n=145) accuracy_on_kept=0.9448
  threshold=0.9: coverage=1.000 (n=145) accuracy_on_kept=0.9448

Calibration diagnostic: posterior confidence min/median = 0.9936 / 1.0000; mean margin correct=18.84 vs wrong=24.25

Wrote out/metrics.json
```

Re-ran from `/tmp` (script path resolved relative to the script file, not
CWD) — identical numbers, confirming determinism and that the deliverable is
self-contained:

```
$ cd /tmp && python3 .../out/train.py | tail -3
Calibration diagnostic: posterior confidence min/median = 0.9936 / 1.0000; mean margin correct=18.84 vs wrong=24.25

Wrote out/metrics.json
```

Also validated `out/metrics.json` parses as JSON:

```
$ python3 -c "import json; json.load(open('out/metrics.json')); print('metrics.json is valid JSON')"
metrics.json is valid JSON
```

Before choosing an approach, I checked the raw data directly (not just
trusted the label column): confirmed classes are roughly balanced (185/185/
179/171 across 4 labels), and — by grouping on exact message text — found 84
repeated messages, 14 of which carry **conflicting** labels across
occurrences (e.g. "my account is locked after too many attempts" appears as
both `billing` and `account_access`). This directly shaped the methodology
(group-aware splitting) and the failure analysis (several of the model's 8
test errors are plausibly mislabeled ground truth, not model mistakes — see
REPORT.md "Where it fails").

I also checked whether the model's own confidence could gate a human
fallback (the natural design), and found it can't: NB posteriors saturate
near 1.0 everywhere, including on wrong predictions, and even the raw
log-score margin is *not* lower on wrong predictions than on correct ones
(24.2 vs 18.8 mean margin). This is reported honestly in REPORT.md as a
limitation with a concrete alternative (fixed-rate audit instead of
confidence gating).

## What I did not do / could not check

- No robustness test against phrasing outside the dataset's own templates
  (paraphrases, typos beyond what naturally occurs in the data, other
  languages) — there's no such data available here.
- No calibration fix (e.g., temperature scaling) attempted — doing it
  properly would need a third, calibration-only split carved out of an
  already-small 720-row dataset, which I judged not worth the further data
  reduction for a 15-minute-scoped task. Flagged as a known gap in
  REPORT.md rather than silently skipped.
- No chronological/drift check — `messages.csv` has no timestamps, so I
  could not test whether performance holds over time; this needs to be a
  production monitoring concern, not an offline one.
- I did not attempt a fancier model (TF-IDF weighting, char n-grams,
  logistic regression via scipy.optimize) because the CV macro-F1 for plain
  count-based Naive Bayes was already 0.94 with a clear, wide margin over
  the control — per the "smallest approach that could hold" brief, I did
  not chase marginal gains against a bar that's already comfortably
  cleared, and error analysis shows most remaining error is label noise a
  bigger model cannot fix anyway.
