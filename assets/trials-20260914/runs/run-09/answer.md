Found and fixed it.

**Cause:** In `readNumbers` (stats.js), the `--file` path did `fs.readFileSync(path, 'utf8').split('\n').map(Number)`. Your `data.txt` ends with a trailing newline (`2\n4\n6\n`), so splitting on `\n` produced `['2','4','6','']` — and `Number('')` evaluates to `0`, not `NaN`. That silently added a phantom `0` to the dataset, making `average` compute `(2+4+6+0)/4 = 3` instead of `4`. The `2 4 6` args path never had this problem since there's no empty trailing argument.

**Fix:** Changed that line to trim and filter out empty lines before converting to numbers:
```js
return fs.readFileSync(path, 'utf8').split('\n').map(s => s.trim()).filter(Boolean).map(Number);
```

**Verified:**
- `node stats.js average 2 4 6` → `4` (unchanged, still correct)
- `node stats.js average --file data.txt` → `4` (was `3`, now correct)
- `sum`/`max` on the same file still work correctly (`12`, `6`)
- Existing test suite (`npm test` / `stats.test.js`) passes
- Edge cases confirmed: file with no trailing newline, and file with blank lines interspersed, both still average correctly

The command-line interface is untouched — only the internal parsing of file contents changed.