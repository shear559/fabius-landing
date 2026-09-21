# Does the 50/200-day golden cross return 30%/year on this index?

**Short answer: no.** Under every honest measure in this test — costs included,
signal lagged by a day so it can't peek at the future, and a two-year period
held out until the very end — the strategy's best showing was about **5%/year**
over a cherry-picked early sub-period, its full-history return net of costs is
**~0.5%/year**, and its recent out-of-sample record is a **-16%/year loss that
underperforms buy-and-hold**. None of that resembles "30% a year, beats
buy-and-hold by 3x."

Analysis, not investment advice.

## What was tested

- Data: `prices.csv`, 2,520 daily closes, 2016-01-04 to 2025-08-29 (~10 years).
- Rule as stated in `TIP.md`: go long when the 50-day SMA crosses above the
  200-day SMA, exit to cash when it crosses back below. Long/flat only, no
  shorting (the post doesn't mention shorting).
- No look-ahead: the signal is computed from closes through day *t*, and only
  acted on starting day *t+1*'s return — you can't trade on a crossover before
  the price that produced it is known.
- Trading costs: 5 bps per one-way trade (10 bps round trip) in the base
  case, a plausible cost for a liquid index vehicle; a sensitivity table
  covers 0–50 bps.
- In-sample / out-of-sample split: the first 80% of days (2016-01-04 to
  2023-09-26, 2,016 days) is in-sample; the last 20% (2023-09-26 to
  2025-08-29, 503 days) was held out and never inspected until the numbers
  below were generated.
- Multiple-testing check: a grid of 29 nearby (fast, slow) MA pairs
  (fast ∈ {10,20,30,50,75,100}, slow ∈ {100,150,200,250,300}, fast < slow)
  was ranked by in-sample Sharpe, mimicking "trying variants until one looks
  good." The in-sample winner was then run out-of-sample.
- Luck check: 500 i.i.d. permutations of the in-sample daily market returns
  build a null distribution (same volatility and marginal return
  distribution as the real data, no serial dependence) for both the plain
  50/200 rule's Sharpe and the best-of-29-variants Sharpe. Deterministic,
  seed 20250921.

## The claim's own apparent method, replicated

If you just run the rule over the whole sample with no costs and no holdout —
the closest reconstruction of what a forum post likely did — you get:

| | CAGR | Total return |
|---|---|---|
| 50/200 strategy | **0.59%** | 6.0% |
| Buy-and-hold | -0.64% | -6.2% |

Even in this best-case, cost-free, non-out-of-sample version, the strategy
returns well under 1%/year, not 30%. It's true that it "beats buy-and-hold" —
but only because buy-and-hold on this particular index was *flat to
negative* over the decade (it closed at 1003.70 on 2016-01-04 and 941.69 on
2025-08-29), not because the strategy earned anything close to what was
claimed. "Beats a negative number" is a low bar, and it is not the "3x
outperformance of a rising market" the post implies.

## Realistic run (costs + trade lag), full history

| | Strategy | Buy-and-hold |
|---|---|---|
| CAGR | 0.51% | -0.64% |
| Ann. volatility | 11.9% | 18.1% |
| Sharpe (rf=0) | 0.10 | 0.06 |
| Max drawdown | -40.8% | -56.8% |
| Trades | 14 | 0 (1 initial buy) |

Costs shave the CAGR from 0.59% to 0.51% — a small drag here only because the
strategy trades rarely (14 trades in 10 years). The strategy did sit out most
of the index's worst drawdown (-40.8% vs. -56.8%), which is the one place the
rule behaved as advertised: it reduces drawdown by moving to cash in
sustained downtrends. That risk reduction is real. A 30%/year return is not.

## In-sample vs. out-of-sample — the part that matters most

| | In-sample (2016-01 to 2023-09, 8.0y) | Out-of-sample (2023-09 to 2025-08, 2.0y) |
|---|---|---|
| Strategy CAGR | **5.12%** | **-16.02%** |
| Strategy Sharpe | 0.49 | -1.29 |
| Strategy max drawdown | -16.0% | -31.4% |
| Buy-and-hold CAGR | 0.19% | -3.88% |
| Buy-and-hold Sharpe | 0.10 | -0.11 |

In-sample, the strategy looks like the best version of the story anyone could
tell: 5.1%/year with a much smaller drawdown than buy-and-hold. That's still
nowhere near 30%/year, but it's a real, positive-Sharpe result. Out-of-sample,
it falls apart: -16%/year, a worse Sharpe than buy-and-hold, and a bigger
drawdown than buy-and-hold posted over the same stretch. The crossover rule
would have been actively harmful over the most recent two years — it
underperformed simply holding the index by about 12 points a year.

## Cost sensitivity (plain 50/200 rule)

| One-way cost | Full-period CAGR | Out-of-sample CAGR |
|---|---|---|
| 0 bps | 0.59% | -15.85% |
| 5 bps | 0.51% | -16.02% |
| 10 bps | 0.44% | -16.19% |
| 20 bps | 0.30% | -16.52% |
| 50 bps | -0.12% | -17.52% |

Costs matter at the margin (50 bps flips the full-period result negative),
but they are not what breaks this claim — the strategy trades too
infrequently (14 times in 10 years) for costs to be the dominant factor. The
claim fails on raw returns before costs are even considered.

## How many variants were tried, and does that change the verdict?

Searching 29 nearby (fast, slow) pairs on the in-sample data alone:

- The exact 50/200 pair the post names ranked **9th of 29** by in-sample
  Sharpe — it was not even the best rule available in that window.
- The best in-sample variant was **10/300** (Sharpe 0.62 vs. 50/200's 0.49).
- Out-of-sample, that "best" variant lost **-18.2%/year** — worse than the
  plain 50/200 rule's own out-of-sample loss. Picking the in-sample winner
  would have made things worse, not better — the textbook signature of
  overfitting to noise rather than finding a durable edge.

## How much of the in-sample result could be luck?

Using 500 permutations of the in-sample daily returns (shuffled, so same
volatility and marginal distribution, but no serial/trend structure — a
"no genuine trend-following edge" null):

- **Plain 50/200 rule alone:** observed in-sample Sharpe 0.49 vs. a null
  mean of 0.03 (p95 = 0.47). **p ≈ 0.046** — the naive rule's in-sample
  Sharpe is only marginally distinguishable from chance at conventional
  significance thresholds, using a single pre-specified test.
- **Best of the 29 variants searched:** observed Sharpe 0.62 vs. a null
  mean of 0.30 (p95 = 0.66) for the *best-of-29* statistic under the same
  null. **p ≈ 0.070** — once you account for having tried 29 variants and
  kept the best, the same in-sample result is *not* significant at the 5%
  level. Trying more variants makes a good-looking Sharpe easier to find by
  chance alone, which is exactly what the p-value degradation shows.

Both p-values describe only the in-sample period. The out-of-sample collapse
above is the real-world resolution of that uncertainty: whatever marginal
edge the in-sample window showed did not survive.

## What this test did not do

- No slippage model beyond a flat per-trade cost; no bid/ask spread, no
  capacity/AUM limits, no financing cost on the cash leg while flat.
- No survivorship-bias check — this is a single continuous index series, not
  a reconstructed universe of constituents.
- No shorting variant (the post's language reads as long/flat, not
  long/short); a long/short version would look different, likely worse net
  of costs given the extra round-trip trades.
- The permutation null is i.i.d. reshuffling, which destroys all serial
  dependence including short-horizon volatility clustering; it is a
  reasonable test of "is there exploitable trend structure" but not the only
  possible null (a block bootstrap preserving short-run autocorrelation was
  not run).
- Risk-free rate assumed to be 0 for Sharpe; a nonzero cash rate would lower
  the strategy's Sharpe slightly less than buy-and-hold's, since the
  strategy holds cash part of the time (a minor effect, not modeled).
- One fixed 80/20 split point was used, not a full walk-forward
  re-optimization; results could shift somewhat with a different split date.

## Bottom line

The 50/200 crossover on this index did not return 30%/year under any
measure tried here — not the best-case zero-cost replication (0.6%/year),
not the full history net of costs (0.5%/year), not even the most favorable
in-sample sub-period (5.1%/year). Its one genuine property is a smaller
drawdown than buy-and-hold, paid for by underperforming buy-and-hold badly
in the most recent, out-of-sample two years. Whatever in-sample edge existed
was only marginally distinguishable from noise before accounting for the
number of nearby rules that could have been tried, and disappeared entirely
once tested out-of-sample. This is analysis of a backtest, not a
recommendation to trade this or any strategy.
