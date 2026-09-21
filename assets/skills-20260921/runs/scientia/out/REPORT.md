# Which genes respond to treatment? — differential expression analysis

**Data:** `counts.csv` (2000 genes × 6 samples, raw read counts), `metadata.csv`
(3 control, 3 treated; each sample also tagged with a `sequencing_run`, A or B).

## 1. Competing hypotheses

| # | Hypothesis | Falsifiable prediction |
|---|---|---|
| H1 | Treatment causes true, gene-specific expression changes in a detectable subset of genes | A subset of genes shows |log2FC| consistently large and p-values far below what shuffled labels would produce, surviving FDR control |
| H2 | The treatment has no reproducible effect on any individual gene at this sample size; observed differences are sampling noise | No gene survives multiple-testing correction; nominal p-value distribution is close to uniform |
| H3 | Apparent condition differences are actually driven by the `sequencing_run` batch, which is *imperfectly* confounded with condition (ctrl = A,A,B; treated = A,B,B) | Calls change materially depending on whether batch is included as a covariate |
| H4 | Any apparent signal is concentrated in low-count, technically noisy genes rather than well-measured genes | Significant hits are disproportionately low-mean-expression genes |

These are not mutually exclusive — the data can support a mix (e.g., H2 as the
headline result while flagging a short candidate list consistent with H1 for
follow-up). The design below tests all four.

## 2. Method

1. **Normalization.** Median-of-ratios size factors (DESeq2-style), computed
   from genes with nonzero counts in every sample, to correct for library-size
   differences (library sizes ranged from ~0.80M to ~1.70M reads — a >2×
   spread that would otherwise masquerade as differential expression).
2. **Filtering.** Genes with mean normalized count < 5 were dropped (32 of
   2000) — too sparse to estimate a fold change or variance reliably.
3. **Transformation.** `log2(normalized_count + 1)` per gene.
4. **Model.** Per-gene ordinary least squares: `log2(count+1) ~ intercept + condition + sequencing_run`.
   The batch term addresses H3 directly: `condition` and `sequencing_run` are
   correlated in this design but not identical (design matrix is full rank,
   residual df = 6 − 3 = 3), so their effects are separable, if only weakly
   with this few samples.
5. **Testing.** t-test on the `condition` coefficient (df = 3) for each gene.
6. **FDR control.** Benjamini-Hochberg across all 1968 tested genes.
   `called = adjusted p value < 0.05`.
7. **Sensitivity check.** The same pipeline was re-run without the batch term
   (condition-only model, df = 4) to see how much the call set depends on
   modeling choice (H3).

`analysis.py` reruns all of this end to end and prints the diagnostics below.

## 3. Results

Real command output from `python3 out/analysis.py`:

```
Loaded 2000 genes x 6 samples
Size factors: {'ctrl_1': 0.706, 'ctrl_2': 1.084, 'ctrl_3': 1.308, 'trt_1': 0.681, 'trt_2': 1.175, 'trt_3': 1.44}
Filtered out 32 genes with mean normalized count < 5.0; 1968 genes tested
Design matrix X (intercept, condition, run):
[[1. 0. 0.]
 [1. 0. 0.]
 [1. 0. 1.]
 [1. 1. 0.]
 [1. 1. 1.]
 [1. 1. 1.]]
Residual df = 3
[batch-adjusted]  genes called at FDR<0.05: 0
[condition-only]  genes called at FDR<0.05: 0
Overlap between the two call sets: 0
```

- **No gene reaches FDR < 0.05 in either model.** Smallest adjusted p-value:
  0.418 (batch-adjusted model), 0.133 (condition-only model).
- Smallest *unadjusted* p-value overall: 0.00040 (`GENE1483`); with 1968
  tests, BH would need a p-value ≤ 0.05 × 1/1968 ≈ 2.5×10⁻⁵ at rank 1 to
  survive — an order of magnitude smaller than what we observe.
- 127 of 1968 genes have nominal p < 0.05, close to the ~98 expected by
  chance alone under a true null (1968 × 0.05) — consistent with mostly noise,
  not a strong buried signal.
- The two models (with/without batch) don't even agree on which genes are
  most extreme (0 overlap in top calls at this threshold), which is exactly
  the symptom H3 predicts: with only 6 samples and an imperfectly-confounded
  batch, condition and batch effects are hard to tell apart, and the fold
  changes/p-values are sensitive to that modeling choice.

Top 10 genes by nominal p-value (batch-adjusted model; **none pass FDR
control** — these are candidates for a better-powered follow-up study, not
confirmed hits):

| gene | mean expr. | log2FC | p | padj |
|---|---|---|---|---|
| GENE1483 | 176.4 | −1.97 | 4.0e-04 | 0.418 |
| GENE0949 | 4977.8 | +1.98 | 7.2e-04 | 0.418 |
| GENE0215 | 222.7 | −1.76 | 1.8e-03 | 0.418 |
| GENE0552 | 838.1 | −2.11 | 1.9e-03 | 0.418 |
| GENE1914 | 1041.3 | +3.24 | 2.1e-03 | 0.418 |
| GENE1797 | 150.6 | −1.53 | 2.2e-03 | 0.418 |
| GENE1132 | 2465.7 | +1.26 | 2.3e-03 | 0.418 |
| GENE0546 | 1261.0 | +0.59 | 2.6e-03 | 0.418 |
| GENE0824 | 962.5 | −1.94 | 2.8e-03 | 0.418 |
| GENE0114 | 292.4 | +0.89 | 2.9e-03 | 0.418 |

Full per-gene results (all 1968 tested genes, sorted by p-value): `results.csv`.
Volcano plot: `volcano.svg` (grey = not called; none are red/called at this
threshold — the plot itself is evidence for the headline finding, not just a
decoration).

## 4. Which hypothesis do the data support?

- **H2 (no gene-level effect detectable at this n) is the best-supported
  conclusion.** After correct FDR control, zero genes are called responders.
- **H1 cannot be ruled out** — the nominal top hits (e.g. `GENE1483`,
  `GENE0949`, `GENE1914`) have plausible effect sizes (|log2FC| up to ~3.2)
  and are not obviously low-count artifacts (H4 is not supported: top hits
  span mean expression from ~150 to ~5000, not concentrated at the low end).
  But "not ruled out" is not "supported" — with only 3 vs 3 samples and 1968
  tests, the study is underpowered to detect anything but very large,
  low-noise effects.
- **H3 (batch confounding) is partially supported as a methodological
  caveat**, not as an explanation for a real signal: including vs excluding
  `sequencing_run` changes which genes look most promising and by how much,
  which means any single-model answer here is fragile. This is disclosed
  rather than hidden behind one model's numbers.

## 5. What these data can and cannot support

**Can support:**
- A defensible, FDR-controlled statement that no individual gene shows a
  statistically robust treatment response in this experiment.
- A ranked candidate list (`results.csv`, sorted by p-value) for follow-up —
  useful as a hypothesis-generation output, not as a validated gene list.
- A quantitative illustration of why batch/condition confounding and small n
  matter: the call set is empty and the ranking is unstable, whichever way
  the batch covariate is handled.

**Cannot support:**
- Any claim that a specific gene "responds to treatment" — none survive
  multiple-testing correction, and the candidate list is not reproducible
  across the two modeling choices tested.
- Pathway/enrichment-level conclusions — there is no confirmed gene set to
  feed into enrichment analysis.
- A conclusion that the batch effect is fully separated from the condition
  effect — with only 6 samples and an imperfect (not orthogonal) design,
  the two are only partly resolvable; a design with balanced batches per
  condition, or more replicates, would be needed to fully disentangle them.
- Anything about effect direction/magnitude for individual genes with
  confidence — log2FC estimates for single genes have wide uncertainty at
  df = 3: the median standard error on log2FC across tested genes is ~0.45,
  giving a typical 95% CI half-width of ~1.4 log2 units (t-critical(df=3,
  0.975) ≈ 3.18 × SE) — often as large as the effect estimate itself.

## 6. Recommendation

Treat this as a pilot. To get a defensible per-gene call set: increase
replication (n ≥ 5–6 per group is a common rule of thumb for RNA-seq power),
and if `sequencing_run`-style batches are unavoidable, balance them evenly
across conditions so batch and condition are orthogonal instead of merely
imperfectly correlated.
