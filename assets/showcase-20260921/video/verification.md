# Verification — Lattice launch film

Date: September 21, 2026.

Measured with ffprobe: 39.5 s, 1920×1080, 30 fps. film.mp4 is H.264, yuv420p, faststart, 5.33 MB. film.webm is VP9, 5.88 MB. Both play in Chromium and WebKit with captions on, and the chapters seek. The build session reports 20 of 20 on-screen lines passing contrast at rest; that measurement was not re-run independently.

Built with Fabius 3.2.0 (fabius-decor) in a headless Claude Code session on claude-opus-5, then refined in a second one. It is not a controlled comparison. See ../verification.html.
