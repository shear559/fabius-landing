# Mathematics explorer — Fabius worked refinement

An illustrative build prepared September 16, 2026. This is an iterative refinement with additional effort, not a fresh controlled trial.

## Run

Unzip and serve this directory:

```sh
python3 -m http.server 8080
```

Open http://localhost:8080 in a browser. No build, package installation or remote assets are needed.

## Verification

1,233/1,233 numerical probes; 182 exact and 72 numerical certificate/solver assertions. See verification.md for scope. Browser checks used Chromium and Playwright WebKit, not a physical iPhone.

Rubik is distributed under OFL.txt. The original font includes Hebrew and Latin.
Read proof.html for the complete typeset proof, solution.md for its source, solution.py for the solver and verify.py for exact checks. KaTeX is included under katex/LICENSE.
