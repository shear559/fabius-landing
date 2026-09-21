# Security review — `server.js` (invoices service)

Pre-production review, `node server.js`, 3 routes: `GET /api/invoices/:id`, `GET /download`,
`POST /api/avatar-from-url`. Ships Friday per README.md.

## Threat model

**Assets:** invoice financial data (`INVOICES`), receipt files (`files/receipts/`), any other
file the process can read (`files/private/ledger.csv`, `server.js` itself, host secrets),
outbound network access from the host, and process availability.

**Trust boundaries:**

| # | Boundary | Description |
|---|----------|--------------|
| B1 | Client → auth | `Authorization: Bearer <token>` header → `userFrom()` |
| B2 | Authenticated client → invoice data | any logged-in user → any invoice record |
| B3 | Authenticated client → filesystem | `?file=` query param → `fs.createReadStream` |
| B4 | Authenticated client → internal network | `imageUrl` body field → server-side `fetch` |
| B5 | Client → process | any request body → JSON parsing |

**Adversary:** an internet client that can register/obtain *some* bearer token (or none), and
wants to read other tenants' data, read host files, reach internal-only network services, or
take the service down.

STRIDE was walked per boundary; the boxes below are where the answer was "yes, they can."

## Findings

### 1 — Critical — Authentication bypass via prototype-chain lookup (B1)

`SESSIONS` was a plain object literal and `userFrom()` did `SESSIONS[token] || null`. Every
plain object inherits enumerable-looking own-lookup targets from `Object.prototype`
(`__proto__`, `constructor`, `toString`, `hasOwnProperty`, …). Sending
`Authorization: Bearer __proto__` (or `constructor`, `toString`, …) makes the lookup return
`Object.prototype`/`Object` — a truthy, non-`null` value — with **zero valid credentials**.
Every route gated on `if (!user)` then treats the request as authenticated, so this is a full
auth bypass, and it compounds with finding 4 to give an unauthenticated attacker read access to
every invoice.

```
$ curl -s -H 'Authorization: Bearer __proto__' http://localhost:3000/api/invoices/1002
{"id":"1002","owner":"bob","amount_cents":4200,"memo":"Camera repair"}   # no valid token used
```

**Fix:** store sessions in a `Map` (`SESSIONS.get(token)`), which has no inherited string keys,
instead of a plain object used as a hash table. Applied in `server.js`.

**Proof:** `test/security.test.js` → `finding 1 (critical): auth cannot be bypassed with a
prototype-chain key`.

### 2 — Critical — Path traversal in `/download` (B3)

`file` was joined onto `RECEIPTS_DIR` with `path.join` and never validated:
`path.join(RECEIPTS_DIR, '../private/ledger.csv')` walks out of the receipts directory. Any
logged-in user (or, combined with finding 1, anyone) can read arbitrary files readable by the
Node process — internal payroll data (`files/private/ledger.csv` in this repo), `server.js`
itself, or further up the filesystem.

```
$ curl -s -H 'Authorization: Bearer tok-alice' \
    'http://localhost:3000/download?file=..%2Fprivate%2Fledger.csv'
employee,role,monthly_salary
J. Ortega,photographer,5200
...
```

**Fix:** run the requested name through `path.basename()` before joining, so any `/` or `..`
segment is stripped and the result can never resolve outside `RECEIPTS_DIR`. Applied in
`server.js`.

**Proof:** `test/security.test.js` → `finding 2 (critical): /download cannot escape the
receipts directory` (plus a regression guard that a real receipt still downloads).

### 3 — High — SSRF in `POST /api/avatar-from-url` (B4)

The handler passed the client-supplied `imageUrl` straight into a server-side `fetch` with no
scheme or destination check. An attacker can make the server issue requests to
loopback/private/link-local addresses it can reach but the attacker cannot — e.g. a cloud
metadata endpoint (`169.254.169.254`), an internal admin panel on `10.0.0.0/8`, or a service
bound to `127.0.0.1` on the host — and read back size/content-type of the response.

**Fix:** `isSafeImageUrl()` requires `http:`/`https:`, resolves the hostname via `dns.lookup`,
and rejects loopback/private/link-local/IPv4-mapped ranges (including the `169.254.169.254`
metadata address) before the real `fetch` is ever issued. Noted residual risk: this is
hostname-based validation, not a bound-and-fetch, so a DNS answer that changes between the
check and the `fetch` call (rebinding) is not covered — flagged here as a known limitation
rather than silently left open.

**Proof:** `test/security.test.js` → `finding 3 (high): SSRF - server-side fetch refuses a
private/link-local target` (asserts the injected `fetchImpl` is never invoked), plus a
regression guard that a public address is still fetched.

### 4 — High — Broken access control / IDOR on `GET /api/invoices/:id` (B2)

The route checked *that* the caller was logged in, but never *that the caller owns the
invoice*: any authenticated user could read any other user's invoice by guessing/incrementing
the id. `curl -H 'Authorization: Bearer tok-alice' /api/invoices/1002` returned Bob's invoice.

**Fix:** added an `invoice.owner !== user` check, returning `404` (not `403`) for someone
else's invoice — same response as a non-existent id, so the endpoint doesn't confirm which ids
exist to a non-owner. Applied in `server.js`.

**Proof:** `test/security.test.js` → `finding 4 (high): IDOR - authenticated user cannot read
another user's invoice` (plus a regression guard that the owner can still read their own).

### 5 — Medium — Unhandled rejection crashes the whole process on a malformed body (B5)

`readBody()` calls `JSON.parse(data)`, which throws on invalid JSON. That throw happened
inside an `async` request handler that `http.createServer` does not await, so the rejection was
unhandled — and Node terminates the process on an unhandled rejection by default. A single
`POST /api/avatar-from-url` with a malformed body (no valid auth even required to reach the
`readBody` call after fixing finding 1, but a valid token suffices before that) takes down the
entire service for every user, not just the one connection.

This is a single-request crash of the whole process, not a volumetric/rate-limiting concern, so
it's treated as a real finding rather than excluded as generic DoS.

**Fix:** wrapped the route dispatch in `try { … } catch { send(res, 400, …) }`, so any parsing
or validation error becomes a `400` response instead of an uncaught exception. Applied in
`server.js`.

**Proof:** `test/security.test.js` → `finding 5 (medium): malformed JSON body does not crash
the server` (sends a malformed body, then confirms a second request still gets served).

## Not changed / out of scope

- Bearer tokens here are static, long-lived, and unscoped — real session rotation/expiry would
  be part of a production auth system, but rewriting the auth model is a larger change than this
  review's scope (fixing the specific bypass in finding 1). Flagged for follow-up.
- No rate limiting on any route — generic DoS/resource-exhaustion is on the review's do-not-report
  list; finding 5 was reported instead because it's a single-request crash, not a volumetric
  concern.
- SSRF fix is hostname/IP-range based, not a full bind-time IP pin; DNS-rebinding is a known
  residual risk noted in finding 3.
