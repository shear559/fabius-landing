# Mathematical checks

Executed for the September 30 refinement:

- `python3 verify.py`: 254 assertions passed, consisting of 182 exact polynomial/interval assertions and 72 exact solver spot assertions. All six regimes and five joins were checked with `fractions.Fraction`.
- `node --check app.js`: JavaScript syntax passed.

The certificate checks equality, inequality feasibility, multiplier non-negativity, stationarity and complementarity. Exact interval identities establish the result between sampled points. The browser reports floating-point residuals for the current parameter; their presence is not itself a new proof.

The host verification record includes current browser, mobile-emulation and sandbox integration results. Historical September 16 numerical checks remain in their original edition and are not claimed as newly run checks here.
