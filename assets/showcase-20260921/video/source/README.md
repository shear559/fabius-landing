# Lattice launch film — source

A 39.5-second, 1920×1080, 30 fps silent film for Lattice, authored as HTML/CSS/SVG and rendered
frame by frame in headless Chromium.

## Rebuild

Every command and path in this file is relative to the folder that holds `index.html` (the folder
the archive unpacks to). Run from there:

```sh
node source/render.js
```

Requirements: Node.js, Playwright with Chromium (found through `$PLAYWRIGHT`, or the `playwright`
package), `ffmpeg`/`ffprobe` with libx264 and libvpx-vp9, and `cwebp`. Nothing is fetched from the
network.

It writes into that folder:

| Output | What it is |
| --- | --- |
| `film.mp4` | H.264 High, yuv420p, Rec. 709 matrix tagged, `+faststart`, CRF 23, film tuning |
| `film.webm` | VP9, yuv420p, Rec. 709 matrix tagged, two-pass constrained quality |
| `poster.webp` | frame from the "A notebook" scene, from the lossless master |
| `thumbs/*.webp` | one storyboard key frame per scene |
| `captions.vtt` | one cue per scene describing its picture (the film is silent and shows every word itself), for other players; placed with WebVTT settings in a region no on-screen text enters |
| `chapters.vtt` | one chapter per scene |
| `film-data.js` | the numbers the player page shows, read back from the written files: ffprobe frame count, fps, size and duration; byte sizes from the file system; the contrast table; the reading-time holds |
| `source/frames.sha256` | SHA-256 of every captured PNG frame |

The lossless master (`libx264rgb -qp 0`) goes to `$LATTICE_BUILD`, default
`$TMPDIR/lattice-film-build/`.

Other modes:

```sh
node source/render.js --encode      # re-encode outputs from the existing master (no capture)
node source/render.js --verify 30   # re-capture 30 evenly spaced frames, last first, compare with source/frames.sha256,
                                    # and set the one "verified" result in film-data.js
node source/render.js --verify all  # the same for all 1,185 frames
node source/render.js --meta        # rewrite captions, chapters, contrast and film-data.js only
node source/timing.js               # check the script's reading time without rendering
```

Sizes are decimal: 1 MB = 1,000,000 bytes, 1 kB = 1,000 bytes, as ffprobe and file managers report
them. The page formats them from the byte counts in `film-data.js`, which `source/render.js` takes from
`fs.statSync` after the encodes finish, so the page cannot disagree with the files. The build fails
if either encode is over 6 MB (6,000,000 bytes).

## Timing

`source/timing.js` reads the script at 240 words a minute plus a quarter second per line, starting each line
once it has mostly arrived (0.5 s after it starts). A scene may only begin to leave 0.6 s after its
last line is read; the end card must hold 1.5 s complete before the film ends. The build fails
otherwise. Scenes dip through paper (0.6 s out, 0.6 s in) while the painted blob glides to its next
pose; the end card eases in over 1.2 s and the film ends on it, still.

## Captions

The film has no sound and every word is on screen, so the caption track does not repeat them. Each
scene has one cue, held for the scene, that describes its picture (the `caption` field in
`source/scenes/timeline.js`). Cues are placed where no text in that scene ever goes: the left half
below y = 860 of 1080 for the five paper scenes, centred below y = 810 on the end card. The page itself does not use native caption rendering. Each engine places native cues differently
and draws its controls differently: WebKit lifts a cue above its controls onto the film's text,
Chromium leaves it under its control bar. So `app.js` draws the current cue from `film-data.js` into a
strip directly under the picture, outside the video box; neither the film nor the native controls can
cover it, in any engine or at any width. The captions button shows and hides that strip.

`captions.vtt` is still written for other players, with settings `line:88% position:6% size:48% align:start`
(the end card: `position:50% size:100% align:center`) that keep the cue in the region above. Alignment
suffixes such as `line:96%,end` are not used, because Chromium drops the whole setting when it sees one.

To check the player's captions (Chromium and WebKit, 390, 1280 and 1440 px, paused and playing with the
controls shown, at the start, middle and end of every scene, under the page's Content-Security-Policy):

```sh
node source/tests/captions-test.js
```

## Contrast

`source/contrast.js` measures every on-screen line at rest (all lines in, before the exit starts) on the
rendered pixels. It captures the frame, captures it again with only that line's letters made
transparent, and compares: pixels the letters fully cover give the text colour as drawn, the second
capture gives the exact pixels behind them. It reports the median ratio, the 5th percentile (the
thinnest strokes), and the same on the decoded MP4 frame. Headlines (title, brand) need 3:1; every
other line needs 4.5:1 at both the median and the 5th percentile. The build fails otherwise.

## How the pieces fit

- `source/scenes/timeline.js` is the script: scenes, their times, every on-screen line and each
  scene's caption. The scenes, the captions and the chapters are all generated from it, so they
  cannot drift apart. Every on-screen line is quoted from the Lattice website; no numbers,
  testimonials or claims were added. The captions describe the pictures only.
- `source/scenes/film.html` + `source/scenes/film.css` hold the six scenes. Colours, Rubik, the grain texture, the
  painted blob and the Phosphor Duotone icons come from the site.
- `source/scenes/film.js` exposes `window.__seek(t)`. The scene state is computed from `t` alone:
  no clocks, no CSS transitions or animations, eased entrances only (cubic ease-out, then
  stillness). Each call remounts a clean copy of the stage.
- Preview any moment by opening `source/scenes/film.html?t=12.5` in a browser at 1920×1080.

## Determinism

The scene state depends only on `t`, but the pixels did not: a page that had already drawn other
frames kept rasterised glyphs from them. In the previous build, frames 651 to 653 of the Connect
scene (the small "A growing idea" label, scaled by the slow push on the artwork) came out up to 2 of
255 levels different depending on which frame the page had drawn before; `--verify 30` matched 29 of
30. Remounting the stage did not clear it, and neither did Chromium's font flags. So `source/render.js`
now captures every frame in a page of its own: open `source/scenes/film.html`, draw frame 0, draw
frame f, screenshot, close. Frame f's pixels then depend on f alone, in any capture order.

`source/render.js` hashes every PNG frame it captures into `source/frames.sha256`. `--verify`
re-captures frames in a new browser, in reverse order and in different batches, and compares. This
is a claim about one machine, one Chromium build and one font file; a different Chromium version may
rasterise text differently.

## Licences

Rubik: SIL Open Font License (`source/scenes/assets/OFL.txt`). Phosphor icons: MIT
(`source/scenes/assets/PHOSPHOR-LICENSE.txt`). Lattice is a fictional product.
