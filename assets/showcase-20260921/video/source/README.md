# Lattice launch film — source

A 39.5-second, 1920×1080, 30 fps silent film for Lattice, authored as HTML/CSS/SVG and rendered
frame by frame in headless Chromium.

## Rebuild

From the `product/` folder:

```sh
node source/render.js
```

Requirements: Node.js, Playwright with Chromium (found through `$PLAYWRIGHT`, or the `playwright`
package), `ffmpeg`/`ffprobe` with libx264 and libvpx-vp9, and `cwebp`. Nothing is fetched from the
network.

It writes, next to `index.html`:

| Output | What it is |
| --- | --- |
| `film.mp4` | H.264 High, yuv420p, Rec. 709 matrix tagged, `+faststart`, CRF 23, film tuning |
| `film.webm` | VP9, yuv420p, Rec. 709 matrix tagged, two-pass constrained quality |
| `poster.webp` | frame from the "A notebook" scene, from the lossless master |
| `thumbs/*.webp` | one storyboard key frame per scene |
| `captions.vtt` | a new cue each time a line appears, holding every line then on screen in reading order, until the next line or the scene's end |
| `chapters.vtt` | one chapter per scene |
| `film-data.js` | the numbers the player page shows, read back from the written files: ffprobe frame count, fps, size and duration; byte sizes from the file system; the contrast table; the reading-time holds |
| `source/frames.sha256` | SHA-256 of every captured PNG frame |

The lossless master (`libx264rgb -qp 0`) goes to `$LATTICE_BUILD`, default
`$TMPDIR/lattice-film-build/`.

Other modes:

```sh
node source/render.js --encode      # re-encode outputs from the existing master (no capture)
node source/render.js --verify 30   # re-capture 30 evenly spaced frames and compare with frames.sha256
node source/render.js --meta        # rewrite captions, chapters, contrast and film-data.js only
node source/timing.js               # check the script's reading time without rendering
```

Sizes are decimal: 1 MB = 1,000,000 bytes, 1 kB = 1,000 bytes, as ffprobe and file managers report
them. The page formats them from the byte counts in `film-data.js`, which `render.js` takes from
`fs.statSync` after the encodes finish, so the page cannot disagree with the files. The build fails
if either encode is over 6 MB (6,000,000 bytes).

## Timing

`timing.js` reads the script at 240 words a minute plus a quarter second per line, starting each line
once it has mostly arrived (0.5 s after it starts). A scene may only begin to leave 0.6 s after its
last line is read; the end card must hold 1.5 s complete before the film ends. The build fails
otherwise. Scenes dip through paper (0.6 s out, 0.6 s in) while the painted blob glides to its next
pose; the end card eases in over 1.2 s and the film ends on it, still. Captions merge lines that
arrive within 0.6 s of each other, so no caption flashes up for a fraction of a second.

## Contrast

`contrast.js` measures every on-screen line at rest (all lines in, before the exit starts) on the
rendered pixels. It captures the frame, captures it again with only that line's letters made
transparent, and compares: pixels the letters fully cover give the text colour as drawn, the second
capture gives the exact pixels behind them. It reports the median ratio, the 5th percentile (the
thinnest strokes), and the same on the decoded MP4 frame. Headlines (title, brand) need 3:1; every
other line needs 4.5:1 at both the median and the 5th percentile. The build fails otherwise.

## How the pieces fit

- `scenes/timeline.js` is the script: scenes, their times and every on-screen line. The scenes,
  the captions and the chapters are all generated from it, so they cannot drift apart. Every line
  is quoted from the Lattice website; no numbers, testimonials or claims were added.
- `scenes/film.html` + `film.css` hold the six scenes. Colours, Rubik, the grain texture, the
  painted blob and the Phosphor Duotone icons come from the site.
- `scenes/film.js` exposes `window.__seek(t)`. A frame is a pure function of `t`: no clocks,
  no CSS transitions or animations, eased entrances only (cubic ease-out, then stillness).
  Each call remounts a clean copy of the stage, because reusing one DOM let Chromium keep
  rasterised layers from earlier frames and made pixels depend on render order.
- Preview any moment by opening `scenes/film.html?t=12.5` in a browser at 1920×1080.

## Determinism

`render.js` hashes every PNG frame it captures. `--verify` re-captures a sample in a fresh browser,
in a different order, and compares. Identical frames are expected on the same machine, Chromium
build and font file; a different Chromium version may rasterise text differently.

## Licences

Rubik: SIL Open Font License (`scenes/assets/OFL.txt`). Phosphor icons: MIT
(`scenes/assets/PHOSPHOR-LICENSE.txt`). Lattice is a fictional product.
