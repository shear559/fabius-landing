# Summary — Tidepool pricing section

## What I produced
- `out/visual-system.md` — the captured token system (colors, type ladder, spacing, radius, elevation, states, components) using deep-sea navy + one accent ("buoy amber"), written to the fixed template shape before any markup.
- `out/index.html` — one self-contained file: inline CSS, inline JS, system-font stack, no external requests, no images. Contains:
  - Free tier and Tidepool Plus cards, built only from `FACTS.md` (3 free spots; $4/mo or $36/yr Plus; 14-day trial; 312 surf spots + 41 marinas in Portugal/Morocco; 7-day forecast refreshed every 30 min; go/wait call from the rider's own saved limits; offline for the last forecast; iPhone + Apple Watch, no Android; 180 testers over 10 weeks; team of four in Ericeira; launch 2026-10-01). No accuracy claims, comparisons, or "best/#1" language were added.
  - A monthly/yearly billing switch (native `<input type="radio">` pair styled as a segmented control, `:has()`-driven active state, no JS class toggling for the visual state) with a "Save 25% yearly" badge ($36/yr vs $4×12=$48/yr = 25% saved, computed from the given prices).
  - A 5-item FAQ using native `<details>/<summary>` — no JS, no ARIA needed, keyboard-operable by default.
- `out/check-360.png`, `out/check-1440.png` — full-page screenshots taken at true 360px and 1440px CSS-pixel viewports (see verification below), kept as evidence.

## What I checked, and how

**Environment:** no internet, nothing installable. I used the system's Google Chrome 153.0.8010.48 (`/Applications/Google Chrome.app`) directly in headless mode over the Chrome DevTools Protocol (via Node's built-in `fetch`/`WebSocket`, no packages installed) as a real rendering engine — not a static-code read-through.

**1. No external requests / self-contained:**
```
$ grep -nE 'https?://|src=|<link|@import|fetch\(|googleapis|fonts\.' index.html
none found
```

**2. HTML well-formed (Python's stdlib `html.parser`):**
```
unclosed at EOF: []
errors: none
```

**3. Real rendering at 360px and 1440px — a real bug found and fixed along the way:**
My first attempt used `chrome --headless=new --window-size=360,900 --screenshot=...`. Chrome 153 silently ignores `--window-size` for `--screenshot` mode in this build (verified with a throwaway page that prints `window.innerWidth` — it reported **500px**, not 360, even though the output PNG was cropped to a 360px canvas). That produced screenshots that *looked* like a horizontal-overflow bug (text clipped mid-word), which would have been a false "fail" if I'd trusted it.

I caught this by writing a small CDP driver (`Emulation.setDeviceMetricsOverride` to force a *true* 360×N / 1440×N viewport, then `Page.captureScreenshot`) and re-verified. At a genuine 360px viewport there is no overflow:
```
{"vw":360,"bw":360,"offenders":[]}
```
At a genuine 1440px viewport, same result:
```
1440 check: {"vw":1440,"offenders":[]}
```
(`offenders` = any element whose `scrollWidth` exceeds the viewport width; both runs returned none.) The two files `check-360.png` and `check-1440.png` are full-page captures from this corrected method — visually confirmed layout, spacing, card alignment, toggle, and FAQ accordion all render correctly at both widths.

**4. Keyboard operability — driven with real synthesized key events (CDP `Input.dispatchKeyEvent`), not inferred from markup:**
- Tabbed through the whole page (20 Tab presses, cycles correctly): skip link → billing radiogroup (enters at the checked radio, per native radio-group semantics) → Free plan's "Start free" → Plus plan's "Start free trial" → all 5 FAQ `<summary>` elements → wraps back to the skip link. No focusable element was skipped or trapped.
- Every stop showed a visible focus ring: `outline: solid 2px rgb(255, 184, 112)` (the `--focus` token) confirmed via `getComputedStyle` at each stop.
- Confirmed the toggle itself works via keyboard, not just mouse: focused the radiogroup, sent `ArrowRight`, and read the DOM back:
  ```
  before arrow: billing-monthly | price=$4 per month
  after arrow-right: billing-yearly | price=$36 per year | yearlyChecked=true
  ```

**5. `prefers-reduced-motion` — emulated via CDP `Emulation.setEmulatedMedia`, then read the resulting computed tokens:**
```
reduced-motion durations: 0ms / 0ms
```
Confirms the `@media (prefers-reduced-motion: reduce)` block correctly zeroes both the press (`transform: scale`) and state-transition durations; nothing here also animates layout (transform/opacity only) even when motion isn't reduced.

**6. WCAG 2.2 AA contrast — computed from the exact hex values in the shipped CSS**, using the WCAG relative-luminance formula in a standalone Python script (stdlib only, no libraries):
```
PASS  body text on canvas (>=4.5)                      16.25:1
PASS  body text on surface (>=4.5)                     14.23:1
PASS  body text on surface2 (>=4.5)                    13.24:1
PASS  muted text on canvas (>=4.5)                     8.34:1
PASS  muted text on surface (>=4.5)                    7.31:1
PASS  muted text on surface2 (>=4.5)                   6.79:1
PASS  accent text (price/eyebrow) on canvas (>=4.5)    8.85:1
PASS  accent text on surface2 (badge) (>=4.5)          7.21:1
PASS  on-accent text on accent fill (button/tag) (>=4.5) 9.19:1
PASS  border (control edge) on canvas (>=3)            4.51:1
PASS  border on surface (>=3)                          3.95:1
PASS  border on surface2 (>=3)                         3.67:1
PASS  focus ring on canvas (>=3)                       10.68:1
PASS  focus ring on surface (>=3)                       9.35:1
PASS  focus ring on surface2 (>=3)                      8.70:1

ALL PASS
```
Covers every text pair (≥4.5:1) and every non-text UI pair — borders, focus ring (1.4.11) — (≥3:1) that appears in the shipped CSS.

## What I did not do / could not fully check
- **No live human-eyes browser session** — I don't have an interactive display in this environment, so I drove real Chrome headlessly via CDP and inspected the rendered pixels (screenshots) and live DOM/computed-style state, rather than opening it in a windowed browser myself. This is a step below a human visually operating the page, though it's a real rendering engine, not a static read of the code.
- **Touch target sizing (2.5.8, ≥24×24 / the 44×44 design floor)** was designed for (buttons/toggle labels/summary rows all use `min-height: 44px`) but not measured pixel-by-pixel in the browser; I did not automate a bounding-box check for every control.
- **Screen-reader behavior** (e.g. how VoiceOver announces the `aria-live="polite"` price update, or the radiogroup) was reasoned about from markup semantics, not verified with an actual screen reader — none is scriptable in this headless environment.
- **Cross-browser check** — only tested in Chrome (the only browser engine available in this environment). Safari/Firefox rendering was not verified, though the CSS only uses widely-available features (`:has()`, flexbox, `text-wrap: balance`, custom properties).
- **No visual regression baseline** — this is a first build, so screenshots are for this session's verification only, not diffed against a prior version.
