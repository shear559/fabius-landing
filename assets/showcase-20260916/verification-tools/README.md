# Reproduce the showcase checks

The functional and numerical instruments originate in the September 15 controlled study. Website uses grade.mjs; app uses the previously corrected grade-corrected.mjs. The original evaluator is retained. The distributed web runners change only the absolute local Playwright import to the portable package name; receipt runner hashes refer to the executed originals.

Environment: Node 26, Python 3 standard library, Playwright 1.60.0 Chromium and WebKit on Intel macOS. Supply an existing Playwright installation with those browsers. Run from a directory where the Playwright package resolves.

```sh
node web-oracle/grade.mjs --kind landing --directory /absolute/path/to/website --run-id refined-website --output ./website-results
node web-oracle/grade-corrected.mjs --kind app --directory /absolute/path/to/app --run-id refined-app --output ./app-results
python3 -I -S -B math-oracle/score.py /absolute/path/to/math/solution.py --output math-numerical.json
cd /absolute/path/to/math
python3 -B verify.py
```

The web runners create their own local servers and test the standalone products. The gallery integration checks additionally require the landing-page repository served with its production headers mirrored to the local origin. Production deployment has not been verified by these local runs.

Gallery integration (run from the landing repository, with Playwright resolvable):

```sh
python3 assets/showcase-20260916/verification-tools/serve-csp.py .
# In a second terminal:
BASE_URL=http://127.0.0.1:8806 node assets/showcase-20260916/verification-tools/integration.mjs
```

The server mirrors Vercel response headers, maps the canonical origin to loopback, supports clean HTML URLs and omits HTTPS upgrade for local HTTP. Integration screenshots are normal-motion captures. Service-worker blocking is not injected because Playwright's blocking script itself throws inside opaque-origin frames; the products do not register a service worker. The embedded Escape assertion waits for asynchronous postMessage delivery.
