# Verification — Mathematics explorer

Date: September 16, 2026 (Asia/Jerusalem; execution receipts use UTC).

Result: **1,233/1,233 numerical probes; 182 exact and 72 numerical certificate/solver assertions**.

This is a worked refinement with additional design, implementation and verification time. It does not establish a causal improvement attributable to Fabius alone. Prior source/reference material was available.

Run the standard-library certificate checker from this directory:

```sh
python3 -B verify.py
```

It validates exact rational polynomial identities, interval signs, KKT stationarity/complementarity, objective formulas and boundary agreement. Of 254 assertions, 182 use exact arithmetic and 72 compare the executable solver numerically. The separate frozen geometric oracle checks 1,233 parameter values across grid, random rational, endpoint and breakpoint families; the written proof covers the full continuous interval. No new blinded proof assessment was conducted.

Full receipts, evaluators and methodology are published beside the showcase in ../verification.html and ../evidence/.
