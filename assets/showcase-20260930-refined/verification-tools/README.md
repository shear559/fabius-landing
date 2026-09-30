# Browser verification

Run the site under its production headers, including byte-range responses for video seeking:

```sh
python3 assets/showcase-20260930-refined/verification-tools/serve.py .
```

In another terminal, use an existing Playwright installation with Chromium and WebKit available:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.js node assets/showcase-20260930-refined/verification-tools/browser.mjs http://127.0.0.1:8814 ./browser-results
```

The same runner accepts the canonical production origin. `ENGINES=webkit`, `WIDTHS=390`, or `DEMOS=website,app` narrows a run. It uses fresh isolated browser contexts, actual user-facing controls and a tour-step acknowledgement. Video checks wait for decoded playback instead of assuming a fixed network delay. Reports and screenshots are written to the supplied output directory.

No dependency is installed by these scripts. Mobile contexts emulate a 390 CSS pixel device at 2× scale; they are not physical-phone tests.
