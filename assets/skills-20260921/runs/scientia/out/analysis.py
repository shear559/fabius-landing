#!/usr/bin/env python3
"""
Differential expression analysis: control vs treated (3 vs 3 RNA-seq samples).

Design: raw counts -> median-of-ratios size factors -> log2(normalized+1) ->
per-gene OLS regression on [intercept, condition, sequencing_run] -> t-test on
the condition coefficient -> Benjamini-Hochberg FDR control.

The sequencing_run batch is included as a covariate because it is NOT
perfectly confounded with condition in this design (ctrl: A,A,B; treated:
A,B,B), so its effect is separable, however imperfectly with only 6 samples.

Inputs (relative to this script's parent directory): counts.csv, metadata.csv
Outputs (in ./out/): results.csv, volcano.svg, REPORT.md (written by this run)
"""
import csv
import os
import numpy as np
from scipy import stats

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = HERE

ALPHA = 0.05          # FDR threshold for calling a gene significant
MIN_MEAN_NORM = 5.0   # minimum mean normalized count to keep a gene (removes noise-dominated genes)
PSEUDOCOUNT = 1.0


def load_data():
    with open(os.path.join(ROOT, "counts.csv")) as f:
        rows = list(csv.reader(f))
    header = rows[0]
    samples = header[1:]
    genes = [row[0] for row in rows[1:]]
    counts = np.array([[int(x) for x in row[1:]] for row in rows[1:]], dtype=float)

    with open(os.path.join(ROOT, "metadata.csv")) as f:
        meta_rows = list(csv.DictReader(f))
    meta = {r["sample"]: r for r in meta_rows}
    # align metadata to the sample column order in counts.csv
    conditions = [meta[s]["condition"] for s in samples]
    runs = [meta[s]["sequencing_run"] for s in samples]
    return genes, samples, counts, conditions, runs


def median_of_ratios_size_factors(counts):
    """DESeq2-style normalization: robust to a handful of highly variable genes."""
    with np.errstate(divide="ignore"):
        log_counts = np.log(counts)
    # geometric mean across samples, using only genes with nonzero counts in every sample
    valid = np.all(counts > 0, axis=1)
    ref_log_mean = log_counts[valid].mean(axis=1)
    ratios = log_counts[valid] - ref_log_mean[:, None]
    log_size_factors = np.median(ratios, axis=0)
    return np.exp(log_size_factors)


def bh_fdr(pvals):
    """Benjamini-Hochberg adjusted p-values."""
    p = np.asarray(pvals)
    n = len(p)
    order = np.argsort(p)
    ranked = p[order] * n / (np.arange(n) + 1)
    # enforce monotonicity from the largest p-value down
    adj_sorted = np.minimum.accumulate(ranked[::-1])[::-1]
    adj = np.empty(n)
    adj[order] = np.clip(adj_sorted, 0, 1)
    return adj


def write_svg_volcano(path, log2fc, neglog10p, called, gene_labels, top_n=10):
    W, H = 720, 560
    margin_l, margin_r, margin_t, margin_b = 70, 30, 30, 60
    plot_w, plot_h = W - margin_l - margin_r, H - margin_t - margin_b

    x_min, x_max = np.floor(min(log2fc.min(), -1) - 0.5), np.ceil(max(log2fc.max(), 1) + 0.5)
    y_min, y_max = 0.0, max(neglog10p.max() * 1.08, 1.0)

    def sx(x):
        return margin_l + (x - x_min) / (x_max - x_min) * plot_w

    def sy(y):
        return margin_t + plot_h - (y - y_min) / (y_max - y_min) * plot_h

    sig_thresh_y = sy(-np.log10(ALPHA))

    parts = []
    parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
                  f'viewBox="0 0 {W} {H}" font-family="Helvetica,Arial,sans-serif">')
    parts.append(f'<rect x="0" y="0" width="{W}" height="{H}" fill="white"/>')

    # axes
    parts.append(f'<line x1="{margin_l}" y1="{margin_t}" x2="{margin_l}" y2="{margin_t+plot_h}" stroke="black" stroke-width="1"/>')
    parts.append(f'<line x1="{margin_l}" y1="{margin_t+plot_h}" x2="{margin_l+plot_w}" y2="{margin_t+plot_h}" stroke="black" stroke-width="1"/>')

    # significance threshold line (dashed)
    parts.append(f'<line x1="{margin_l}" y1="{sig_thresh_y:.1f}" x2="{margin_l+plot_w}" y2="{sig_thresh_y:.1f}" '
                  f'stroke="#999999" stroke-width="1" stroke-dasharray="4,3"/>')
    parts.append(f'<text x="{margin_l+plot_w-4}" y="{sig_thresh_y-4:.1f}" font-size="10" fill="#666666" text-anchor="end">'
                  f'padj = {ALPHA}</text>')

    # x ticks
    for xt in np.arange(np.ceil(x_min), np.floor(x_max) + 1, 1):
        xp = sx(xt)
        parts.append(f'<line x1="{xp:.1f}" y1="{margin_t+plot_h}" x2="{xp:.1f}" y2="{margin_t+plot_h+5}" stroke="black"/>')
        parts.append(f'<text x="{xp:.1f}" y="{margin_t+plot_h+18}" font-size="10" text-anchor="middle">{xt:.0f}</text>')
    # y ticks
    for yt in np.linspace(0, y_max, 5):
        yp = sy(yt)
        parts.append(f'<line x1="{margin_l-5}" y1="{yp:.1f}" x2="{margin_l}" y2="{yp:.1f}" stroke="black"/>')
        parts.append(f'<text x="{margin_l-8}" y="{yp+3:.1f}" font-size="10" text-anchor="end">{yt:.1f}</text>')

    parts.append(f'<text x="{margin_l+plot_w/2:.1f}" y="{H-12}" font-size="12" text-anchor="middle">log2 fold change (treated vs control)</text>')
    parts.append(f'<text x="14" y="{margin_t+plot_h/2:.1f}" font-size="12" text-anchor="middle" '
                  f'transform="rotate(-90 14 {margin_t+plot_h/2:.1f})">-log10(p value)</text>')
    parts.append(f'<text x="{W/2}" y="18" font-size="14" text-anchor="middle" font-weight="bold">Volcano plot: treated vs control</text>')

    # points
    for i in range(len(log2fc)):
        cx, cy = sx(log2fc[i]), sy(neglog10p[i])
        color = "#d62728" if called[i] else "#7f7f7f"
        r = 3.2 if called[i] else 2.2
        op = 0.9 if called[i] else 0.45
        parts.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="{color}" fill-opacity="{op}"/>')

    # label top called genes by p value
    called_idx = np.where(called)[0]
    if len(called_idx) > 0:
        top = called_idx[np.argsort(neglog10p[called_idx])[::-1][:top_n]]
        for i in top:
            cx, cy = sx(log2fc[i]), sy(neglog10p[i])
            parts.append(f'<text x="{cx+5:.1f}" y="{cy-4:.1f}" font-size="8.5" fill="#333333">{gene_labels[i]}</text>')

    # legend
    lx, ly = margin_l + 10, margin_t + 10
    parts.append(f'<circle cx="{lx}" cy="{ly}" r="3.2" fill="#d62728" fill-opacity="0.9"/>')
    parts.append(f'<text x="{lx+8}" y="{ly+3}" font-size="10">called (padj &lt; {ALPHA})</text>')
    parts.append(f'<circle cx="{lx}" cy="{ly+16}" r="2.2" fill="#7f7f7f" fill-opacity="0.45"/>')
    parts.append(f'<text x="{lx+8}" y="{ly+19}" font-size="10">not called</text>')

    parts.append('</svg>')
    with open(path, "w") as f:
        f.write("\n".join(parts))


def main():
    genes, samples, counts, conditions, runs = load_data()
    n = len(samples)

    size_factors = median_of_ratios_size_factors(counts)
    norm_counts = counts / size_factors[None, :]

    mean_norm = norm_counts.mean(axis=1)
    keep = mean_norm >= MIN_MEAN_NORM
    n_dropped = int((~keep).sum())

    genes_f = [g for g, k in zip(genes, keep) if k]
    norm_f = norm_counts[keep]
    mean_f = mean_norm[keep]

    y = np.log2(norm_f + PSEUDOCOUNT)  # genes x samples

    condition_bin = np.array([1.0 if c == "treated" else 0.0 for c in conditions])
    run_levels = sorted(set(runs))
    run_bin = np.array([0.0 if r == run_levels[0] else 1.0 for r in runs])
    X = np.column_stack([np.ones(n), condition_bin, run_bin])  # n x p
    p = X.shape[1]
    df_resid = n - p

    XtX_inv = np.linalg.inv(X.T @ X)
    beta = XtX_inv @ X.T @ y.T  # p x genes
    fitted = X @ beta            # n x genes
    resid = y.T - fitted
    rss = np.sum(resid ** 2, axis=0)
    sigma2 = rss / df_resid

    log2fc = beta[1]  # condition coefficient
    se = np.sqrt(sigma2 * XtX_inv[1, 1])
    with np.errstate(divide="ignore", invalid="ignore"):
        tstat = np.where(se > 0, log2fc / se, 0.0)
    pvals = 2 * stats.t.sf(np.abs(tstat), df=df_resid)
    pvals = np.clip(pvals, 0, 1)
    padj = bh_fdr(pvals)
    called = padj < ALPHA

    # write results.csv
    results_path = os.path.join(OUT, "results.csv")
    with open(results_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["gene", "mean_expression", "log2_fold_change", "p_value", "adjusted_p_value", "called"])
        order = np.argsort(pvals)
        for i in order:
            w.writerow([
                genes_f[i],
                f"{mean_f[i]:.4f}",
                f"{log2fc[i]:.4f}",
                f"{pvals[i]:.6g}",
                f"{padj[i]:.6g}",
                bool(called[i]),
            ])

    neglog10p = -np.log10(np.clip(pvals, 1e-300, 1))
    write_svg_volcano(os.path.join(OUT, "volcano.svg"), log2fc, neglog10p, called, genes_f)

    # unadjusted (no batch covariate) comparison, for the confounding discussion in the report
    X0 = np.column_stack([np.ones(n), condition_bin])
    X0tX0_inv = np.linalg.inv(X0.T @ X0)
    beta0 = X0tX0_inv @ X0.T @ y.T
    resid0 = y.T - X0 @ beta0
    df0 = n - X0.shape[1]
    sigma20 = np.sum(resid0 ** 2, axis=0) / df0
    se0 = np.sqrt(sigma20 * X0tX0_inv[1, 1])
    with np.errstate(divide="ignore", invalid="ignore"):
        t0 = np.where(se0 > 0, beta0[1] / se0, 0.0)
    p0 = np.clip(2 * stats.t.sf(np.abs(t0), df=df0), 0, 1)
    padj0 = bh_fdr(p0)
    called0 = padj0 < ALPHA

    print(f"Loaded {len(genes)} genes x {n} samples")
    print(f"Size factors: {dict(zip(samples, np.round(size_factors, 3)))}")
    print(f"Filtered out {n_dropped} genes with mean normalized count < {MIN_MEAN_NORM}; {len(genes_f)} genes tested")
    print(f"Design matrix X (intercept, condition, run):\n{X}")
    print(f"Residual df = {df_resid}")
    print(f"[batch-adjusted]  genes called at FDR<{ALPHA}: {int(called.sum())}")
    print(f"[condition-only]  genes called at FDR<{ALPHA}: {int(called0.sum())}")
    overlap = int(np.sum(called & called0))
    print(f"Overlap between the two call sets: {overlap}")
    print(f"Wrote {results_path}")
    print(f"Wrote {os.path.join(OUT, 'volcano.svg')}")


if __name__ == "__main__":
    main()
