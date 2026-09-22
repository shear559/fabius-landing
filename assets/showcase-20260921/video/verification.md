# Verification — Lattice launch film

Date: September 22, 2026.

Measured with ffprobe: 39.5 s, 1920×1080, 30 fps. film.mp4 is H.264, yuv420p, faststart, 5.33 MB. film.webm is VP9, 5.95 MB. Both play in Chromium and WebKit with captions on, and the chapters seek. The film is silent and shows its own words, so the captions describe the picture in six cues, drawn by the page in a strip under the picture, where they can never cover the film or the player controls. An independent rerun of `node source/render.js --verify 30`, from the folder this archive unpacks to, re-captured 30 frames and all 30 matched the recorded hashes. The build session reports every on-screen line passing contrast at rest; that measurement was not re-run independently.

Built with Fabius 3.2.0 (fabius-decor) in a headless Claude Code session on claude-opus-5, then refined in three more. It is not a controlled comparison. See ../verification.html.
