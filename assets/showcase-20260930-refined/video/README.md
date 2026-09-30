# Lattice — A thought becomes a field brief

A new 26-second silent product film, authored from original HTML/CSS notebook UI. It follows an observation into a notebook, opens its connections, brings an insight forward and composes a source-linked field brief. The scenes share one persistent notebook and deterministic camera poses. Lattice and all notebook content are fictional.

Open `index.html` through a static server. `preview.html` adds the gallery's external control bridge. Nothing autoplays; play/pause, seek, restart, chapter buttons and descriptive captions are available. Downloads are the actual MP4, WebP poster and VTT files.

## Reproduce

The renderer requires an existing Playwright installation, Chrome, ffmpeg/ffprobe and cwebp. No runtime dependencies are used by the player. `PLAYWRIGHT` may point to an installed Playwright module.

```sh
node source/render-refined.mjs --stills
node source/render-refined.mjs
node source/write-metadata.mjs
```

`source/scenes/product.js` and `product.css` define the original notebook and source fragments. `film.js` exposes `window.__seek(t)`; it computes every pose from the requested time without timers or CSS animation. One browser and page capture 650 PNG frames, passed directly to ffmpeg. The output is H.264, 1920×1080, 25 fps, 26 seconds, silent, tagged Rec.709 with fast-start metadata. Still-image thumbnails and the poster are captured from the same scene source. A standalone page can inspect any time with `source/scenes/film.html?t=15.6`.

The refinement pass corrected the opening insight card's resting opacity. `patch-opening.mjs` recaptured only the first 108 frames, retained later visual content, and encoded the joined film at CRF16. The main renderer already contains that correction, so a fresh render needs no patch. `source/render-receipt.json` records actual ffprobe results; frame hashes cover source PNGs, not lossy encoded MP4 pixels.

Composition stills were inspected before encoding. Browser/player, mobile, host-CSP and final deployment checks are a separate integration pass. No music, voice, network service, AI-generated UI or real research result is claimed.
