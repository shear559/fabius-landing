Found and fixed it.

**Cause:** `data.txt` ends with a trailing newline (`2\n4\n6\n`). In `readNumbers()`, the `--file` path did `.split('\n').map(Number)`, which turned the trailing empty string after the last newline into an extra `0` in the array. That gave `(2+4+6+0)/4 = 3` instead of `(2+4+6)/3 = 4` — matching the wrong output reported.

**Fix** (in `stats.js`, `readNumbers`): trim each line and drop empty ones before converting to numbers, so trailing/blank lines no longer inject spurious zeros:

```js
return fs.readFileSync(path, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0)
  .map(Number);
```

The CLI itself (`average|sum|max [numbers...] | --file <path>`) is unchanged.

**Verified:**
- `node stats.js average 2 4 6` → `4`
- `node stats.js average --file data.txt` → `4` (was `3` before the fix)
- `node stats.js sum --file data.txt` → `12`, `node stats.js max --file data.txt` → `6`
- Existing test suite (`npm test`) still passes (`ok`)

File changed: `[study]/runs/run-11/work/stats.js`