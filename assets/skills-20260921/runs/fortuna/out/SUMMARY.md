# Summary

## What was produced

- **`out/backtest.py`** — self-contained, deterministic (seed 20250921), reruns
  end-to-end with `python3 out/backtest.py`. Uses only the Python 3.9 standard
  library (`csv`, `json`, `os`) and `numpy`. No external network or packages.
- **`out/results.json`** — daily equity curves (strategy and buy-and-hold),
  daily drawdown series, metrics (CAGR, volatility, Sharpe, max drawdown,
  Calmar, trade count) for the full period / in-sample / out-of-sample, a
  cost-sensitivity table (0–50 bps), the 29-variant in-sample grid search
  with the best variant's out-of-sample follow-through, and the permutation
  test results (null distributions + p-values).
- **`out/REPORT.md`** — the honest verdict on the TIP.md claim: it does not
  hold up under costs, look-ahead-free execution, or an out-of-sample test;
  see the report for the full breakdown and what wasn't checked.

## Claim tested

TIP.md: 50-day/200-day SMA golden cross on this index "since 2016 that's 30%
a year and it beat buy-and-hold by 3x."

## What was checked, and how

1. **Reran the script from a clean `out/` (removed `results.json`, reran)
   to confirm it's reproducible end-to-end.** Real output, both runs
   identical (deterministic seed):

```
$ python3 out/backtest.py
=== Naive replication (zero cost, whole sample, look-ahead-free) ===
  strategy CAGR: 0.59%   total return: 6.0%
  buy&hold CAGR: -0.64%   total return: -6.2%

=== Realistic run: 5 bps one-way cost, full period 2016-01-04..2025-08-29 ===
  strategy CAGR: 0.51%  Sharpe: 0.10  MaxDD: -40.8%  trades: 14
  buy&hold CAGR: -0.64%  Sharpe: 0.06  MaxDD: -56.8%

=== Out-of-sample (2023-09-26..2025-08-29, touched only now) ===
  strategy CAGR: -16.02%  Sharpe: -1.29  MaxDD: -31.4%  trades: 8
  buy&hold CAGR: -3.88%  Sharpe: -0.11  MaxDD: -25.1%

=== Variant search (in-sample only, 29 pairs) ===
  plain 50/200 in-sample Sharpe: 0.490 (rank 9/29)
  best in-sample variant: 10/300  Sharpe 0.624
  that variant out-of-sample: CAGR -18.20%  Sharpe -1.80

=== Permutation test (500 draws): how much is luck? ===
  P(null plain-50/200 Sharpe >= observed) = 0.046
  P(null best-of-29-variants Sharpe >= observed best) = 0.070

Wrote out/results.json
```

2. **Validated `results.json` parses and has the expected structure:**
   `python3 -c "import json; d=json.load(open('out/results.json')); print(list(d.keys()))"`
   → `['meta', 'naive_replication_zero_cost_whole_sample', 'daily_equity',
   'metrics_by_period', 'cost_sensitivity_plain_50_200', 'variant_search',
   'significance']`. Equity/drawdown arrays are 2,519 points each (one per
   trading day after the first).

3. **Sanity-checked the raw data**: `wc -l prices.csv` → 2,520 data rows,
   2016-01-04 to 2025-08-29. The index closed at 1003.70 on day 1 and
   941.69 on the last day — i.e. buy-and-hold on this index was flat-to-negative
   over the whole span, which is why "beats buy-and-hold" is a low bar here
   and does not by itself support the 30%/year claim.

4. **No-look-ahead check**: verified by construction — the signal (SMA50 vs
   SMA200) is computed through day *t* and the position array is shifted by
   one day (`exec_pos[1:] = pos[:-1]`) before being multiplied by day *t*'s
   market return, so the trade executes strictly after the crossover is
   observable.

5. **Out-of-sample discipline**: the last 20% of days (2023-09-26 onward,
   503 trading days) was carved out before any variant search or tuning, and
   only the plain 50/200 rule and the in-sample-selected "best" variant were
   evaluated against it — once, at the end. Result: out-of-sample the
   strategy lost 16%/year and underperformed buy-and-hold, the opposite of
   the claim.

6. **Multiple-testing / luck check**: grid-searched 29 nearby (fast, slow)
   MA pairs on in-sample data only, and ran a 500-draw i.i.d. permutation
   test on in-sample daily returns to build a null (no-serial-dependence)
   distribution for both the plain rule's Sharpe and the best-of-29 Sharpe.
   The plain rule's in-sample Sharpe is only marginally above the 5%
   significance threshold (p≈0.046) on its own, and that significance
   disappears once the multiple-comparisons correction from searching 29
   variants is accounted for (p≈0.070) — and none of this in-sample signal
   survived into the out-of-sample test in step 5.

## Verdict

The 30%/year claim is not supported at any stage of this test: not in a
best-case zero-cost full-sample replication (0.6%/year), not net of realistic
costs (0.5%/year), not even in the most favorable in-sample sub-period
(5.1%/year), and it goes strongly negative out-of-sample (-16%/year,
underperforming buy-and-hold). Full detail and numbers are in
`out/REPORT.md`.

## What was not done / could not be checked

- No bid/ask spread or capacity/AUM modeling — only a flat per-trade cost
  (5 bps base case, with a 0–50 bps sensitivity table).
- No survivorship-bias check — this is one continuous index series, not a
  reconstructed constituent universe, so that specific bias channel doesn't
  apply here but also can't be tested from this data.
- Only a long/flat version was tested, matching the post's wording ("sell
  when it crosses below"); a long/short variant was not built.
- The luck/permutation test uses i.i.d. reshuffling of daily returns as the
  null, which destroys all serial dependence (including short-horizon
  volatility clustering); a block-bootstrap alternative that preserves
  short-run autocorrelation was not run and could give a different p-value.
- Only one 80/20 in-sample/out-of-sample split point was used, not a full
  walk-forward re-optimization across multiple split dates.
- No live-market validation is possible or attempted — no internet access,
  and this is analysis of the provided historical series only, not
  investment advice.
