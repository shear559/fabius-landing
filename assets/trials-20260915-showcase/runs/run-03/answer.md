Built the Lattice landing page in this directory: `index.html`, `styles.css`, `app.js`, and `README.md`, with BRIEF.md untouched.

- Original editorial design system (serif headings, warm paper palette, teal/terracotta accents), a hand-built SVG icon sprite, and a hero illustration showing notes → connections → export.
- All required test seams implemented: `menu-toggle`/`mobile-nav` with synced `aria-expanded`, Escape-to-close-and-refocus, and close-on-link-click; full ARIA tablist for `feature-capture/connect/export` with arrow-key roving focus; `billing-monthly`/`billing-yearly` updating `price-solo`/`price-studio` exactly to spec; four native `faq-0..3` details/summary; CTA linking to `#workflow`.
- The three workflow steps double as a user-controlled play/pause/restart demo, respecting `prefers-reduced-motion`.
- Progressive enhancement throughout means nav, feature content, and prices stay discoverable with JavaScript disabled.
- Verified with a 38-check Playwright script (mobile/desktop interactions, no-JS fallback) run against the page served from a nested URL path — all passed — plus visual screenshots at 360px and 1440px. The test script and screenshots were temporary and have been removed; only the four deliverable files remain.

Details on decisions, exact checks run, and known limitations (no automated a11y audit, Chromium-only testing) are in README.md.