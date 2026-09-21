#!/usr/bin/env python3
"""
Honest test of the TIP.md claim: "50-day/200-day SMA golden cross on this
index returns 30%/year and beats buy-and-hold by 3x since 2016."

Pipeline:
  1. Naive replication of the claim's apparent method (no costs, whole
     sample, look-ahead-free signal but no holdout).
  2. Realistic version: trade lag (no look-ahead), transaction costs,
     drawdowns.
  3. In-sample / out-of-sample split, touched only at the very end.
  4. A grid of nearby MA-pair variants, searched in-sample only, to show
     what "trying variants" does to the apparent edge.
  5. A permutation test (i.i.d. reshuffle of in-sample daily returns) that
     estimates how much of the in-sample edge -- for the plain 50/200 rule,
     and for the best of the searched variants -- could be luck.

Uses only the Python 3.9 standard library and numpy. Deterministic (fixed
RNG seed) so it reruns to the same numbers.
"""
import csv
import json
import os
import numpy as np

TRADING_DAYS = 252
COST_BPS_ONE_WAY = 5          # 5 bps per one-way trade (10 bps round trip)
IS_FRACTION = 0.8             # first 80% of days = in-sample, last 20% = held out
SEED = 20250921
N_PERMUTATIONS = 500
FAST_WINDOWS = [10, 20, 30, 50, 75, 100]
SLOW_WINDOWS = [100, 150, 200, 250, 300]

HERE = os.path.dirname(os.path.abspath(__file__))
PRICES_PATH = os.path.join(os.path.dirname(HERE), "prices.csv")
OUT_PATH = os.path.join(HERE, "results.json")


# ---------------------------------------------------------------- data ----
def load_prices(path):
    dates, closes = [], []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            dates.append(row["date"])
            closes.append(float(row["close"]))
    return dates, np.array(closes, dtype=np.float64)


# ------------------------------------------------------------- signals ----
def sma(x, window):
    """Simple moving average, NaN for the first window-1 points."""
    n = len(x)
    out = np.full(n, np.nan)
    csum = np.cumsum(np.insert(x, 0, 0.0))
    out[window - 1:] = (csum[window:] - csum[:-window]) / window
    return out


def crossover_position(closes, fast, slow):
    """1 = long, 0 = flat (cash). Flat while either MA is undefined."""
    f, s = sma(closes, fast), sma(closes, slow)
    pos = np.zeros(len(closes))
    valid = ~np.isnan(f) & ~np.isnan(s)
    pos[valid] = (f[valid] > s[valid]).astype(float)
    return pos


def backtest(closes, fast, slow, cost_bps_one_way):
    """Returns (strategy daily returns, market daily returns, executed
    position, per-day trade indicator). Signal on day t is only acted on
    starting day t+1's return, so there is no look-ahead: today's decision
    uses only closes up to and including today."""
    pos = crossover_position(closes, fast, slow)
    exec_pos = np.zeros(len(closes))
    exec_pos[1:] = pos[:-1]

    mkt_ret = np.zeros(len(closes))
    mkt_ret[1:] = closes[1:] / closes[:-1] - 1.0

    trades = np.zeros(len(closes))
    trades[1:] = np.abs(exec_pos[1:] - exec_pos[:-1])

    cost_rate = cost_bps_one_way / 10000.0
    strat_ret = exec_pos * mkt_ret - trades * cost_rate
    return strat_ret, mkt_ret, exec_pos, trades


def equity(returns):
    return np.cumprod(1.0 + returns)


def drawdown(eq):
    peak = np.maximum.accumulate(eq)
    return eq / peak - 1.0


# ------------------------------------------------------------- metrics ----
def period_metrics(ret_slice, trades_slice):
    n = len(ret_slice)
    if n == 0:
        return None
    eq = equity(ret_slice)
    years = n / TRADING_DAYS
    total_return = float(eq[-1] - 1.0)
    cagr = float(eq[-1] ** (1.0 / years) - 1.0) if years > 0 else float("nan")
    vol = float(np.std(ret_slice, ddof=1) * np.sqrt(TRADING_DAYS)) if n > 1 else float("nan")
    mean_ann = float(np.mean(ret_slice) * TRADING_DAYS)
    sharpe = float(mean_ann / vol) if vol and vol > 0 else float("nan")
    dd = drawdown(eq)
    max_dd = float(dd.min())
    calmar = float(cagr / abs(max_dd)) if max_dd != 0 else float("nan")
    n_trades = int(trades_slice.sum())
    return {
        "n_days": int(n),
        "years": round(years, 3),
        "total_return": total_return,
        "cagr": cagr,
        "ann_vol": vol,
        "sharpe": sharpe,
        "max_drawdown": max_dd,
        "calmar": calmar,
        "n_trades": n_trades,
    }


def sharpe_only(ret_slice):
    if len(ret_slice) < 2:
        return float("nan")
    vol = np.std(ret_slice, ddof=1) * np.sqrt(TRADING_DAYS)
    if vol <= 0:
        return float("nan")
    return float(np.mean(ret_slice) * TRADING_DAYS / vol)


# --------------------------------------------------------------- main -----
def main():
    dates, closes = load_prices(PRICES_PATH)
    n = len(closes)
    split_idx = int(n * IS_FRACTION)
    split_date = dates[split_idx]

    # full-timeline return index: ret[i] = return realized ON day i (from close i-1 to close i)
    # IS returns:  indices 1..split_idx   (inclusive)
    # OOS returns: indices split_idx+1..n-1
    is_slice = slice(1, split_idx + 1)
    oos_slice = slice(split_idx + 1, n)
    full_slice = slice(1, n)

    # ---- 0. naive replication of the forum claim: zero costs, whole sample ----
    naive_strat_ret, naive_mkt_ret, naive_pos, naive_trades = backtest(closes, 50, 200, cost_bps_one_way=0)
    naive_strategy = period_metrics(naive_strat_ret[full_slice], naive_trades[full_slice])
    naive_buyhold = period_metrics(naive_mkt_ret[full_slice], np.zeros(n)[full_slice])

    # ---- 1. realistic run: costs + trade lag, the exact 50/200 rule ----
    strat_ret, mkt_ret, exec_pos, trades = backtest(closes, 50, 200, COST_BPS_ONE_WAY)
    strat_eq_full = equity(strat_ret[full_slice])
    bh_eq_full = equity(mkt_ret[full_slice])
    strat_dd_full = drawdown(strat_eq_full)
    bh_dd_full = drawdown(bh_eq_full)

    metrics_by_period = {
        "full": {
            "strategy": period_metrics(strat_ret[full_slice], trades[full_slice]),
            "buy_and_hold": period_metrics(mkt_ret[full_slice], np.zeros(n)[full_slice]),
        },
        "in_sample": {
            "strategy": period_metrics(strat_ret[is_slice], trades[is_slice]),
            "buy_and_hold": period_metrics(mkt_ret[is_slice], np.zeros(n)[is_slice]),
        },
        "out_of_sample": {
            "strategy": period_metrics(strat_ret[oos_slice], trades[oos_slice]),
            "buy_and_hold": period_metrics(mkt_ret[oos_slice], np.zeros(n)[oos_slice]),
        },
    }

    # ---- 2. cost sensitivity on the plain 50/200 rule ----
    cost_sensitivity = []
    for bps in [0, 5, 10, 20, 50]:
        sr, mr, ep, tr = backtest(closes, 50, 200, bps)
        cost_sensitivity.append({
            "cost_bps_one_way": bps,
            "full_cagr": period_metrics(sr[full_slice], tr[full_slice])["cagr"],
            "oos_cagr": period_metrics(sr[oos_slice], tr[oos_slice])["cagr"],
        })

    # ---- 3. variant grid, searched IN-SAMPLE ONLY ----
    unique_windows = sorted(set(FAST_WINDOWS) | set(SLOW_WINDOWS))
    variant_pairs = [(f, s) for f in FAST_WINDOWS for s in SLOW_WINDOWS if f < s]

    def grid_is_sharpes(price_path):
        smas = {w: sma(price_path, w) for w in unique_windows}
        out = {}
        for f, s in variant_pairs:
            fA, sA = smas[f], smas[s]
            pos = np.zeros(len(price_path))
            valid = ~np.isnan(fA) & ~np.isnan(sA)
            pos[valid] = (fA[valid] > sA[valid]).astype(float)
            exec_pos = np.zeros(len(price_path))
            exec_pos[1:] = pos[:-1]
            mret = np.zeros(len(price_path))
            mret[1:] = price_path[1:] / price_path[:-1] - 1.0
            tr = np.zeros(len(price_path))
            tr[1:] = np.abs(exec_pos[1:] - exec_pos[:-1])
            sret = exec_pos * mret - tr * (COST_BPS_ONE_WAY / 10000.0)
            out[(f, s)] = sharpe_only(sret[1:])
        return out

    is_prices = closes[: split_idx + 1]
    real_is_sharpes = grid_is_sharpes(is_prices)
    grid_table = [
        {"fast": f, "slow": s, "in_sample_sharpe": real_is_sharpes[(f, s)]}
        for (f, s) in variant_pairs
    ]
    grid_table.sort(key=lambda r: (r["in_sample_sharpe"] if r["in_sample_sharpe"] == r["in_sample_sharpe"] else -999), reverse=True)
    best_variant = grid_table[0]
    plain_entry = next(r for r in grid_table if r["fast"] == 50 and r["slow"] == 200)

    # evaluate the IN-SAMPLE-BEST variant out of sample (never touched OOS until now)
    bf, bs = best_variant["fast"], best_variant["slow"]
    best_sr, best_mr, best_ep, best_tr = backtest(closes, bf, bs, COST_BPS_ONE_WAY)
    best_variant_oos = period_metrics(best_sr[oos_slice], best_tr[oos_slice])
    best_variant_is = period_metrics(best_sr[is_slice], best_tr[is_slice])

    # ---- 4. permutation test: how much of the in-sample edge is luck? ----
    rng = np.random.default_rng(SEED)
    is_mkt_ret = mkt_ret[is_slice]  # actual in-sample daily market returns (i.i.d. shuffled below)
    start_price = closes[0]

    null_plain_sharpes = np.empty(N_PERMUTATIONS)
    null_best_of_grid_sharpes = np.empty(N_PERMUTATIONS)

    for i in range(N_PERMUTATIONS):
        shuffled = rng.permutation(is_mkt_ret)
        synth_path = start_price * np.concatenate(([1.0], np.cumprod(1.0 + shuffled)))
        sharpes = grid_is_sharpes(synth_path)
        null_plain_sharpes[i] = sharpes[(50, 200)]
        vals = [v for v in sharpes.values() if v == v]  # drop NaN
        null_best_of_grid_sharpes[i] = max(vals) if vals else float("nan")

    observed_plain_is_sharpe = plain_entry["in_sample_sharpe"]
    observed_best_is_sharpe = best_variant["in_sample_sharpe"]

    p_plain = float((1 + np.sum(null_plain_sharpes >= observed_plain_is_sharpe)) / (N_PERMUTATIONS + 1))
    p_best_of_grid = float((1 + np.sum(null_best_of_grid_sharpes >= observed_best_is_sharpe)) / (N_PERMUTATIONS + 1))

    significance = {
        "method": "i.i.d. permutation of in-sample daily market returns, %d draws, seed=%d" % (N_PERMUTATIONS, SEED),
        "n_variants_searched": len(variant_pairs),
        "observed_plain_50_200_in_sample_sharpe": observed_plain_is_sharpe,
        "observed_best_of_grid_in_sample_sharpe": observed_best_is_sharpe,
        "null_plain_sharpe_mean": float(np.mean(null_plain_sharpes)),
        "null_plain_sharpe_p95": float(np.percentile(null_plain_sharpes, 95)),
        "null_best_of_grid_sharpe_mean": float(np.mean(null_best_of_grid_sharpes)),
        "null_best_of_grid_sharpe_p95": float(np.percentile(null_best_of_grid_sharpes, 95)),
        "p_value_plain_50_200": p_plain,
        "p_value_best_of_grid": p_best_of_grid,
    }

    # ---------------------------------------------------------- output ----
    results = {
        "meta": {
            "n_days": n,
            "start_date": dates[0],
            "end_date": dates[-1],
            "split_date": split_date,
            "in_sample_days": split_idx,
            "out_of_sample_days": n - split_idx - 1,
            "cost_bps_one_way_base_case": COST_BPS_ONE_WAY,
            "trade_execution": "signal computed on close of day t, executed at close of day t+1 (one-day lag, no look-ahead)",
            "position_model": "long-only / flat: long when SMA50 > SMA200, cash otherwise (no shorting)",
            "seed": SEED,
        },
        "naive_replication_zero_cost_whole_sample": {
            "note": "Reproduces the forum poster's likely method: no costs, no holdout, whole sample.",
            "strategy": naive_strategy,
            "buy_and_hold": naive_buyhold,
            "strategy_vs_buyhold_total_return_ratio": (
                naive_strategy["total_return"] / naive_buyhold["total_return"]
                if naive_buyhold["total_return"] not in (0, None) else None
            ),
        },
        "daily_equity": {
            "dates": dates[1:],
            "strategy": [float(x) for x in strat_eq_full],
            "buy_and_hold": [float(x) for x in bh_eq_full],
            "strategy_drawdown": [float(x) for x in strat_dd_full],
            "buy_and_hold_drawdown": [float(x) for x in bh_dd_full],
        },
        "metrics_by_period": metrics_by_period,
        "cost_sensitivity_plain_50_200": cost_sensitivity,
        "variant_search": {
            "grid": grid_table,
            "plain_50_200_in_sample_rank": grid_table.index(plain_entry) + 1,
            "n_variants": len(variant_pairs),
            "best_variant": best_variant,
            "best_variant_in_sample_metrics": best_variant_is,
            "best_variant_out_of_sample_metrics": best_variant_oos,
        },
        "significance": significance,
    }

    with open(OUT_PATH, "w") as f:
        json.dump(results, f, indent=2)

    # console summary for the transcript / SUMMARY.md
    print("=== Naive replication (zero cost, whole sample, look-ahead-free) ===")
    print("  strategy CAGR: %.2f%%   total return: %.1f%%" % (
        naive_strategy["cagr"] * 100, naive_strategy["total_return"] * 100))
    print("  buy&hold CAGR: %.2f%%   total return: %.1f%%" % (
        naive_buyhold["cagr"] * 100, naive_buyhold["total_return"] * 100))
    print()
    print("=== Realistic run: %d bps one-way cost, full period %s..%s ===" % (
        COST_BPS_ONE_WAY, dates[0], dates[-1]))
    full_s = metrics_by_period["full"]["strategy"]
    full_b = metrics_by_period["full"]["buy_and_hold"]
    print("  strategy CAGR: %.2f%%  Sharpe: %.2f  MaxDD: %.1f%%  trades: %d" % (
        full_s["cagr"] * 100, full_s["sharpe"], full_s["max_drawdown"] * 100, full_s["n_trades"]))
    print("  buy&hold CAGR: %.2f%%  Sharpe: %.2f  MaxDD: %.1f%%" % (
        full_b["cagr"] * 100, full_b["sharpe"], full_b["max_drawdown"] * 100))
    print()
    print("=== Out-of-sample (%s..%s, touched only now) ===" % (split_date, dates[-1]))
    oos_s = metrics_by_period["out_of_sample"]["strategy"]
    oos_b = metrics_by_period["out_of_sample"]["buy_and_hold"]
    print("  strategy CAGR: %.2f%%  Sharpe: %.2f  MaxDD: %.1f%%  trades: %d" % (
        oos_s["cagr"] * 100, oos_s["sharpe"], oos_s["max_drawdown"] * 100, oos_s["n_trades"]))
    print("  buy&hold CAGR: %.2f%%  Sharpe: %.2f  MaxDD: %.1f%%" % (
        oos_b["cagr"] * 100, oos_b["sharpe"], oos_b["max_drawdown"] * 100))
    print()
    print("=== Variant search (in-sample only, %d pairs) ===" % len(variant_pairs))
    print("  plain 50/200 in-sample Sharpe: %.3f (rank %d/%d)" % (
        plain_entry["in_sample_sharpe"], grid_table.index(plain_entry) + 1, len(variant_pairs)))
    print("  best in-sample variant: %d/%d  Sharpe %.3f" % (bf, bs, best_variant["in_sample_sharpe"]))
    print("  that variant out-of-sample: CAGR %.2f%%  Sharpe %.2f" % (
        best_variant_oos["cagr"] * 100, best_variant_oos["sharpe"]))
    print()
    print("=== Permutation test (%d draws): how much is luck? ===" % N_PERMUTATIONS)
    print("  P(null plain-50/200 Sharpe >= observed) = %.3f" % p_plain)
    print("  P(null best-of-%d-variants Sharpe >= observed best) = %.3f" % (len(variant_pairs), p_best_of_grid))
    print()
    print("Wrote %s" % OUT_PATH)


if __name__ == "__main__":
    main()
