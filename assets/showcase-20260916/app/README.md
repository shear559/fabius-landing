# Fieldnote — Fabius worked refinement

An illustrative build prepared September 16, 2026. This is an iterative refinement with additional effort, not a fresh controlled trial.

## Run

Unzip and serve this directory:

```sh
python3 -m http.server 8080
```

Open http://localhost:8080 in a browser. No build, package installation or remote assets are needed.

## Verification

68/68 browser scenarios, 16/16 criteria. See verification.md for scope. Browser checks used Chromium and Playwright WebKit, not a physical iPhone.

Rubik is distributed under OFL.txt. The original font includes Hebrew and Latin.
The app stores data in browser local storage for this origin. Export a JSON backup before clearing browser data or moving origins. The website’s embedded preview uses temporary storage; this standalone source does not.
