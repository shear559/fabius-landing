# AFTERLIGHT

A study in borrowed light. An independent original motion artwork in five movements: Form, Orbit, Tide, Release and Afterlight. Sixteen metallic bands unfold around a dark sphere as a moving camera and light reveal the surfaces. This is imagined procedural geometry, not filmed astronomy or scientific evidence.

The silent H.264 film is 20 seconds, 1920×1080, 25 fps (500 frames). Open `index.html` through a static server that supports HTTP Range requests. `preview.html` adds the gallery's external control bridge; the portable index has no gallery dependency. Nothing autoplays. Play/pause, restart, scrubbing, chapter navigation and visual descriptions work with keyboard or pointer. Reduced-motion users see an explicit note; switching that preference on pauses playback. Intentional Play remains available.

The MP4, poster, descriptions, chapter file and source package are downloadable. The source archive contains the player, complete film, thumbnails, font/license, original shaders and reproducible rendering scripts. There are no remote runtime dependencies. Retained historical Lattice files are inactive and excluded from the Afterlight source archive.

## Render the artwork

Requirements: an existing Node installation, Playwright, Chrome, ffmpeg/ffprobe, cwebp and zip/unzip. `PLAYWRIGHT` can point to an installed Playwright module. No installation is performed by the scripts.

```sh
node source/render-afterlight.mjs --stills
node source/render-afterlight.mjs
node source/write-metadata.mjs
node source/verify.mjs
node source/package.mjs
```

Set `AFTERLIGHT_RENDER_DIR` and `AFTERLIGHT_VERIFY_DIR` to choose scratch locations; both otherwise use the system temporary directory. These locations are for generated inspection images only. Delete them after review. Full-film PNG frames stream directly into ffmpeg, so no frame folder is created.

`source/afterlight/scene.html?t=14` opens a single frame. `window.__seek(t)` computes geometry, camera, light and act labels solely from time; it uses no animation loop, timers or randomness. A single persistent Chrome page renders every frame. Each ring is a parametric swept surface; analytical transforms deform and tilt the bands. Surface normals, brushed highlights, a sphere occlusion term and restrained warm/cool lighting are evaluated in the original WebGL shaders. There is no image sequence, stock footage, AI image generation, model download or third-party 3D library.

The renderer uses software WebGL for reproducibility and records PNG hashes, sampled scene states, browser version and ffprobe results. H.264 output uses YUV420p, Rec.709 tags and fast-start metadata. The poster and thumbnails come from the same scene. `source/afterlight-render-receipt.json` records the actual render; `source/verification.json` records executed checks. GPU drivers, browser versions and encoders can change pixels between machines; determinism is verified within the recorded environment.

## Verification and limits

`source/verify.mjs` checks timeline boundaries and repeat-seek pixels, decodes the complete MP4, checks five decoded moments for visible progression, and exercises the player at 390 and 1440 pixels with console/network capture. It also attempts a WebKit mobile pass. Review the result file for the actual browser support and pass/fail outcomes; an unavailable browser is recorded, not called a pass.

The artwork is intentionally dark. It has no audio track; captions are descriptions of the visible movements. WebGL is needed only to inspect or re-render the source. Playback uses the encoded MP4 and does not require WebGL. A normal static file server must support Range requests for reliable seeking. The local production-header mirror also passed opaque-origin MP4 and poster downloads with byte-for-byte hash matches; `source/host-verification.json` records that check. Live deployment verification remains an integration responsibility.
