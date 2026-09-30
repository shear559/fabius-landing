# Verification and mathematical scope

The new presentation preserves the previous exact problem, all six solution formulas and the complete proof. It does not claim a fresh blinded benchmark or measured model improvement.

Executed with `node verify.mjs`:

- 6,001 parameter values compared with an independent geometric oracle that minimizes over all five edges and the feasible unconstrained stationary point.
- Maximum coordinate discrepancy: 1.11 × 10⁻¹⁶.
- Maximum objective discrepancy and KKT residual: 1.78 × 10⁻¹⁵.
- All five joins, six interior value derivatives, eight invalid-input cases and entry-file parity passed.
- The preserved `python3 verify.py` passed 254 assertions: 182 exact polynomial/interval assertions and 72 floating-point solver spot assertions.

These floating-point comparisons support the implementation. The written proof and exact polynomial checks establish the identities over complete intervals. Displayed numerical residuals alone are not a proof.

Local browser checks passed in Chrome and WebKit at 390×820 and 1440×1000: all six regimes, five joins, actual equal SVG scales, keyboard probe, numeric input recovery, certificate/proof rendering, no horizontal overflow, and zero console or failed network responses. Browser checks are reproducible with `node verify-browser.mjs`. Host packaging and live deployment verification are separate from these local checks.
