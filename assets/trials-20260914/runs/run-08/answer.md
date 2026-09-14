Only `index.html` remains, and it has been verified rendering correctly at both mobile (390px) and desktop (1440px) widths, with the CSS-only yearly/monthly billing toggle and full keyboard-tab/focus-ring behavior confirmed via real browser screenshots.

Delivered: `[study]/runs/run-08/work/index.html` — one self-contained HTML file, no external requests, no build step, no JavaScript at all.

**What's on the page**
- Header with a text wordmark ("Verdant" — a placeholder name, since none was supplied; swap it for your real product name) and a lightweight "Questions?" link.
- Hero headline with the yellow wash (`#ffe95c`) behind "honest, not hidden," using a chunky extra-bold display stack (Arial Black → system fallback) while all body copy uses the plain system-sans stack.
- A Monthly/Yearly billing toggle built from a native `<fieldset>`/radio pair styled as a segmented pill — switching it recalculates every price via pure CSS (`:has()`), no script required. Yearly shows the "2 months free" tag and the correct discounted math: Starter $10/mo ($120/yr, save $24), Team $24.17/mo ($290/yr, save $58), Studio $65.83/mo ($790/yr, save $158).
- Three plan cards (Starter $12, Team $29, Studio $79) with placeholder feature lists (seats/projects/support tier — adjust to your real tier differences), Team visually marked "Most popular" with a stronger border and elevation. All buttons are solid deep-green fill with cream text and 6px corners, per your spec.
- A small native `<details>`-based FAQ (3 questions) and a minimal footer.

**Design decisions made without source data**
- No logo file was supplied, so the header uses a text wordmark only — no logo mark was invented.
- Deep green (`#1a3300`) is used for all text and all button fills (cream text on top for contrast); the yellow wash is reused sparingly for the "Most popular" and "2 months free" badges to keep one consistent accent language.
- Card surfaces are plain white against the cream page background for gentle separation — a value not specified in your brief, easy to change.
- All color pairings were checked for contrast (deep green on cream is ~13:1, cream on deep green ~13:1, deep green on yellow ~11:1) — comfortably clears WCAG AA everywhere.

**Verified live**, not just read in code: rendered via a real Chrome instance (Chrome DevTools Protocol, since the CLI `--window-size` flag proved unreliable in this Chrome build and needed bypassing) at 390px and 1440px widths — no horizontal overflow at either size — and by walking the Tab key through the page: skip-link → wordmark → nav link → billing radios → each card's CTA, with a visible, unclipped focus ring at every stop.