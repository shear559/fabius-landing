# Threat model — Inkwell sign-up & API-key flow

Scope: the path from "visitor lands on inkwell.app" to "workspace has a working API key that can call the paid public API." Nothing is built yet, so every ❌ below is a design requirement, not a regression.

## Scope

```
Assets:           user accounts (41k MAU) · workspace note data (private, business-sensitive for
                   1,900 paying teams) · billing tier (free/pro/team — determines rate limit and
                   what the customer pays for) · API keys (bearer secrets) · session tokens (Redis)
Trust boundaries: (A) browser → signup (email+password / Google)
                  (B) signup → API-key issuance (new workspace mints a key immediately)
                  (C) API key in the wild → API servers (per-request, behind the LB)
                  (D) Google → Inkwell backend (OAuth identity assertion)
Adversary:        unauthenticated internet actor automating account creation; a workspace member
                   or ex-member misusing a key they still hold; anyone who finds a key leaked in a
                   public repo / log / support ticket; a paying customer's competitor trying to
                   read the customer's rate-limit budget or data via a stolen key
```

## STRIDE grid

| Boundary | Spoofing | Tampering | Repudiation | Info-disclosure | DoS | Elevation |
|---|---|---|---|---|---|---|
| (A) browser → signup | email ownership not proven before workspace is usable ❌ | client must never set its own plan/tier field — server derives it from billing state ❌ (unbuilt: state explicitly) | no signup/login event log (actor, IP, timestamp) ❌ | password-reset / signup errors must not reveal "email exists" (user enumeration) ❌ (design now) | no CAPTCHA/velocity limit on signup → scripted mass account creation ❌ | N/A here |
| (B) signup → key issuance | N/A (same principal) | key must be stored **hashed** in Postgres, never plaintext ❌ (unbuilt: state explicitly) | key create/rotate/revoke not logged with actor+timestamp ❌ | key must be shown **once** at creation, never retrievable again (only regenerate) ❌ (design now) | no cap on keys-per-workspace or workspaces-per-email/IP → mints many free-tier identities to dodge per-key limits ❌ | key-scoped-to-workspace must be re-validated server-side on every resource access (IDOR) ❌ (design now) |
| (C) key → API servers | bearer key accepted **only** via `Authorization` header, never query string (query strings land in access logs / proxies / `Referer`) ❌ (design now) | tier/limit enforcement must live at a single shared layer (Redis-backed), not duplicated per-instance-in-memory across the 4 LB'd instances ❌ (feeds part 1) | every request logged with key-id + workspace-id for abuse/billing disputes ❌ | key value never echoed in error bodies or logs; HTTPS-only, no plain-HTTP fallback ✅ (HTTPS already stated) | a leaked key lets an attacker burn a *paying* team's entire rate budget — fast one-click revoke/rotate is a DoS mitigation, not just hygiene ❌ (design now) | workspace-scoped key must never reach an admin/global endpoint if one is ever added — separate credential type ❌ (design now, low urgency) |
| (D) Google → backend | Google `id_token` signature + audience verified server-side, not trusted from client-passed profile JSON ❌ (design now) | N/A | N/A | OAuth tokens never logged ❌ (design now) | N/A | OAuth callback needs `state`/nonce to block CSRF account-linking (attacker links their Google identity to a victim's session) ❌ (design now) |

Empty cells above are marked **N/A** deliberately (no plausible threat at that intersection); every other cell is ✅ *mitigation already stated in context* or ❌ *unbuilt / undecided — work list*.

## Ranked findings (severity → fix → proof)

**[critical] Unverified email can mint a working API key immediately (Boundary A→B)**
Context states "a new workspace can create an API key immediately" with no mention of email verification. Combined with free-tier limits (60 rpm) and no signup throttling, this means the *workspace-level* rate limits planned for part 1 are meaningless — an attacker scripts unlimited free-tier signups, each with its own 60 rpm budget, for unlimited aggregate throughput against the API for free.
→ fix: require verified email (or completed Google OAuth, which is pre-verified) before an API key is issued; unverified accounts get no key. Add signup velocity limiting (per-IP, per-email-domain) alongside it.
→ proof: automated test that POSTs 50 signups from one IP in one minute and asserts the request is throttled/CAPTCHA-gated before the 50th account exists; a second test asserts `/api-keys` returns 403 for an unverified account.

**[high] API keys stored/shown in a way that isn't specified — must be hash-at-rest + show-once**
Nothing built yet, so this is a design decision to lock in before the first line of key-storage code: plaintext keys in Postgres turn any DB read (backup leak, SQLi, insider) into a mass compromise of all 1,900 paying teams' keys at once.
→ fix: store only a salted hash (e.g. SHA-256 of a high-entropy random key) and display the raw key exactly once at creation time; all later views show only a prefix/last-4 for identification, with "regenerate" as the only recovery path.
→ fix: `Authorization: Bearer <key>` header only — reject keys passed as query params, since those get written to LB/access logs.
→ proof: DB row inspection after key creation contains no reversible plaintext; a request with `?api_key=...` in the URL returns 401.

**[high] No audit trail for key lifecycle or request attribution (Boundary A/B/C, Repudiation column)**
With no logging plan stated, a compromised or misused key is undiagnosable after the fact and a customer billing dispute ("we didn't make those calls") is unresolvable.
→ fix: append-only log of key create/rotate/revoke (actor, IP, timestamp) and per-request access log keyed by key-id + workspace-id (not the raw key).
→ proof: query the log after a scripted create→call→revoke sequence and confirm all three events are present and attributable.

**[medium] Google OAuth callback needs `state`/nonce verification and server-side `id_token` validation**
Standard OAuth-integration gap if not called out explicitly before implementation; enables account-linking CSRF and identity spoofing.
→ fix: generate and check a per-session `state` value on the callback; verify `id_token` signature, issuer, and audience server-side using Google's public keys — never trust a client-submitted profile object.
→ proof: replay a callback with a mismatched/missing `state` and confirm the request is rejected before any session is created.

**[medium] Leaked key = DoS against the paying customer who owns it, not just a security event**
A stolen Team-tier key (3,000 rpm) lets an attacker exhaust that customer's own rate budget, degrading the product for the legitimate team — this is a business-impact finding, not only confidentiality.
→ fix: self-serve "revoke and regenerate" must be reachable in ≤2 clicks from the workspace settings, and should not require support intervention; consider an anomaly alert (sudden spike from a new IP/ASN) once telemetry exists.
→ proof: manual click-through of the revoke flow once built; confirm the old key 401s within one request cycle (no cache/propagation lag across the 4 instances).

## Cross-cutting dependency for part 1 (rate-limiting design)

The rate-limiting design is only as strong as the identity it's rate-limiting. The **critical** finding above (unverified email → free API key) means whoever designs the rate limiter should key limits off a *verified* workspace identity, and the signup-throttling fix belongs in the same review — otherwise part 1 will correctly enforce 60 rpm per key while an attacker simply mints keys faster than that.

## What this does not cover

Out of scope for this pass: the rate-limiter's own implementation (part 1, routed separately), payment/billing-flow security (Stripe-class integration wasn't in CONTEXT.md), and infrastructure hardening (LB/TLS config, dependency audit) — those need their own pass once code exists to audit.
