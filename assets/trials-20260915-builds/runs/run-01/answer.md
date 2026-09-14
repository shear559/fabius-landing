BRIEF.md is untouched. Delivered:

- **index.html / styles.css / app.js** — a complete, original landing page for Lattice (fictional local-first research notebook), vanilla HTML/CSS/JS, no build step, relative asset paths (verified working from a nested URL path).
- Hero with an original CSS/SVG app-window illustration, feature tabs, three-step workflow, two pricing plans with monthly/yearly toggle, four FAQ entries, fiction disclosure banner + footer notice.
- All required test seams (`menu-toggle`/`mobile-nav`, feature tabs with arrow-key support, billing toggle, `faq-0..3`, CTA to `#workflow`) implemented with real ARIA semantics and a no-JS content fallback.
- Verified with 42 Playwright checks (mobile/desktop interactions, pricing math, FAQ toggling, JS-disabled fallback) plus visual screenshots at 360px and 1440px — all passing.
- **README.md** documents run instructions, design decisions, exactly what was tested, and known limitations (no axe/Lighthouse audit, Chromium-only testing).