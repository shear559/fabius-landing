#!/usr/bin/env python3
"""Differential expression for the yeast treated-vs-control experiment.

Reruns end to end from counts.csv + metadata.csv:
    python3 product/analysis.py                # analysis + simulation self-test and power (~1.5 min)
                                               # -> out/results.csv, out/stats.json, product/data.js,
                                               #    out/analysis-output.txt (copy of the console log)
    python3 product/analysis.py --no-selftest  # skip the simulation (known-truth FDR / power check)

Method: a DESeq2-style negative-binomial GLM written in numpy/scipy (DESeq2 / pydeseq2
are not installable here). Steps, in order:
  1. median-of-ratios size factors (library size + composition)
  2. per-gene NB GLM, design ~ run + condition, fitted by IRLS
  3. gene-wise dispersion: Cox-Reid adjusted profile likelihood
  4. dispersion trend alpha(mu) = a0 + a1/mu (gamma GLM, iterative outlier removal)
  5. empirical-Bayes (MAP) shrinkage of dispersions toward the trend
  6. Wald test for the condition coefficient against t(residual df + prior df), BH FDR
  7. normal-prior shrunken log2 fold change (for ranking/plotting; tests use the MLE)
  8. Cook's distances, sample PCA on a variance-stabilised scale, run-effect LRT,
     sensitivity analyses (no-run model, t-reference p-values, leave-one-out)
"""
import csv
import json
import os
import sys

import numpy as np
from scipy import optimize, special, stats

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALPHA_FDR = 0.05
MIN_DISP = 1e-8
LN2 = np.log(2.0)


# ---------------------------------------------------------------- input
def read_inputs():
    with open(os.path.join(ROOT, "metadata.csv")) as f:
        meta = list(csv.DictReader(f))
    with open(os.path.join(ROOT, "counts.csv")) as f:
        rows = list(csv.reader(f))
    header = rows[0][1:]
    order = [header.index(m["sample"]) for m in meta]  # align counts columns to metadata rows
    genes = [r[0] for r in rows[1:]]
    counts = np.array([[float(r[1:][j]) for j in order] for r in rows[1:]])
    assert counts.shape == (2000, 6), counts.shape
    assert np.all(counts >= 0) and np.all(counts == np.round(counts)), "counts must be raw non-negative integers"
    assert len(set(genes)) == len(genes), "duplicate gene IDs"
    return genes, meta, counts


def design(meta, with_run=True):
    cond = np.array([m["condition"] == "treated" for m in meta], float)
    run = np.array([m["sequencing_run"] == "B" for m in meta], float)
    cols = [np.ones(len(meta))] + ([run] if with_run else []) + [cond]
    return np.column_stack(cols)  # condition is always the last column


# ---------------------------------------------------------------- core NB machinery
def size_factors(counts):
    pos = np.all(counts > 0, axis=1)
    logc = np.log(counts[pos])
    logref = logc.mean(axis=1, keepdims=True)
    return np.exp(np.median(logc - logref, axis=0)), int(pos.sum())


def nb_loglik(y, mu, alpha):
    r = 1.0 / alpha
    return (special.gammaln(y + r) - special.gammaln(r) - special.gammaln(y + 1)
            + r * np.log(r / (r + mu)) + y * np.log(np.where(y > 0, mu / (r + mu), 1.0)))


def fit_glm(y, sf, X, alpha, ridge=None, maxit=100, tol=1e-8):
    """Vectorised IRLS for NB GLM (log link, offset log sf). y: G x m, alpha: G.
    ridge: optional per-coefficient penalty on the natural-log scale (p,), for LFC shrinkage."""
    G, m = y.shape
    p = X.shape[1]
    lam = np.full(p, 1e-6) if ridge is None else np.asarray(ridge, float)
    a = alpha[:, None]
    beta = np.linalg.lstsq(X, np.log(y / sf + 0.1).T, rcond=None)[0].T
    dev_old = np.full(G, np.inf)
    for _ in range(maxit):
        mu = np.clip(sf * np.exp(np.clip(beta @ X.T, -30, 30)), 1e-10, 1e12)
        w = mu / (1 + a * mu)
        z = np.log(mu / sf) + (y - mu) / mu
        XtWX = np.einsum("mp,gm,mq->gpq", X, w, X) + np.diag(lam)
        XtWz = np.einsum("mp,gm->gp", X, w * z)
        beta = np.linalg.solve(XtWX, XtWz[..., None])[..., 0]
        beta = np.clip(beta, -30, 30)
        mu = np.clip(sf * np.exp(beta @ X.T), 1e-10, 1e12)
        dev = -2 * nb_loglik(y, mu, a).sum(1)
        if np.all(np.abs(dev - dev_old) / (np.abs(dev) + 0.1) < tol):
            break
        dev_old = dev
    w = mu / (1 + a * mu)
    XtWX = np.einsum("mp,gm,mq->gpq", X, w, X) + np.diag(lam)
    cov_inv = np.linalg.inv(XtWX)
    # sandwich form, as DESeq2 does when a prior (ridge) is used
    XtWX_noprior = np.einsum("mp,gm,mq->gpq", X, w, X)
    cov = cov_inv @ XtWX_noprior @ cov_inv
    se = np.sqrt(np.clip(np.einsum("gpp->gp", cov), 0, None))
    return beta, se, mu, w, cov_inv


def cr_loglik(y, mu, X, log_alpha):
    """Cox-Reid adjusted profile log-likelihood. log_alpha: G x K grid -> G x K."""
    a = np.exp(log_alpha)[:, :, None]            # G K 1
    muk = mu[:, None, :]                          # G 1 m
    ll = nb_loglik(y[:, None, :], muk, a).sum(-1)
    w = muk / (1 + a * muk)
    XtWX = np.einsum("mp,gkm,mq->gkpq", X, w, X)
    return ll - 0.5 * np.linalg.slogdet(XtWX)[1]


def optimise_log_alpha(obj, G, lo, hi, n=121, refine=3):
    """Grid search then successive local refinement of a concave-ish 1-D objective, per gene."""
    grid = np.linspace(lo, hi, n)
    la = np.tile(grid, (G, 1))
    vals = obj(la)
    best = la[np.arange(G), vals.argmax(1)]
    step = grid[1] - grid[0]
    for _ in range(refine):
        la = best[:, None] + np.linspace(-step, step, 21)[None, :]
        la = np.clip(la, lo, hi)
        vals = obj(la)
        best = la[np.arange(G), vals.argmax(1)]
        step /= 10
    return best


def fit_trend(base_mean, disp_gw):
    """alpha(mu) = a0 + a1/mu by gamma-family GLM with identity link (DESeq2 parametric fit)."""
    use = disp_gw > 100 * MIN_DISP
    coef = np.array([0.1, 1.0])
    for _ in range(20):
        mu, d = base_mean[use], disp_gw[use]

        def nll(lc):
            f = np.exp(lc[0]) + np.exp(lc[1]) / mu
            return np.sum(d / f + np.log(f))

        new = np.exp(optimize.minimize(nll, np.log(coef), method="Nelder-Mead",
                                       options={"xatol": 1e-10, "fatol": 1e-10, "maxiter": 4000}).x)
        ratio = disp_gw / (new[0] + new[1] / base_mean)
        use = (disp_gw > 100 * MIN_DISP) & (ratio > 1e-4) & (ratio < 15)
        done = np.all(np.abs(np.log(new / coef)) < 1e-6)
        coef = new
        if done:
            break
    return coef


def bh(p):
    p = np.asarray(p, float)
    out = np.full_like(p, np.nan)
    ok = ~np.isnan(p)
    pv = p[ok]
    n = len(pv)
    order = np.argsort(pv)
    ranked = pv[order] * n / np.arange(1, n + 1)
    ranked = np.minimum.accumulate(ranked[::-1])[::-1]
    res = np.empty(n)
    res[order] = np.minimum(ranked, 1)
    out[ok] = res
    return out


def de_pipeline(counts, X, sf=None):
    """Full DE pipeline on a count matrix. Returns a dict of per-gene arrays + model constants."""
    G, m = counts.shape
    p = X.shape[1]
    if sf is None:
        sf, _ = size_factors(counts)
    norm = counts / sf
    base_mean = norm.mean(1)
    keep = counts.sum(1) >= 10  # pre-filter: genes with <10 reads in total carry no information
    y = counts[keep]
    bm = base_mean[keep]
    Gk = y.shape[0]
    hi = np.log(max(10.0, m))
    lo = np.log(MIN_DISP)

    # gene-wise dispersion, alternating with mu (2 rounds)
    alpha = np.full(Gk, 0.1)
    for _ in range(3):
        _, _, mu, _, _ = fit_glm(y, sf, X, alpha)
        alpha = np.exp(optimise_log_alpha(lambda la: cr_loglik(y, mu, X, la), Gk, lo, hi))
    disp_gw = alpha
    mu_gw = mu

    a0, a1 = fit_trend(bm, disp_gw)
    trend = a0 + a1 / bm
    use = disp_gw >= 100 * MIN_DISP
    resid = np.log(disp_gw[use]) - np.log(trend[use])
    var_log = (stats.median_abs_deviation(resid, scale="normal")) ** 2
    exp_var = special.polygamma(1, (m - p) / 2.0)
    sigma2 = max(var_log - exp_var, 0.25)
    lt = np.log(trend)
    disp_map = np.exp(optimise_log_alpha(
        lambda la: cr_loglik(y, mu_gw, X, la) - (la - lt[:, None]) ** 2 / (2 * sigma2), Gk, lo, hi))
    disp_outlier = np.log(disp_gw) > lt + 2 * np.sqrt(sigma2)
    disp_final = np.where(disp_outlier, disp_gw, disp_map)

    beta, se, mu, w, cov_inv = fit_glm(y, sf, X, disp_final)
    lfc = beta[:, -1] / LN2
    lfc_se = se[:, -1] / LN2
    stat = beta[:, -1] / se[:, -1]
    # Reference distribution: with 3 residual df a standard-normal Wald test is anti-conservative
    # (checked by simulation, see --selftest / out/calib.py). Use t with df = residual df + the prior df
    # implied by the dispersion shrinkage, d0 solving trigamma(d0/2) = prior var(log dispersion).
    d0 = 2 * optimize.brentq(lambda x: special.polygamma(1, x) - sigma2, 1e-3, 1e6)
    df_test = (m - p) + d0
    pval = 2 * stats.t.sf(np.abs(stat), df_test)
    pval_normal = 2 * stats.norm.sf(np.abs(stat))

    # Cook's distance (DESeq2 definition, using the final dispersion)
    h = np.einsum("gm,mp,gpq,mq->gm", w, X, cov_inv, X)
    pearson2 = (y - mu) ** 2 / (mu + disp_final[:, None] * mu ** 2)
    cooks = pearson2 / p * h / (1 - h) ** 2

    def expand(v, fill=np.nan):
        out = np.full((G,) + v.shape[1:], fill, float)
        out[keep] = v
        return out

    return dict(
        sf=sf, keep=keep, base_mean=base_mean, norm=norm,
        lfc=expand(lfc), lfc_se=expand(lfc_se), stat=expand(stat), pvalue=expand(pval),
        pvalue_normal=expand(pval_normal), df_test=float(df_test), d0=float(d0),
        padj=bh(expand(pval)), beta=expand(beta), se_all=expand(se),
        disp_gw=expand(disp_gw), disp_trend=expand(trend), disp_map=expand(disp_map),
        disp_final=expand(disp_final), disp_outlier=expand(disp_outlier.astype(float), 0) > 0,
        cooks=expand(cooks), mu=expand(mu),
        trend_coef=(float(a0), float(a1)), sigma2_prior=float(sigma2),
        var_log_disp=float(var_log), exp_var_log_disp=float(exp_var),
    )


def shrink_lfc(counts, X, res):
    """Normal-prior LFC shrinkage (DESeq2 betaPrior=TRUE style). Prior width from the upper
    quantile of the MLE LFCs; the fit is a ridge-penalised NB GLM with the final dispersions."""
    keep = res["keep"]
    mle = res["lfc"][keep]
    finite = np.abs(mle) < 10
    q = np.quantile(np.abs(mle[finite]), 0.95)
    sd_prior_log2 = q / stats.norm.ppf(0.975)
    ridge = np.full(X.shape[1], 1e-6)
    ridge[-1] = 1.0 / (sd_prior_log2 * LN2) ** 2
    beta, se, *_ = fit_glm(counts[keep], res["sf"], X, res["disp_final"][keep], ridge=ridge)
    out = np.full(len(keep), np.nan)
    out[keep] = beta[:, -1] / LN2
    return out, float(sd_prior_log2)


def vst(norm, a0, a1):
    """DESeq2 closed-form VST for the parametric dispersion trend."""
    q = norm
    return np.log2((1 + a1 + 2 * a0 * q + 2 * np.sqrt(a0 * q * (1 + a1 + a0 * q))) / (4 * a0))


def pca(mat):
    """mat: genes x samples. Uses the 500 most variable genes, as DESeq2's plotPCA."""
    top = np.argsort(mat.var(1))[::-1][:500]
    Z = mat[top].T - mat[top].T.mean(0)
    U, S, Vt = np.linalg.svd(Z, full_matrices=False)
    scores = U * S
    var = S ** 2 / np.sum(S ** 2)
    return scores[:, :2], var[:2]


# ---------------------------------------------------------------- self-test
def selftest(res, X, n_rep=4, seed=7):
    """Simulate NB counts with this experiment's size factors, means, dispersion trend and a
    run effect; 10% true DE genes. Report the realised FDR and power of the pipeline."""
    rng = np.random.default_rng(seed)
    keep = res["keep"]
    bm = res["base_mean"][keep]
    a0, a1 = res["trend_coef"]
    out = []
    for r in range(n_rep):
        G = len(bm)
        base = rng.choice(bm, G)
        disp = (a0 + a1 / base) * np.exp(rng.normal(0, np.sqrt(res["sigma2_prior"]), G))
        de = rng.random(G) < 0.10
        lfc = np.where(de, rng.choice([-1, 1], G) * rng.uniform(0.5, 2.5, G), 0.0)
        run = rng.normal(0, 0.3, G)
        logmu = (np.log(base)[:, None] + X[:, 1][None, :] * run[:, None]
                 + X[:, -1][None, :] * (lfc * LN2)[:, None])
        mu = res["sf"][None, :] * np.exp(logmu)
        r_ = 1 / disp[:, None]
        sim = rng.negative_binomial(r_, r_ / (r_ + mu)).astype(float)
        sres = de_pipeline(sim, X)
        call = sres["padj"] < ALPHA_FDR
        tp = int(np.sum(call & de))
        fp = int(np.sum(call & ~de))
        out.append(dict(rep=r, n_true_de=int(de.sum()), n_called=int(call.sum()), tp=tp, fp=fp,
                        fdr=fp / max(1, call.sum()), power=tp / max(1, de.sum()),
                        sign_errors=int(np.sum(call & de & (np.sign(sres["lfc"]) != np.sign(lfc)))),
                        ci95_coverage=float(np.nanmean(
                            np.abs(sres["lfc"] - lfc)[sres["keep"]]
                            <= stats.t.ppf(0.975, sres["df_test"]) * sres["lfc_se"][sres["keep"]])),
                        null_p_lt_001=float(np.mean(sres["pvalue"][sres["keep"] & ~de] < 0.001)),
                        fdr_normal_ref=float(np.sum((bh(sres["pvalue_normal"]) < ALPHA_FDR) & ~de)
                                             / max(1, np.sum(bh(sres["pvalue_normal"]) < ALPHA_FDR)))))
        print("  selftest rep %d: true DE %d, called %d, TP %d, FP %d, FDR %.3f, power %.3f, CI coverage %.3f, "
              "null P(p<0.001) %.4f; FDR if normal reference %.3f"
              % (r, out[-1]["n_true_de"], out[-1]["n_called"], tp, fp, out[-1]["fdr"], out[-1]["power"],
                 out[-1]["ci95_coverage"], out[-1]["null_p_lt_001"], out[-1]["fdr_normal_ref"]))
    return out


POWER_FOLDS = (1.5, 2.0, 3.0, 4.0, 8.0)
POWER_BANDS = ((0, 100), (100, 1000), (1000, float("inf")))


def power_by_fold(res, X, pis=((0.10, 4), (0.03, 8)), seed=11):
    """Sensitivity of the exact test used here, by true fold change. Same simulation as selftest,
    but every changed gene gets one of POWER_FOLDS (equal shares, random direction), so the share
    detected at FDR 5 % can be read off per fold size. Repeated for two shares of changed genes,
    because Benjamini-Hochberg power depends on how many genes truly change. The share of changed
    genes in the real data is unknown; the mean number of genes called per simulated data set is
    reported so it can be compared with the real list. pis = ((share changed, repeats), ...)."""
    rng = np.random.default_rng(seed)
    keep = res["keep"]
    bm = res["base_mean"][keep]
    a0, a1 = res["trend_coef"]
    lf = np.log2(POWER_FOLDS)
    out = []
    for pi, n_rep in pis:
        hit = np.zeros((len(lf), len(POWER_BANDS) + 1))
        tot = np.zeros_like(hit)
        fp = called = 0
        for r in range(n_rep):
            G = len(bm)
            base = rng.choice(bm, G)
            disp = (a0 + a1 / base) * np.exp(rng.normal(0, np.sqrt(res["sigma2_prior"]), G))
            de = rng.random(G) < pi
            lvl = rng.integers(0, len(lf), G)
            lfc = np.where(de, rng.choice([-1, 1], G) * lf[lvl], 0.0)
            run = rng.normal(0, 0.3, G)
            logmu = (np.log(base)[:, None] + X[:, 1][None, :] * run[:, None]
                     + X[:, -1][None, :] * (lfc * LN2)[:, None])
            mu = res["sf"][None, :] * np.exp(logmu)
            r_ = 1 / disp[:, None]
            sim = rng.negative_binomial(r_, r_ / (r_ + mu)).astype(float)
            sres = de_pipeline(sim, X)
            call = (sres["padj"] < ALPHA_FDR) & (np.sign(sres["lfc"]) == np.sign(lfc))
            anycall = sres["padj"] < ALPHA_FDR
            fp += int(np.sum(anycall & ~de))
            called += int(anycall.sum())
            bmean = sres["base_mean"]
            for k in range(len(lf)):
                sel = de & (lvl == k)
                hit[k, 0] += np.sum(call & sel)
                tot[k, 0] += np.sum(sel)
                for b, (lo, hi_) in enumerate(POWER_BANDS):
                    sb = sel & (bmean >= lo) & (bmean < hi_)
                    hit[k, b + 1] += np.sum(call & sb)
                    tot[k, b + 1] += np.sum(sb)
        pw = hit / np.maximum(tot, 1)
        out.append(dict(pi=pi, n_rep=n_rep, fdr=fp / max(1, called), mean_called=called / n_rep,
                        folds=[dict(fold=f, n=int(tot[k, 0]), power=float(pw[k, 0]),
                                    by_mean=[dict(lo=lo, hi=(None if not np.isfinite(hi_) else hi_),
                                                  n=int(tot[k, b + 1]), power=float(pw[k, b + 1]))
                                             for b, (lo, hi_) in enumerate(POWER_BANDS)])
                               for k, f in enumerate(POWER_FOLDS)]))
        print("  %d %% of genes changed (%d repeats, %.1f genes called per data set, realised FDR %.3f): "
              % (round(pi * 100), n_rep, called / n_rep, out[-1]["fdr"])
              + "; ".join("%g-fold %.0f %% (n=%d; mean<100 %.0f %%, 100-1000 %.0f %%, >=1000 %.0f %%)"
                          % (f, 100 * pw[k, 0], tot[k, 0], 100 * pw[k, 1], 100 * pw[k, 2], 100 * pw[k, 3])
                          for k, f in enumerate(POWER_FOLDS)))
    return out


# ---------------------------------------------------------------- main
def main():
    genes, meta, counts = read_inputs()
    samples = [m["sample"] for m in meta]
    X = design(meta, with_run=True)
    X0 = design(meta, with_run=False)
    G, m = counts.shape
    sf, n_sf_genes = size_factors(counts)
    lib = counts.sum(0)

    # design diagnostics: is run separable from condition?
    cond, run = X[:, 2], X[:, 1]
    r_cr = float(np.corrcoef(cond, run)[0, 1])
    var_full = np.linalg.inv(X.T @ X)[2, 2]
    var_norun = np.linalg.inv(X0.T @ X0)[1, 1]
    rank = int(np.linalg.matrix_rank(X))
    Xint = np.column_stack([X, cond * run])

    res = de_pipeline(counts, X, sf)
    keep = res["keep"]
    lfc_shr, sd_prior = shrink_lfc(counts, X, res)
    padj = res["padj"]
    sig = padj < ALPHA_FDR
    tq = stats.t.ppf(0.975, res["df_test"])
    ci_lo = res["lfc"] - tq * res["lfc_se"]
    ci_hi = res["lfc"] + tq * res["lfc_se"]

    # Cook's outliers: DESeq2 cutoff F(0.99, p, m - p)
    p = X.shape[1]
    cook_cut = float(stats.f.ppf(0.99, p, m - p))
    cook_flag = np.nanmax(np.nan_to_num(res["cooks"], nan=0), axis=1) > cook_cut
    cook_by_sample = {s: int(np.sum(np.nan_to_num(res["cooks"][:, j]) > cook_cut)) for j, s in enumerate(samples)}

    # run effect: LRT of ~run+condition vs ~condition, both with the final dispersions
    y = counts[keep]
    d = res["disp_final"][keep]
    _, _, mu_full, _, _ = fit_glm(y, sf, X, d)
    _, _, mu_red, _, _ = fit_glm(y, sf, X0, d)
    lr = 2 * (nb_loglik(y, mu_full, d[:, None]).sum(1) - nb_loglik(y, mu_red, d[:, None]).sum(1))
    p_run = np.full(G, np.nan)
    p_run[keep] = stats.chi2.sf(np.clip(lr, 0, None), 1)
    padj_run = bh(p_run)
    run_lfc = res["beta"][:, 1] / LN2

    # sensitivity 1: ignore run
    res0 = de_pipeline(counts, X0, sf)
    sig0 = res0["padj"] < ALPHA_FDR
    # sensitivity 2: reference distributions — standard normal (DESeq2 default, too liberal here)
    # and t(3) (residual df only, ignores the information borrowed across genes; too strict)
    sig_norm = bh(res["pvalue_normal"]) < ALPHA_FDR
    p_t = 2 * stats.t.sf(np.abs(res["stat"]), m - p)
    sig_t = bh(p_t) < ALPHA_FDR
    # sensitivity 3: leave one sample out (design stays full rank for every drop)
    loo = {}
    for j, s in enumerate(samples):
        idx = [k for k in range(m) if k != j]
        Xj = X[idx]
        if np.linalg.matrix_rank(Xj) < p:
            loo[s] = None
            continue
        rj = de_pipeline(counts[:, idx], Xj, sf[idx])
        sj = rj["padj"] < ALPHA_FDR
        loo[s] = dict(n_sig=int(sj.sum()), overlap=int(np.sum(sj & sig)),
                      lfc_r=float(np.corrcoef(rj["lfc"][keep & rj["keep"]], res["lfc"][keep & rj["keep"]])[0, 1]))
    # sensitivity 4: interaction model (condition effect allowed to differ by run) — residual df
    int_df = m - np.linalg.matrix_rank(Xint)

    # sample QC: VST, PCA, distances
    a0, a1 = res["trend_coef"]
    v = vst(res["norm"], a0, a1)
    scores, varexp = pca(v[keep])
    dist = np.sqrt(((v[keep][:, :, None] - v[keep][:, None, :]) ** 2).sum(0))
    corr = np.corrcoef(v[keep].T)

    # minimum detectable |LFC| at the observed SEs (Wald z at the BH cut-off of the observed list)
    if sig.sum():
        z_cut = float(np.min(np.abs(res["stat"][sig])))
    else:
        z_cut = float("nan")

    # ------------------------------------------------ outputs
    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
    order = np.lexsort((np.nan_to_num(res["pvalue"], nan=2), np.nan_to_num(padj, nan=2)))
    with open(os.path.join(ROOT, "out", "results.csv"), "w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["gene", "baseMean", "log2FC", "lfcSE", "ci95_low", "ci95_high", "log2FC_shrunk",
                     "wald_stat", "pvalue", "padj", "significant_fdr05", "direction",
                     "run_log2FC", "run_padj", "dispersion", "dispersion_genewise", "dispersion_trend",
                     "max_cooks", "cooks_outlier", "tested"] + ["norm_" + s for s in samples])
        for i in order:
            t = bool(keep[i])
            def fm(x, nd=6):
                return "" if not np.isfinite(x) else ("%.*g" % (nd, x))
            wr.writerow([genes[i], fm(res["base_mean"][i]), fm(res["lfc"][i]), fm(res["lfc_se"][i]),
                         fm(ci_lo[i]), fm(ci_hi[i]), fm(lfc_shr[i]), fm(res["stat"][i]), fm(res["pvalue"][i]),
                         fm(padj[i]), "yes" if sig[i] else "no",
                         ("up" if res["lfc"][i] > 0 else "down") if sig[i] else "",
                         fm(run_lfc[i]), fm(padj_run[i]), fm(res["disp_final"][i]), fm(res["disp_gw"][i]),
                         fm(res["disp_trend"][i]), fm(np.nanmax(res["cooks"][i]) if t else np.nan),
                         "yes" if cook_flag[i] else "no", "yes" if t else "no"]
                        + [fm(x, 5) for x in res["norm"][i]])

    n_up = int(np.sum(sig & (res["lfc"] > 0)))
    n_down = int(np.sum(sig & (res["lfc"] < 0)))
    abs_sig = np.abs(res["lfc"][sig])
    st = dict(
        n_genes=G, n_tested=int(keep.sum()), n_filtered=int((~keep).sum()),
        samples=samples, conditions=[mm["condition"] for mm in meta], runs=[mm["sequencing_run"] for mm in meta],
        library_size=lib.astype(int).tolist(), size_factors=sf.round(4).tolist(), n_sf_genes=n_sf_genes,
        n_sig=int(sig.sum()), n_up=n_up, n_down=n_down,
        abs_lfc_sig_median=float(np.median(abs_sig)) if len(abs_sig) else None,
        abs_lfc_sig_range=[float(abs_sig.min()), float(abs_sig.max())] if len(abs_sig) else None,
        max_padj_in_list=float(np.max(padj[sig])) if sig.sum() else None, z_cut=z_cut,
        n_sig_lfc_gt1=int(np.sum(sig & (np.abs(res["lfc"]) > 1))),
        n_sig_ci_excludes_1=int(np.sum(sig & ((ci_lo > 1) | (ci_hi < -1)))),
        design=dict(corr_condition_run=r_cr, rank=rank, n_params=p, residual_df=m - p,
                    var_inflation_condition=float(var_full / var_norun),
                    interaction_residual_df=int(int_df),
                    cells={f"{c}/{r}": int(sum(1 for mm in meta if mm["condition"] == c and mm["sequencing_run"] == r))
                           for c in ("control", "treated") for r in ("A", "B")}),
        test=dict(reference="t", df=res["df_test"], prior_df=res["d0"], residual_df=m - p, ci_quantile=float(tq)),
        dispersion=dict(trend_a0=a0, trend_a1=a1, sigma2_prior=res["sigma2_prior"],
                        var_log_disp=res["var_log_disp"], exp_var_log_disp=res["exp_var_log_disp"],
                        n_disp_outliers=int(np.sum(res["disp_outlier"])),
                        median_disp=float(np.nanmedian(res["disp_final"]))),
        cooks=dict(cutoff=cook_cut, n_genes_flagged=int(cook_flag.sum()),
                   n_sig_flagged=int(np.sum(cook_flag & sig)), by_sample=cook_by_sample,
                   sig_flagged=[genes[i] for i in np.where(cook_flag & sig)[0]]),
        run_effect=dict(n_run_fdr05=int(np.nansum(padj_run < ALPHA_FDR)),
                        median_abs_run_lfc=float(np.nanmedian(np.abs(run_lfc[keep])))),
        sensitivity=dict(no_run_n_sig=int(sig0.sum()), no_run_overlap=int(np.sum(sig0 & sig)),
                         no_run_lfc_r=float(np.corrcoef(res0["lfc"][keep], res["lfc"][keep])[0, 1]),
                         t3_n_sig=int(sig_t.sum()), normal_n_sig=int(sig_norm.sum()),
                         normal_overlap=int(np.sum(sig_norm & sig)), leave_one_out=loo),
        pca=dict(var_explained=varexp.round(4).tolist(), scores=scores.round(3).tolist()),
        sample_corr=corr.round(4).tolist(), sample_dist=dist.round(2).tolist(),
        lfc_prior_sd=sd_prior,
    )
    if "--no-selftest" not in sys.argv:
        print("Self-test (simulated data, known truth):")
        st["selftest"] = selftest(res, X)
        print("Sensitivity by true fold change (simulated, FDR 5 %, correct direction required):")
        st["power"] = power_by_fold(res, X)
    with open(os.path.join(ROOT, "out", "stats.json"), "w") as f:
        json.dump(st, f, indent=1)

    # page data: compact per-gene arrays
    def r(x, nd):
        return None if not np.isfinite(x) else round(float(x), nd)
    gdata = []
    for i in range(G):
        gdata.append([genes[i], r(res["base_mean"][i], 2), r(res["lfc"][i], 4), r(res["lfc_se"][i], 4),
                      r(lfc_shr[i], 4), r(res["pvalue"][i], 8) if not np.isfinite(res["pvalue"][i]) or res["pvalue"][i] > 1e-300 else 1e-300,
                      r(padj[i], 8), r(res["disp_final"][i], 5), r(res["disp_gw"][i], 5), r(res["disp_trend"][i], 5),
                      r(run_lfc[i], 3), r(padj_run[i], 5), 1 if cook_flag[i] else 0,
                      [round(float(x), 1) for x in res["norm"][i]]])
    page = dict(fields=["gene", "baseMean", "lfc", "lfcSE", "lfcShrunk", "pvalue", "padj", "disp", "dispGW",
                        "dispTrend", "runLfc", "runPadj", "cooksFlag", "norm"],
                genes=gdata, stats=st)
    with open(os.path.join(ROOT, "product", "data.js"), "w") as f:
        f.write("/* generated by product/analysis.py — do not edit */\nwindow.DE_DATA=")
        json.dump(page, f, separators=(",", ":"))
        f.write(";\n")

    print("samples:", samples)
    print("library sizes:", lib.astype(int).tolist())
    print("size factors:", sf.round(3).tolist(), "(from %d genes with no zero)" % n_sf_genes)
    print("design: corr(condition, run) = %.3f, rank %d/%d, residual df %d, variance inflation for condition %.3f"
          % (r_cr, rank, p, m - p, var_full / var_norun))
    print("tested %d genes (%d with <10 reads filtered)" % (keep.sum(), (~keep).sum()))
    print("dispersion trend: alpha = %.4f + %.3f/mean; prior var(log disp) %.3f; %d dispersion outliers"
          % (a0, a1, res["sigma2_prior"], res["disp_outlier"].sum()))
    print("FDR<5%%: %d genes (%d up, %d down); %d with |log2FC|>1; %d whose 95%% CI excludes |log2FC|<=1"
          % (sig.sum(), n_up, n_down, st["n_sig_lfc_gt1"], st["n_sig_ci_excludes_1"]))
    print("Cook's cutoff %.1f: %d genes flagged (%d significant); by sample %s"
          % (cook_cut, cook_flag.sum(), np.sum(cook_flag & sig), cook_by_sample))
    print("run effect: %d genes FDR<5%%; median |run log2FC| %.3f" % (st["run_effect"]["n_run_fdr05"], st["run_effect"]["median_abs_run_lfc"]))
    print("test: Wald statistic vs t(%.2f) = residual df %d + prior df %.2f" % (res["df_test"], m - p, res["d0"]))
    print("sensitivity: ~condition only -> %d sig (%d shared); normal reference -> %d sig (%d shared); t(3) -> %d sig"
          % (sig0.sum(), np.sum(sig0 & sig), sig_norm.sum(), np.sum(sig_norm & sig), sig_t.sum()))
    print("leave-one-out:", json.dumps(loo))
    print("PCA variance explained:", varexp.round(3).tolist(), "scores:", scores.round(2).tolist())
    print("wrote out/results.csv, out/stats.json, product/data.js")


class Tee:
    """Echo stdout into out/analysis-output.txt so the rerun leaves its own log."""
    def __init__(self, *streams):
        self.streams = streams

    def write(self, s):
        for st in self.streams:
            st.write(s)

    def flush(self):
        for st in self.streams:
            st.flush()


if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
    with open(os.path.join(ROOT, "out", "analysis-output.txt"), "w") as log:
        sys.stdout = Tee(sys.__stdout__, log)
        try:
            print("$ python3 product/analysis.py" + "".join(" " + a for a in sys.argv[1:]))
            main()
            print("wrote out/analysis-output.txt")
        finally:
            sys.stdout = sys.__stdout__
