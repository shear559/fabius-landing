# Contrast and safe-area report

worst pixel in each text layer box vs. the same render with type hidden; WCAG 2.x relative luminance.

Thresholds (WCAG 2.x AA): large text (>= 24 px, or >= 18.66 px bold) needs 3:1; body text needs 4.5:1.

| Format | Size | Text layers | Lowest large text (needs 3:1) | Lowest body text (needs 4.5:1) | AA | In safe area | PNG / WebP size | Export = render |
|---|---|---|---|---|---|---|---|---|
| billboard | 1920x1080 | 8 | 3.69:1 (headline-2, 96 px) | 13.88:1 (eyebrow, 22 px) | pass | yes | 1920,1080 / 1920,1080 | yes |
| social | 1080x1350 | 7 | 3.93:1 (headline-2, 92 px) | 13.88:1 (eyebrow, 22 px) | pass | yes | 1080,1350 / 1080,1350 | yes |
| story | 1080x1920 | 8 | 3.93:1 (headline-2, 112 px) | 13.88:1 (fiction, 22 px) | pass | yes | 1080,1920 / 1080,1920 | yes |
| square | 1080x1080 | 4 | 8.76:1 (tagline, 84 px) | 13.88:1 (eyebrow, 20 px) | pass | yes | 1080,1080 / 1080,1080 | yes |
| card | 1200x630 | 5 | 3.93:1 (headline-2, 62 px) | 13.88:1 (fiction, 18 px) | pass | yes | 1200,630 / 1200,630 | yes |

## Every layer

| Format | Layer | Text | px | Needs | Worst-pixel ratio | Safe |
|---|---|---|---|---|---|---|
| billboard | wordmark | lattice | 52 | 3:1 | 13.88:1  | yes |
| billboard | eyebrow | A QUIET PLACE FOR A CURIOUS MIND | 22 | 4.5:1 | 13.88:1  | yes |
| billboard | headline | Collect the pieces. | 96 | 3:1 | 13.88:1  | yes |
| billboard | headline-2 | Find the connection. | 96 | 3:1 | 3.69:1  | yes |
| billboard | lead | A notebook for the thought that | 40 | 3:1 | 13.88:1  | yes |
| billboard | lead-2 | becomes something bigger. | 40 | 3:1 | 13.88:1  | yes |
| billboard | note | Local-first. Your notes. Your next idea. | 26 | 3:1 | 8.76:1  | yes |
| billboard | fiction | Lattice is a fictional product demonstration. | 22 | 4.5:1 | 13.88:1  | yes |
| social | eyebrow | A QUIET PLACE FOR A CURIOUS MIND | 22 | 4.5:1 | 13.88:1  | yes |
| social | headline | Collect the pieces. | 92 | 3:1 | 13.88:1  | yes |
| social | headline-2 | Find the connection. | 92 | 3:1 | 3.93:1  | yes |
| social | lead | A notebook for the thought that | 36 | 3:1 | 13.88:1  | yes |
| social | lead-2 | becomes something bigger. | 36 | 3:1 | 13.88:1  | yes |
| social | wordmark | lattice | 44 | 3:1 | 13.88:1  | yes |
| social | fiction | Lattice is a fictional product demonstration. | 22 | 4.5:1 | 13.88:1  | yes |
| story | wordmark | lattice | 48 | 3:1 | 13.88:1  | yes |
| story | eyebrow | A QUIET PLACE FOR A CURIOUS MIND | 24 | 3:1 | 13.88:1  | yes |
| story | headline | Collect | 112 | 3:1 | 13.88:1  | yes |
| story | headline | the pieces. | 112 | 3:1 | 13.88:1  | yes |
| story | headline-2 | Find the | 112 | 3:1 | 3.93:1  | yes |
| story | headline-2 | connection. | 112 | 3:1 | 3.93:1  | yes |
| story | note | Local-first. Your notes. Your next idea. | 28 | 3:1 | 8.76:1  | yes |
| story | fiction | Lattice is a fictional product demonstration. | 22 | 4.5:1 | 13.88:1  | yes |
| square | eyebrow | A QUIET PLACE FOR A CURIOUS MIND | 20 | 4.5:1 | 13.88:1  | yes |
| square | wordmark | lattice | 42 | 3:1 | 13.88:1  | yes |
| square | tagline | Make room for | 84 | 3:1 | 13.88:1  | yes |
| square | tagline | the connection. | 84 | 3:1 | 8.76:1  | yes |
| card | wordmark | lattice | 36 | 3:1 | 13.88:1  | yes |
| card | headline | Collect the pieces. | 62 | 3:1 | 13.88:1  | yes |
| card | headline-2 | Find the connection. | 62 | 3:1 | 3.93:1  | yes |
| card | note | Local-first. Your notes. Your next idea. | 24 | 3:1 | 13.88:1  | yes |
| card | fiction | Lattice is a fictional product demonstration. | 18 | 4.5:1 | 13.88:1  | yes |
