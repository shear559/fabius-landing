The working directory now contains exactly the four deliverables plus the untouched `BRIEF.md` (unmodified timestamp, size 3335 bytes matching the original read). Temporary verification files and the local test server have been removed.

## Summary

Built the Lattice fictional-demo landing page in `[study]/runs/run-01/work/`:

- **index.html** — semantic markup: skip link, fictional-demo banner, header with desktop nav + hamburger, hero with an original inline-SVG UI illustration (window mockup + linked-source chip + mini graph), feature tabs, three-step workflow (`#workflow`), pricing with billing toggle, four FAQ `details/summary`, footer.
- **styles.css** — full visual system (warm paper background, single terracotta accent, system fonts only), responsive from 360px to 1440px+, `:focus-visible` rings, `prefers-reduced-motion` handling, `[hidden]` hardening.
- **app.js** — progressive enhancement only: mobile-nav open/close with `aria-expanded` sync, Escape-to-close-and-refocus, tab-list with roving tabindex and arrow-key activation, billing toggle swapping exact price strings. All content the JS would otherwise hide is already present/visible in the raw HTML, so it stays discoverable with JS off.
- **README.md** — run instructions, design decisions, and an honest list of the checks actually executed (not just claimed).

Verification performed (Playwright/Chromium, headless, served over a real local static server at a nested path to prove relative-URL correctness): 45 behavioral assertions covering mobile menu open/close/Escape/link-close, desktop nav visibility, primary CTA anchor, tab switching + `aria-selected` + arrow-key wraparound, billing toggle exact price strings both directions, all four FAQ toggles, and a JS-disabled pass confirming nav links, prices, and tab content remain visible. Also checked: zero horizontal overflow at 360px and 1440px, zero console errors, first-Tab focus lands on a visibly-outlined skip link, and WCAG contrast ratios for every text/background pairing (all ≥4.5:1). Full-page screenshots at both breakpoints were reviewed visually. All checks passed; details and known limitations are recorded in the README.