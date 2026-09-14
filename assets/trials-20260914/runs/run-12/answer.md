Fixed. It works now.

Root cause: `data.txt` has a trailing newline (`2\n4\n6\n`), so `readNumbers`'s `split('\n')` produced a trailing empty string. `Number('')` is `0`, not `NaN`, so the average silently became `(2+4+6+0)/4 = 3` instead of `12/3 = 4` — a wrong number with no error.

Fix in `[study]/runs/run-12/work/stats.js`, `readNumbers()`: split on `/\r?\n/` and filter out blank lines before mapping to `Number`, instead of a plain `split('\n')`. The `--file <path>` interface is untouched.

Verified live:
- `node stats.js average 2 4 6` → `4` (unchanged)
- `node stats.js average --file data.txt` → `4` (was `3`)
- `node stats.test.js` → `ok` (existing suite still passes)
- Probed adjacent cases the fix touches: no trailing newline, CRLF endings, and a blank line mid-file all still average to `4`; `sum`/`max` via `--file` remain `12`/`6`.