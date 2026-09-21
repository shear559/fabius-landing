"""
Support-message routing: smallest approach that could hold.

Model: bag-of-words Multinomial Naive Bayes (closed-form, numpy/scipy.sparse
only -- no gradient descent, no external ML libs).
Control: majority-class baseline (always predicts the most frequent label).

Methodology:
  1. Group messages by exact text (the raw data has near-duplicate/duplicate
     messages, some with *conflicting* labels -- see REPORT.md). A whole
     group is assigned to exactly one split so no message text is memorized
     from train and then "recognized" at test time.
  2. Stratified group split: 80% dev-pool / 20% held-out test. The test set
     is touched exactly once, at the very end.
  3. Hyperparameters (Laplace smoothing alpha, vocab min document frequency)
     are chosen by 5-fold stratified group cross-validation *inside the
     dev-pool only*.
  4. Final model is refit on the full dev-pool with the chosen
     hyperparameters and scored once on the held-out test set.
  5. Uncertainty: 10,000-resample bootstrap over the test set for accuracy
     and macro-F1, for both the model and the control, plus a paired
     bootstrap on the accuracy gap.
  6. A confidence-gated "human fallback" analysis: coverage vs. accuracy at
     several posterior-probability thresholds.

Run: python3 train.py   (reproducible, seed=42, no network, no installs)
"""
import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict

import numpy as np
from scipy import sparse

SEED = 42
_HERE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(_HERE, "..", "messages.csv")
OUT_METRICS = os.path.join(_HERE, "metrics.json")

TOKEN_RE = re.compile(r"[a-z0-9']+")


def tokenize(text):
    return TOKEN_RE.findall(text.lower())


def load_data(path):
    rows = []
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            rows.append((r["id"], r["message"], r["label"]))
    return rows


def group_key(message):
    return message.strip().lower()


def build_groups(rows):
    """Map group_key -> list of row indices sharing that exact message text."""
    groups = defaultdict(list)
    for i, (_id, msg, _label) in enumerate(rows):
        groups[group_key(msg)].append(i)
    return groups


def group_primary_label(indices, labels):
    c = Counter(labels[i] for i in indices)
    return c.most_common(1)[0][0]


def stratified_group_split(group_keys, group_primary, test_frac, rng):
    """Split group keys into (dev_keys, test_keys), stratified by each
    group's primary label, keeping whole groups intact."""
    by_label = defaultdict(list)
    for k in group_keys:
        by_label[group_primary[k]].append(k)
    dev_keys, test_keys = [], []
    for label, keys in by_label.items():
        keys = list(keys)
        rng.shuffle(keys)
        n_test = max(1, round(len(keys) * test_frac))
        test_keys.extend(keys[:n_test])
        dev_keys.extend(keys[n_test:])
    return dev_keys, test_keys


def stratified_group_kfold(group_keys, group_primary, k, rng):
    """Assign each group key a fold id 0..k-1, stratified by primary label."""
    by_label = defaultdict(list)
    for key in group_keys:
        by_label[group_primary[key]].append(key)
    fold_of = {}
    for label, keys in by_label.items():
        keys = list(keys)
        rng.shuffle(keys)
        for i, key in enumerate(keys):
            fold_of[key] = i % k
    return fold_of


def keys_to_row_indices(keys, groups):
    idx = []
    for key in keys:
        idx.extend(groups[key])
    return idx


class NaiveBayes:
    """Multinomial Naive Bayes with Laplace smoothing, fit in closed form."""

    def __init__(self, alpha=1.0, min_df=2):
        self.alpha = alpha
        self.min_df = min_df

    def fit_vocab(self, docs_tokens):
        df = Counter()
        for toks in docs_tokens:
            df.update(set(toks))
        vocab = sorted(w for w, c in df.items() if c >= self.min_df)
        self.vocab_ = {w: i for i, w in enumerate(vocab)}
        return self

    def vectorize(self, docs_tokens):
        rows, cols, data = [], [], []
        for r, toks in enumerate(docs_tokens):
            counts = Counter(t for t in toks if t in self.vocab_)
            for w, c in counts.items():
                rows.append(r)
                cols.append(self.vocab_[w])
                data.append(c)
        return sparse.csr_matrix(
            (data, (rows, cols)), shape=(len(docs_tokens), len(self.vocab_))
        )

    def fit(self, X, y, classes):
        self.classes_ = list(classes)
        n_classes = len(self.classes_)
        n_docs, n_vocab = X.shape
        class_idx = {c: i for i, c in enumerate(self.classes_)}
        y_idx = np.array([class_idx[label] for label in y])

        self.log_prior_ = np.zeros(n_classes)
        word_counts = np.zeros((n_classes, n_vocab))
        for i, c in enumerate(self.classes_):
            mask = y_idx == i
            self.log_prior_[i] = np.log(mask.sum() / n_docs)
            word_counts[i] = np.asarray(X[mask].sum(axis=0)).ravel()

        smoothed = word_counts + self.alpha
        self.log_theta_ = np.log(smoothed / smoothed.sum(axis=1, keepdims=True))
        return self

    def decision_scores(self, X):
        return X.dot(self.log_theta_.T) + self.log_prior_

    def predict_proba(self, X):
        scores = self.decision_scores(X)
        scores = scores - scores.max(axis=1, keepdims=True)
        exp = np.exp(scores)
        return exp / exp.sum(axis=1, keepdims=True)

    def predict(self, X):
        scores = self.decision_scores(X)
        return [self.classes_[i] for i in np.argmax(scores, axis=1)]


def macro_prf1(y_true, y_pred, classes):
    per_class = {}
    for c in classes:
        tp = sum(1 for t, p in zip(y_true, y_pred) if t == c and p == c)
        fp = sum(1 for t, p in zip(y_true, y_pred) if t != c and p == c)
        fn = sum(1 for t, p in zip(y_true, y_pred) if t == c and p != c)
        prec = tp / (tp + fp) if (tp + fp) else 0.0
        rec = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
        per_class[c] = {"precision": prec, "recall": rec, "f1": f1,
                         "support": sum(1 for t in y_true if t == c)}
    macro_f1 = float(np.mean([per_class[c]["f1"] for c in classes]))
    return macro_f1, per_class


def accuracy(y_true, y_pred):
    return sum(1 for t, p in zip(y_true, y_pred) if t == p) / len(y_true)


def confusion_matrix(y_true, y_pred, classes):
    idx = {c: i for i, c in enumerate(classes)}
    cm = np.zeros((len(classes), len(classes)), dtype=int)
    for t, p in zip(y_true, y_pred):
        cm[idx[t], idx[p]] += 1
    return cm


def cross_validate(dev_keys, group_primary, groups, rows, labels_by_idx,
                    classes, alphas, min_dfs, k=5, seed=SEED):
    rng = np.random.default_rng(seed)
    fold_of = stratified_group_kfold(dev_keys, group_primary, k, rng)

    results = []
    for min_df in min_dfs:
        for alpha in alphas:
            fold_f1s = []
            for fold in range(k):
                train_keys = [key for key in dev_keys if fold_of[key] != fold]
                val_keys = [key for key in dev_keys if fold_of[key] == fold]
                train_idx = keys_to_row_indices(train_keys, groups)
                val_idx = keys_to_row_indices(val_keys, groups)

                train_tokens = [tokenize(rows[i][1]) for i in train_idx]
                val_tokens = [tokenize(rows[i][1]) for i in val_idx]
                train_y = [labels_by_idx[i] for i in train_idx]
                val_y = [labels_by_idx[i] for i in val_idx]

                nb = NaiveBayes(alpha=alpha, min_df=min_df).fit_vocab(train_tokens)
                Xtr = nb.vectorize(train_tokens)
                Xval = nb.vectorize(val_tokens)
                nb.fit(Xtr, train_y, classes)
                pred = nb.predict(Xval)
                f1, _ = macro_prf1(val_y, pred, classes)
                fold_f1s.append(f1)
            results.append({
                "alpha": alpha, "min_df": min_df,
                "mean_macro_f1": float(np.mean(fold_f1s)),
                "std_macro_f1": float(np.std(fold_f1s)),
            })
    results.sort(key=lambda r: -r["mean_macro_f1"])
    return results


def bootstrap_ci(values, n_boot=10000, seed=SEED):
    rng = np.random.default_rng(seed)
    values = np.asarray(values)
    n = len(values)
    boots = np.empty(n_boot)
    for b in range(n_boot):
        idx = rng.integers(0, n, n)
        boots[b] = values[idx].mean()
    lo, hi = np.percentile(boots, [2.5, 97.5])
    return float(values.mean()), float(lo), float(hi)


def bootstrap_macro_f1_ci(y_true, y_pred, classes, n_boot=10000, seed=SEED):
    rng = np.random.default_rng(seed)
    n = len(y_true)
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    boots = np.empty(n_boot)
    for b in range(n_boot):
        idx = rng.integers(0, n, n)
        f1, _ = macro_prf1(y_true[idx].tolist(), y_pred[idx].tolist(), classes)
        boots[b] = f1
    lo, hi = np.percentile(boots, [2.5, 97.5])
    return float(boots.mean()), float(lo), float(hi)


def paired_bootstrap_diff(correct_a, correct_b, n_boot=10000, seed=SEED):
    """Bootstrap CI + one-sided empirical p-value for mean(a) - mean(b)."""
    rng = np.random.default_rng(seed)
    a = np.asarray(correct_a, dtype=float)
    b = np.asarray(correct_b, dtype=float)
    n = len(a)
    diffs = np.empty(n_boot)
    for i in range(n_boot):
        idx = rng.integers(0, n, n)
        diffs[i] = a[idx].mean() - b[idx].mean()
    lo, hi = np.percentile(diffs, [2.5, 97.5])
    p_not_better = float((diffs <= 0).mean())
    return float(diffs.mean()), float(lo), float(hi), p_not_better


def coverage_accuracy_at_thresholds(y_true, y_pred, confidences, thresholds):
    out = []
    n = len(y_true)
    for t in thresholds:
        kept = [i for i in range(n) if confidences[i] >= t]
        coverage = len(kept) / n
        if kept:
            acc = accuracy([y_true[i] for i in kept], [y_pred[i] for i in kept])
        else:
            acc = None
        out.append({"threshold": t, "coverage": coverage, "n_kept": len(kept),
                     "accuracy_on_kept": acc})
    return out


def main():
    rng = np.random.default_rng(SEED)
    rows = load_data(DATA_PATH)
    labels_by_idx = [r[2] for r in rows]
    classes = sorted(set(labels_by_idx))

    groups = build_groups(rows)
    group_keys = list(groups.keys())
    group_primary = {k: group_primary_label(idxs, labels_by_idx) for k, idxs in groups.items()}

    n_multi_label_groups = sum(
        1 for idxs in groups.values()
        if len(set(labels_by_idx[i] for i in idxs)) > 1
    )
    n_dup_groups = sum(1 for idxs in groups.values() if len(idxs) > 1)

    dev_keys, test_keys = stratified_group_split(group_keys, group_primary, 0.20, rng)
    dev_idx = keys_to_row_indices(dev_keys, groups)
    test_idx = keys_to_row_indices(test_keys, groups)

    print(f"Total rows: {len(rows)} | unique message groups: {len(group_keys)} "
          f"({n_dup_groups} groups have >1 occurrence, {n_multi_label_groups} of "
          f"those have conflicting labels)")
    print(f"Dev-pool: {len(dev_idx)} rows ({len(dev_keys)} groups) | "
          f"Test (held out): {len(test_idx)} rows ({len(test_keys)} groups)")

    # ---- hyperparameter selection via CV, inside dev-pool only ----
    alphas = [0.05, 0.1, 0.3, 0.5, 1.0, 2.0]
    min_dfs = [1, 2, 3]
    cv_results = cross_validate(dev_keys, group_primary, groups, rows, labels_by_idx,
                                 classes, alphas, min_dfs, k=5, seed=SEED)
    best = cv_results[0]
    print(f"Best CV hyperparams: alpha={best['alpha']} min_df={best['min_df']} "
          f"mean_macro_f1={best['mean_macro_f1']:.4f} (+/- {best['std_macro_f1']:.4f} std across folds)")

    # ---- refit on full dev-pool, evaluate once on held-out test ----
    dev_tokens = [tokenize(rows[i][1]) for i in dev_idx]
    test_tokens = [tokenize(rows[i][1]) for i in test_idx]
    dev_y = [labels_by_idx[i] for i in dev_idx]
    test_y = [labels_by_idx[i] for i in test_idx]

    nb = NaiveBayes(alpha=best["alpha"], min_df=best["min_df"]).fit_vocab(dev_tokens)
    Xdev = nb.vectorize(dev_tokens)
    Xtest = nb.vectorize(test_tokens)
    nb.fit(Xdev, dev_y, classes)
    test_pred = nb.predict(Xtest)
    test_proba = nb.predict_proba(Xtest)
    test_conf = test_proba.max(axis=1)

    model_acc = accuracy(test_y, test_pred)
    model_f1, model_per_class = macro_prf1(test_y, test_pred, classes)
    model_cm = confusion_matrix(test_y, test_pred, classes)

    # ---- control: majority-class baseline, fit on dev-pool only ----
    majority_label = Counter(dev_y).most_common(1)[0][0]
    control_pred = [majority_label] * len(test_y)
    control_acc = accuracy(test_y, control_pred)
    control_f1, control_per_class = macro_prf1(test_y, control_pred, classes)

    # ---- uncertainty ----
    model_correct = [1 if t == p else 0 for t, p in zip(test_y, test_pred)]
    control_correct = [1 if t == p else 0 for t, p in zip(test_y, control_pred)]

    model_acc_mean, model_acc_lo, model_acc_hi = bootstrap_ci(model_correct)
    control_acc_mean, control_acc_lo, control_acc_hi = bootstrap_ci(control_correct)
    model_f1_mean, model_f1_lo, model_f1_hi = bootstrap_macro_f1_ci(test_y, test_pred, classes)
    control_f1_mean, control_f1_lo, control_f1_hi = bootstrap_macro_f1_ci(test_y, control_pred, classes)

    diff_mean, diff_lo, diff_hi, p_not_better = paired_bootstrap_diff(model_correct, control_correct)

    print(f"\nTest accuracy: model={model_acc:.4f} [{model_acc_lo:.4f}, {model_acc_hi:.4f}] "
          f"vs control={control_acc:.4f} [{control_acc_lo:.4f}, {control_acc_hi:.4f}]")
    print(f"Test macro-F1: model={model_f1:.4f} [{model_f1_lo:.4f}, {model_f1_hi:.4f}] "
          f"vs control={control_f1:.4f} [{control_f1_lo:.4f}, {control_f1_hi:.4f}]")
    print(f"Accuracy gap (model-control): {diff_mean:.4f} 95% CI [{diff_lo:.4f}, {diff_hi:.4f}] "
          f"(P(gap<=0) under bootstrap = {p_not_better:.4f})")

    # ---- confidence-gated human fallback analysis ----
    thresholds = [0.0, 0.5, 0.6, 0.7, 0.8, 0.9]
    coverage_table = coverage_accuracy_at_thresholds(test_y, test_pred, test_conf, thresholds)
    print("\nConfidence-gated coverage/accuracy on test set:")
    for row in coverage_table:
        acc_str = f"{row['accuracy_on_kept']:.4f}" if row['accuracy_on_kept'] is not None else "n/a"
        print(f"  threshold={row['threshold']:.1f}: coverage={row['coverage']:.3f} "
              f"(n={row['n_kept']}) accuracy_on_kept={acc_str}")

    # Diagnostic: does the model's own confidence actually separate its errors?
    # Multinomial NB posteriors are known to saturate toward 0/1 (independence
    # assumption compounds many per-word likelihoods), so also check the raw,
    # un-normalized log-score margin between the top and runner-up class.
    scores = nb.decision_scores(Xtest)
    sorted_scores = np.sort(scores, axis=1)
    margin = sorted_scores[:, -1] - sorted_scores[:, -2]
    correct_mask = np.array(model_correct, dtype=bool)
    calibration_diagnostic = {
        "posterior_confidence": {
            "min": float(test_conf.min()),
            "median": float(np.median(test_conf)),
            "fraction_below_0.999": float((test_conf < 0.999).mean()),
            "note": "Posteriors saturate near 1.0 for almost all predictions, "
                    "including wrong ones, so they are not usable as-is to "
                    "decide when to defer to a human.",
        },
        "log_score_margin": {
            "mean_margin_correct": float(margin[correct_mask].mean()),
            "mean_margin_wrong": float(margin[~correct_mask].mean()),
            "margin_wrong_min_max": [float(margin[~correct_mask].min()), float(margin[~correct_mask].max())]
                                     if (~correct_mask).any() else None,
            "note": "Wrong predictions are not reliably lower-margin than correct "
                    "ones (some wrong predictions have near-maximal margin), so "
                    "margin-based abstention would miss most of the errors seen here.",
        },
    }
    print(f"\nCalibration diagnostic: posterior confidence min/median = "
          f"{calibration_diagnostic['posterior_confidence']['min']:.4f} / "
          f"{calibration_diagnostic['posterior_confidence']['median']:.4f}; "
          f"mean margin correct={calibration_diagnostic['log_score_margin']['mean_margin_correct']:.2f} "
          f"vs wrong={calibration_diagnostic['log_score_margin']['mean_margin_wrong']:.2f}")

    # ---- error examples for the report ----
    errors = []
    for i, (t, p, conf) in enumerate(zip(test_y, test_pred, test_conf)):
        if t != p:
            row_idx = test_idx[i]
            errors.append({
                "message": rows[row_idx][1],
                "true_label": t,
                "predicted_label": p,
                "confidence": float(conf),
            })

    metrics = {
        "seed": SEED,
        "dataset": {
            "n_rows": len(rows),
            "n_unique_message_groups": len(group_keys),
            "n_groups_with_duplicates": n_dup_groups,
            "n_groups_with_conflicting_labels": n_multi_label_groups,
            "class_distribution": dict(Counter(labels_by_idx)),
        },
        "split": {
            "dev_pool_rows": len(dev_idx),
            "dev_pool_groups": len(dev_keys),
            "test_rows": len(test_idx),
            "test_groups": len(test_keys),
            "method": "stratified group split (80/20), grouped by exact message text",
        },
        "model": {
            "type": "Multinomial Naive Bayes, bag-of-words, Laplace smoothing",
            "hyperparameters": {"alpha": best["alpha"], "min_df": best["min_df"]},
            "vocab_size": len(nb.vocab_),
            "cv_selection": {
                "method": "5-fold stratified group CV inside dev-pool, selecting max mean macro-F1",
                "top_5_results": cv_results[:5],
            },
        },
        "control": {
            "type": "majority-class baseline (predicts most frequent dev-pool label)",
            "majority_label": majority_label,
        },
        "test_results": {
            "model": {
                "accuracy": model_acc,
                "accuracy_ci95": [model_acc_lo, model_acc_hi],
                "macro_f1": model_f1,
                "macro_f1_ci95": [model_f1_lo, model_f1_hi],
                "per_class": model_per_class,
                "confusion_matrix": {"classes": classes, "matrix": model_cm.tolist()},
            },
            "control": {
                "accuracy": control_acc,
                "accuracy_ci95": [control_acc_lo, control_acc_hi],
                "macro_f1": control_f1,
                "macro_f1_ci95": [control_f1_lo, control_f1_hi],
                "per_class": control_per_class,
            },
            "model_vs_control_accuracy_gap": {
                "mean": diff_mean,
                "ci95": [diff_lo, diff_hi],
                "bootstrap_p_gap_le_0": p_not_better,
            },
        },
        "human_fallback_analysis": {
            "description": "Coverage/accuracy if low-confidence predictions (max posterior "
                            "probability below threshold) are routed to a human instead of "
                            "auto-routed.",
            "thresholds": coverage_table,
            "calibration_diagnostic": calibration_diagnostic,
        },
        "test_set_errors": errors,
    }

    with open(OUT_METRICS, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"\nWrote {OUT_METRICS}")


if __name__ == "__main__":
    main()
