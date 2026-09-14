Delivered `index.html` in the working directory — a single self-contained pricing page, no external requests, no build step.

**What's in it:**
- **Header** — text wordmark ("Your Product" — swap in your real name/logo since none was supplied), "Log in" link, "Start free trial" button.
- **Hero** — headline with the yellow wash (#ffe95c) behind key words, chunky extra-bold display face (Arial Black-style stack, tight letter-spacing), plain sans body copy.
- **Billing toggle** — an accessible segmented control (`role="group"`, `aria-pressed` on each button, plus a live-region status announcement) switching all three cards between Monthly and Yearly, with a "2 months free" badge.
- **Three plan cards** — Starter $12, Team $29 (marked "Recommended," lifted with a yellow-tinted panel), Studio $79/mo. Yearly view shows the monthly-average price plus the exact annual charge and savings (e.g. Team: $24/mo, "Billed $290/year — save $58") — all figures work out exactly to "two months free" (12×10=120, 29×10=290, 79×10=790).
- **FAQ** using native `<details>/<summary>` (keyboard-operable with zero JS).
- **Closing CTA band and minimal footer** — no dead/fake links.

**Brand facts applied literally:** all text and controls in `#1a3300`; page background `#fcfaf5`; buttons at `6px` radius; no third color introduced anywhere (the "recommended" card and toggle badge reuse the same yellow, card panels reuse the same green at low opacity — no new hues).

**Verified, not just written:**
- Grepped the file for any `http(s)://`, external `src`/`href` — none found.
- Extracted and ran the inline script through `node --check` — valid syntax.
- Rendered in real headless Chrome at true 375px and 390px viewports (via an iframe, since headless Chrome's window floors around ~500px — confirmed `scrollWidth === clientWidth` at both, i.e. no horizontal overflow anywhere, including the header, which was the one spot that needed a mobile-only fix (`nowrap` + tightened spacing) after an initial test caught it wrapping awkwardly.
- Simulated a click on the "Yearly" toggle and read the DOM afterward: amounts changed to 10/24/66, notes updated to the correct billed/savings text, `aria-pressed` flipped correctly, and the live-region status text updated.
- Confirmed every interactive element is a native `<button>`, `<a>`, or `<summary>` — no `tabindex`, no `onclick`-on-`div` — so Tab order and Enter/Space activation work without extra ARIA.

One thing worth flagging: since no product name or logo was given, the wordmark currently reads literally "Your Product" — swap that text (and add a logo image if you get one) before shipping.