# Original artwork source

- `afterlight/scene.js`: original shaders, geometry, camera interpolation and deterministic `window.__seek(t)`.
- `afterlight/scene.html` and `.css`: fixed 1920×1080 artboard and restrained frame typography.
- `render-afterlight.mjs`: one persistent Chrome page; 500 PNG frames stream to ffmpeg; poster/thumbnails and actual receipt follow.
- `write-metadata.mjs`: derives descriptive VTT and chapter VTT from `../film-data.js`.
- `verify.mjs`: executable model, decoded-media and player checks.
- `package.mjs`: rebuilds the portable source archive without temporary render images or retired editions.

The local Rubik variable font is accompanied by its OFL license in `afterlight/OFL.txt`. The root README contains the exact commands, requirements and limits. No runtime service or secret is used.
