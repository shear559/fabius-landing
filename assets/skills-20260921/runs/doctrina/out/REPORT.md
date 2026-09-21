# Support message routing — model report

## The task

Route 720 labelled support messages into 4 queues (`account_access`, `billing`,
`bug`, `feature_request`) automatically, with a human fallback for what it
misses.

## The smallest approach that could hold

**Bag-of-words Multinomial Naive Bayes**, fit in closed form with Laplace
smoothing, using only `numpy`/`scipy.sparse`. Reasons this is the right size
for the problem, not a bigger one:

- 720 short messages (4–14 words) is not enough data to justify an iterative
  learner (logistic regression, embeddings, anything with gradients) — NB's
  closed-form fit has no optimizer to diverge or overfit-tune.
- The vocabulary is small and topic words are highly discriminative
  ("refund", "crash", "widget", "password") — exactly the regime where the
  naive independence assumption costs little.
- NB gives calibratable per-class posteriors "for free," which is what a
  human-fallback design wants to threshold on (see below — this turned out
  not to work as hoped, which is itself a useful finding).

**Control:** a majority-class baseline (always predicts the most frequent
label). This is the real bar to clear — a router that is only better than
random isn't worth deploying at all.

## Data reality check (done before modeling)

`messages.csv` has 720 rows but only **611 unique message strings** — 84
messages repeat, and **14 of those repeats carry conflicting labels**
(e.g. "my account is locked after too many attempts" appears as both
`billing` and `account_access`). This is real label noise/ambiguity, not a
data bug to paper over.

Consequence for methodology: splitting by *row* would leak identical
messages across train and test and inflate the score. Every split in
`train.py` is **grouped by exact message text** — a message and all its
duplicates land entirely in one split.

## Evaluation methodology

1. **Stratified group split**: 80% dev-pool / 20% held-out test, by message
   group, stratified by each group's majority label. The test set (145 rows,
   123 distinct messages) is scored exactly once, at the end.
2. **Hyperparameter selection** (Laplace smoothing `alpha`, vocab minimum
   document frequency `min_df`): 5-fold stratified **group** cross-validation
   *inside the dev-pool only*, selecting by mean macro-F1. Best:
   `alpha=0.05, min_df=1` (mean CV macro-F1 = 0.940 ± 0.020 across folds).
3. **Final fit**: refit on the full dev-pool (575 rows) with the chosen
   hyperparameters, evaluated once on the untouched test set.
4. **Uncertainty**: 10,000-resample bootstrap over the test set for accuracy
   and macro-F1 (both model and control), plus a paired bootstrap on the
   accuracy gap.

Metric: macro-F1 as primary (classes are close to but not exactly balanced:
171–185 per class), accuracy reported alongside since it's what a queue
operator will ask about first.

## Results (held-out test set, n=145)

| | Model (Naive Bayes) | Control (majority class) |
|---|---|---|
| Accuracy | **0.945** [0.903, 0.979] | 0.234 [0.166, 0.303] |
| Macro-F1 | **0.947** [0.908, 0.979] | 0.095 [0.071, 0.116] |

Accuracy gap (model − control): **+0.711**, 95% CI [0.635, 0.786]; 0/10,000
bootstrap resamples favored the control. The model is unambiguously and by
a wide margin better than the control.

Per-class (model):

| class | precision | recall | F1 | support |
|---|---|---|---|---|
| account_access | 0.925 | 0.902 | 0.914 | 41 |
| billing | 1.000 | 0.914 | 0.955 | 35 |
| bug | 1.000 | 0.971 | 0.985 | 34 |
| feature_request | 0.875 | 1.000 | 0.933 | 35 |

Confusion matrix (rows = true, cols = predicted, order
account_access/billing/bug/feature_request):

```
[37,  0,  0,  4]
[ 2, 32,  0,  1]
[ 1,  0, 33,  0]
[ 0,  0,  0, 35]
```

All confusion is between `account_access` and `feature_request`/`billing` —
`bug` is almost perfectly separated from everything else.

## Where it fails

8 of 145 test messages were misclassified (5.5%). Looking at them directly:

- **A majority look like label noise, not model error.** E.g. "hello team,
  add a way to tag notes by colour!!" is labelled `account_access` in the
  data but predicted `feature_request` — the message content is a feature
  request by any reasonable reading. Same pattern for "any plans for offline
  mode on Windows" (labelled `account_access`), "let me schedule exports
  every week" (labelled `account_access`), "I can't log in after resetting
  my password" (labelled `billing`). These are cases where the model's
  prediction is arguably *more* correct than the ground-truth label. This
  means the true error rate against *intended* routing is likely lower than
  5.5%, but it also means ~5% of this dataset's labels can't be trusted at
  face value.
- **Genuinely ambiguous messages** ("how do I change the owner of our
  workspace" was labelled `account_access` twice and `bug` once in the raw
  data) get routed to whichever label the model saw more of for that
  phrasing — a reasonable thing to do, but it means the ceiling on this
  dataset is below 100% no matter the model.
- **The confusable pairs are `account_access` ↔ `feature_request` and
  `account_access` ↔ `billing`**, not random — all involve short messages
  about account/workspace state ("change the owner", "change the card")
  that read differently depending on whether the sender wants something
  *changed* (feature/access request) or *fixed* (billing/access bug).

## Confidence as a human-fallback trigger: doesn't work, and that matters

The natural design for "ship behind a human fallback" is: auto-route when
the model is confident, send to a human when it isn't. **This does not work
here.** The Naive Bayes posterior saturates almost everywhere — median
posterior confidence on the test set is 1.0000, minimum is 0.9936, and this
holds for wrong predictions too (all 8 errors have posterior ≥ 0.9999).
Thresholding at 0.5 through 0.9 changes nothing: coverage stays 100% because
nothing ever falls below those thresholds. This is a known pathology of
multinomial NB (many small per-word likelihoods compound multiplicatively),
not a bug in this implementation.

Falling back to the raw, un-normalized log-score margin between the top two
classes doesn't rescue this either: mean margin on correct predictions is
18.8, mean margin on *wrong* predictions is actually *higher* (24.2) — some
of the wrong predictions are the most confident predictions the model makes.
This is consistent with the label-noise finding above: the model is
confidently reading message *content*, and the errors are the cases where
the ground-truth label disagrees with the content, not the cases where the
model was genuinely unsure between two plausible interpretations. Full
numbers are in `metrics.json` → `human_fallback_analysis`.

**Implication:** a human fallback for this model should not be built as
"defer when confidence is low," because confidence doesn't separate errors
here. A more honest design is a fixed-rate random audit (e.g., route
X% of all auto-routed messages to a human for spot-check, tuned to the
team's tolerance for a ~5% base error rate) plus a manual review queue for
the specific confusable pairs identified above (`account_access` vs.
`feature_request`/`billing`).

## Is it good enough to ship behind a human fallback?

**Yes, conditionally.** 94.5% accuracy with a tight CI, a 71-point margin
over the majority-class control, and errors concentrated in
content/label ambiguity rather than a systematic blind spot — this is a
reasonable router to put in front of a human safety net, not a reasonable
router to run unsupervised.

Conditions:
1. Don't gate the human fallback on the model's own confidence score — it
   isn't informative (see above). Use a fixed audit sample rate instead.
2. Expect the bulk of real-world errors at the `account_access` /
   `feature_request` / `billing` boundary for messages about changing
   account or billing state — that's where a human reviewer's time will be
   best spent.
3. This evaluation is on data drawn from the same generation process as
   training (same phrasing templates, same 4 labels). It says nothing about
   messages with different vocabulary, a 5th queue, or a different
   language — that requires monitoring in production and periodic
   re-evaluation on fresh, human-reconciled labels, not a one-time offline
   number.

## What this doesn't check

- No test of robustness to phrasing the training templates never used
  (paraphrases, typos beyond what's already in the data, non-English
  messages).
- No calibration fix attempted (e.g. temperature scaling of the log-scores)
  — flagged as a known gap rather than solved, since fixing calibration
  needs a labelled calibration set distinct from both dev and test, which
  would have meant a 3-way split on an already-small dataset.
- No check of drift over time — the CSV has no timestamps, so
  train/test could not be split chronologically; a production deployment
  should re-validate this split-by-time before trusting the offline number
  to hold going forward.
