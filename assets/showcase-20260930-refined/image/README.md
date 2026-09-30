# Lattice — Small notes, living ideas

A newly authored product key visual with original notebook UI, source fragments, typographic hierarchy and a restrained evergreen identity. Five compositions are individually arranged for widescreen, portrait, story, square and link-card canvases. They replace the previous cube artwork.

Serve and open `index.html`; `preview.html` adds the external gallery bridge. The studio displays live HTML/CSS artwork. Format selection reflows its composition; four layer switches show/hide the actual visual layers; a safe-area guide and 100% inspection are available. PNG/WebP links download the complete composition, explicitly independent of temporary layer inspection.

## Exports

- Widescreen: 1920×1080
- Portrait: 1080×1350
- Story: 1080×1920
- Square: 1080×1080
- Link card: 1200×630

Every format has a full-resolution PNG and WebP file under `exports/`, using the `lattice-refined-` prefix. No placeholder export is used.

## Reproduce

With an existing Playwright installation, Chrome, ffprobe and cwebp:

```sh
node source/render-exports.mjs
```

`PLAYWRIGHT` may point to an installed module. `source/art.js` mounts real product fragments; `source/art.css` defines each composition. `source/product.js` and `product.css` share the film's notebook identity. One persistent Chrome browser renders all five layouts after loading the bundled Rubik font. The renderer validates all ten file dimensions and headline bounds, and writes file hashes/bytes to `source/export-receipt.json`.

Widescreen, story and square compositions were visually inspected after rendering. Browser studio/mobile/CSP behavior and publication are covered by the separate integration pass. The small botanical drawing is original SVG; no generated fake UI or invented social proof appears. Lattice and its sample notebook are fictional. Rubik is distributed under `assets/OFL.txt`.
