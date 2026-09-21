# Summary — pre-production security review of `server.js`

## What I produced

- `out/SECURITY-REVIEW.md` — trust-boundary threat model and 5 findings, each with
  severity → fix → proof.
- Fixes applied directly to `server.js` (in place, no new files, no new dependencies —
  `node:dns` and `node:net` are Node built-ins).
- `test/security.test.js` — 8 new regression tests (5 exploit tests + 3 "legitimate use still
  works" guards), alongside the pre-existing `test/server.test.js` (2 tests, untouched and
  still passing).

## Findings (severity → one-line description)

1. **Critical** — auth bypass: `Authorization: Bearer __proto__` (or `constructor`, `toString`,
   …) authenticated with no valid token, because sessions were looked up on a plain object.
2. **Critical** — path traversal in `/download?file=` let any logged-in user read arbitrary
   files on disk (e.g. `files/private/ledger.csv`).
3. **High** — SSRF in `POST /api/avatar-from-url`: the server fetched any attacker-supplied URL,
   including loopback/private/link-local/metadata addresses.
4. **High** — IDOR in `GET /api/invoices/:id`: any authenticated user could read any other
   user's invoice, not just their own.
5. **Medium** — malformed JSON body crashed the entire process (unhandled promise rejection),
   a single-request denial of service for every user.

Full detail, exploit reproduction, and fix rationale for each: `out/SECURITY-REVIEW.md`.

## What I checked, and how

### 1. Reproduced each vulnerability against the original code before touching it

Ran live requests against `createServer()` from the untouched original `server.js` (saved
aside as `/tmp/server.original.js` before editing, since there's no git repo here to diff
against). Real output:

```
proto bypass status 200 {"id":"1002","owner":"bob","amount_cents":4200,"memo":"Camera repair"}
constructor bypass status 200 {"id":"1002","owner":"bob","amount_cents":4200,"memo":"Camera repair"}
traversal status 200
employee,role,monthly_salary
J. Ortega,photographer,5200
M. Cohen,editor,4800

IDOR status 200 {"id":"1001","owner":"alice","amount_cents":12900,"memo":"Studio rent, September"}
UNHANDLED REJECTION - would crash by default: Unexpected token 'o', "not-json{{{" is not valid JSON
```

### 2. Wrote regression tests, ran them against the vulnerable code — all fail

`node --test test/security.test.js` against the original `server.js`:

```
✖ finding 1 (critical): auth cannot be bypassed with a prototype-chain key (85.066611ms)
✖ finding 2 (critical): /download cannot escape the receipts directory (7.420429ms)
✔ finding 2 (regression guard): a real receipt is still downloadable (4.379759ms)
✖ finding 3 (high): SSRF - server-side fetch refuses a private/link-local target (10.012134ms)
✔ finding 3 (regression guard): a public URL is still fetched (4.049295ms)
✖ finding 4 (high): IDOR - authenticated user cannot read another user's invoice (6.179762ms)
✔ finding 4 (regression guard): owner can still read their own invoice (4.126655ms)
✖ finding 5 (medium): malformed JSON body does not crash the server (4.413638ms)
```

(The "regression guard" tests — that legitimate use keeps working — correctly pass even on the
vulnerable code, since they're not exploits.) Note: on the original code, finding 5's crash
kills the child process the test runner spawned for that request; the test still reports a
correct `✖` (bounded by a 2s `AbortSignal.timeout` so it fails fast instead of hanging), but the
runner takes longer to tear that child process down afterward.

### 3. Applied the fixes, ran the same suite again — all pass

`node --test` (whole `test/` directory, the command from README.md) against the fixed
`server.js`:

```
✔ finding 1 (critical): auth cannot be bypassed with a prototype-chain key (90.273177ms)
✔ finding 2 (critical): /download cannot escape the receipts directory (10.999103ms)
✔ finding 2 (regression guard): a real receipt is still downloadable (7.08803ms)
✔ finding 3 (high): SSRF - server-side fetch refuses a private/link-local target (15.048907ms)
✔ finding 3 (regression guard): a public URL is still fetched (4.859567ms)
✔ finding 4 (high): IDOR - authenticated user cannot read another user's invoice (2.875795ms)
✔ finding 4 (regression guard): owner can still read their own invoice (3.274811ms)
✔ finding 5 (medium): malformed JSON body does not crash the server (7.531298ms)
✔ owner can read their invoice (86.947232ms)
✔ login is required (8.926352ms)
ℹ tests 10
ℹ pass 10
ℹ fail 0
```

All 10 tests pass, including the two pre-existing tests in `test/server.test.js`, confirming no
regression to already-working behavior.

### 4. Re-verified each PoC directly against the fixed server

```
proto bypass ->                    401  (was 200)
traversal ->                       404  (was 200, leaked ledger.csv)
IDOR alice->bob invoice ->         404  (was 200)
owner still works ->               200  (unchanged — legitimate access preserved)
malformed json ->                  400  (was: process crash)
ssrf metadata (169.254.169.254) -> 400  (was: server-side fetch issued)
legit download still works ->      200  (unchanged — legitimate access preserved)
server still alive after crash test -> confirmed
```

### 5. Supply chain / dependency audit

No `package.json`, no dependencies — the service is Node built-ins only
(`node:http`, `node:fs`, `node:path`, `node:dns`, `node:net`, all added-in-fix modules also
built-in). Nothing to pin or run `npm audit` against.

### 6. Syntax/sanity check

```
$ node --check server.js
syntax OK
```

## What I did not do / could not check

- **No live production/staging deploy check** — this is a local, dependency-free `node:http`
  service with no build step or deploy config in this folder, so "run it in the real
  environment" isn't applicable here; verification was done by starting the server in-process
  (as the existing test suite already does) and issuing real HTTP requests against it.
- **Session/token model left as-is** — tokens (`tok-alice`, `tok-bob`) are static, never expire,
  and aren't rate-limited at the login boundary. Fixing the specific auth-bypass bug (finding 1)
  was in scope; redesigning the auth system (rotation, expiry, rate limiting) is a larger change
  called out as follow-up in `SECURITY-REVIEW.md`, not attempted here.
- **SSRF fix is hostname/IP-range based, not bind-time IP pinning** — a DNS answer that changes
  between the `dns.lookup` check and the actual `fetch` (DNS rebinding) is not covered. Flagged
  explicitly as a residual risk in finding 3 rather than silently left unaddressed.
- **No external dependency scan** was needed/possible since the project has zero dependencies
  and there's no internet access in this environment anyway.
- **No fuzzing / broader input-space testing** — the review targeted the exploitable paths found
  during manual trust-boundary analysis of all three routes; it wasn't a fuzzing pass over every
  possible input.
