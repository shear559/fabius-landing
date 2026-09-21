"""Hidden oracle for the disciplina run: exact cents per POLICY.md (not given to the run).

usage: python3 truth/disciplina_oracle.py <path-to-fixed-project>
"""
import sys, importlib, json
from datetime import date
from fractions import Fraction

sys.path.insert(0, sys.argv[1])
prorate = importlib.import_module("billing.proration").prorate


def expected(old, new, change, start, end):
    days = (end - start).days
    remaining = (end - change).days
    exact = Fraction(new - old) * remaining / days
    whole, frac = divmod(exact, 1)
    return int(whole) + (1 if frac >= Fraction(1, 2) else 0)


CASES = [
    ("ticket #4471: Feb 15, 28-day February", 1200, 4500, date(2026, 2, 15), date(2026, 2, 1), date(2026, 3, 1)),
    ("31-day January, change on the 20th", 1200, 4500, date(2026, 1, 20), date(2026, 1, 1), date(2026, 2, 1)),
    ("last day of a 31-day month", 1200, 4500, date(2026, 3, 31), date(2026, 3, 1), date(2026, 4, 1)),
    ("leap-year February 2028", 1200, 4500, date(2028, 2, 15), date(2028, 2, 1), date(2028, 3, 1)),
    ("half a cent rounds up", 1200, 1201, date(2026, 4, 16), date(2026, 4, 1), date(2026, 5, 1)),
    ("change on the first day = full difference", 1200, 4500, date(2026, 4, 1), date(2026, 4, 1), date(2026, 5, 1)),
    ("30-day April (the case the old tests covered)", 1200, 4500, date(2026, 4, 16), date(2026, 4, 1), date(2026, 5, 1)),
]

results = []
for name, *args in CASES:
    want = expected(*args)
    try:
        got = prorate(*args)
    except Exception as e:  # noqa: BLE001
        got = f"error: {e}"
    results.append({"case": name, "expected": want, "got": got, "pass": got == want})
print(json.dumps({"passed": sum(r["pass"] for r in results), "total": len(results), "cases": results}, indent=1))
