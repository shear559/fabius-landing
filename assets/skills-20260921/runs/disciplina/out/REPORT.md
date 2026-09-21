# Ticket #4471 — "Upgrade charge looks wrong"

## Root cause

`billing/proration.py::prorate` hardcoded `days_in_period = 30`, regardless of
how many days the actual billing period contains:

```python
def prorate(old_price_cents, new_price_cents, change_date, period_start, period_end):
    days_in_period = 30                                    # <- bug: always 30
    remaining = (period_end - change_date).days
    delta = (new_price_cents - old_price_cents) * remaining / days_in_period
    return int(round(delta))
```

POLICY.md states billing periods run "from the 1st of a month to the 1st of
the next month" — i.e. their length varies (28, 29, 30, or 31 days). Dana's
period was February 1 – March 1, 2026, which has 28 days, not 30.

Dana upgraded Basic ($12) → Pro ($45) on Feb 15, 2026. The day of change is
billed at the new price, so 14 days remained in the period (Feb 15–28
inclusive). The correct charge is:

```
(4500 - 1200) * 14 / 28 = 1650 cents = $16.50   (Dana's expectation)
```

The buggy code instead divided by 30:

```
(4500 - 1200) * 14 / 30 = 1540 cents = $15.40   (what Dana was actually charged)
```

This reproduces Dana's report exactly, confirming the hardcoded `30` as the
root cause.

**Why the existing tests didn't catch it:** all three cases in
`tests/test_proration.py` used April 1 – May 1, which happens to be exactly
30 days long, so `days_in_period = 30` was coincidentally correct for every
existing test.

## Failing test (before the fix)

Added `test_upgrade_mid_february_short_month` to `tests/test_proration.py`,
reproducing Dana's exact scenario, then ran the suite before touching
`proration.py`:

```
$ python3 -m unittest -v
test_invoice_line (tests.test_proration.ProrationTest) ... ok
test_no_change_costs_nothing (tests.test_proration.ProrationTest) ... ok
test_upgrade_mid_april (tests.test_proration.ProrationTest) ... ok
test_upgrade_mid_february_short_month (tests.test_proration.ProrationTest) ... FAIL

======================================================================
FAIL: test_upgrade_mid_february_short_month (tests.test_proration.ProrationTest)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests/test_proration.py", line 29, in test_upgrade_mid_february_short_month
    self.assertEqual(prorate(1200, 4500, date(2026, 2, 15), date(2026, 2, 1), date(2026, 3, 1)), 1650)
AssertionError: 1540 != 1650

----------------------------------------------------------------------
Ran 4 tests in 0.002s

FAILED (failures=1)
```

The failure reproduces 1540 (Dana's actual charge) vs. the expected 1650,
confirming both the bug and that the test isolates it correctly.

## Fix

Compute the true length of the billing period instead of assuming 30 days:

```python
days_in_period = (period_end - period_start).days
```

(One line changed in `billing/proration.py`.)

## Passing test (after the fix)

```
$ python3 -m unittest -v
test_invoice_line (tests.test_proration.ProrationTest) ... ok
test_no_change_costs_nothing (tests.test_proration.ProrationTest) ... ok
test_upgrade_mid_april (tests.test_proration.ProrationTest) ... ok
test_upgrade_mid_february_short_month (tests.test_proration.ProrationTest) ... ok

----------------------------------------------------------------------
Ran 4 tests in 0.000s

OK
```

All 4 tests pass, including the 3 pre-existing ones (no regression).

## Blast radius — what else this same bug touches

`days_in_period` feeds every `prorate()` call, so any upgrade whose billing
period is not exactly 30 days was mispriced in the same way. Since periods
run 1st-to-1st, that's every month except April, June, September, and
November:

| Period | Actual days | Old (buggy) charge | Correct charge | Effect |
|---|---|---|---|---|
| Feb 2026 (non-leap), upgrade on the 15th | 28 | $15.40 | $16.50 | undercharged $1.10 |
| Feb 2028 (leap), upgrade on the 15th | 29 | $16.50 | $17.07 | undercharged $0.57 |
| Jan 2026, upgrade on the 16th | 31 | $17.60 | $17.03 | **overcharged** $0.57 |
| Apr 2026, upgrade on the 16th | 30 | $16.50 | $16.50 | correct (why tests missed it) |

So the bug cut both ways: customers upgrading during 31-day months
(Jan/Mar/May/Jul/Aug/Oct/Dec) were silently *overcharged*, not just
undercharged like Dana. `upgrade_line` in `billing/invoice.py` calls
`prorate()` directly and produces the customer-facing invoice line, so every
historical upgrade invoice for a non-30-day period is affected — this is
worth a backfill/credit review beyond the code fix, which is outside the
scope of what was authorized here.

## Related but out-of-scope observation (not fixed)

`prorate()` uses Python's built-in `round()`, which rounds half-to-even
("banker's rounding") rather than the "round half up" the policy specifies
(POLICY.md: "Fractions of a cent round half up."). For example, a delta of
exactly 0.5 cents evaluates to `int(round(0.5)) == 0`, not 1. This did not
affect Dana's case (delta was not exactly at a half-cent boundary) and none
of the current tests exercise a half-cent boundary, so it was left
unfixed — flagging it here since it touches the same rounding clause in the
policy and the same function.
