Hi! Thanks for picking up #209 and for the thorough test coverage on the case-preserving behaviour — the `keepCase` test you added is exactly the spec and it still passes untouched.

I did trim the PR down quite a bit, though. Issue #209 asked for one option (`keepCase`, default off), and the PR added a full configurable pipeline around it: `SlugConfig` with its own validation layer, a `StrategyRegistry`, a `CaseStrategyFactory`, separate strategy classes for lowercase/preserve, plus unused knobs like `separator`, `maxLength`, `locale`, `strict`, `customReplacements`, `lowercaseAfter`, and `debug` logging. None of that is exercised by a test or requested by the issue, and it's a lot of new surface (and a new error type, `SlugConfigError`) for callers and future maintainers to reason about.

I replaced it with a single added parameter on `slugify`:

```js
function slugify(input, { keepCase = false } = {}) {
  ...
  if (!keepCase) text = text.toLowerCase();
  const pattern = keepCase ? /[^A-Za-z0-9]+/g : /[^a-z0-9]+/g;
  ...
}
```

Default behaviour is byte-for-byte the same as `main`, and `slugify(text, { keepCase: true })` gives the same result your strategy-based version did (verified against your test case and a few extra manual ones below).

If you do want the pluggable registry/strategy machinery down the line (e.g. for a future title-case or locale-aware strategy), it'd be worth landing as its own PR with tests that actually cover the extra options — that'll make it easier to review on its own merits rather than bundled with a one-option bug fix.

Nice work overall — the core idea (a strategy object for casing) is reasonable, it was just more than #209 needed right now.
