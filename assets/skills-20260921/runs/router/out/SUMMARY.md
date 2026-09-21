# Summary — Inkwell public API launch, routing session

## What I produced

- **`out/ROUTE.md`** — routing table for all 4 asks (rate-limiting design, threat model, launch copy, decisions log): which Fabius skill(s), how much machinery, which model tier, and why, per part.
- **`out/THREAT_MODEL.md`** — the part I actually executed: a STRIDE threat model of the sign-up → API-key-issuance → API-request flow, across 4 trust boundaries (browser→signup, signup→key issuance, key→API servers, Google OAuth→backend). 5 ranked findings (1 critical, 2 high, 2 medium), each as severity → fix → proof, plus an explicit dependency note for whoever builds the rate limiter.
- **`out/DECISIONS.md`** — a short, dated decisions log: what was decided this session, why, current status per part, and 3 open questions that need a human call (email verification scope, admin-API plans, who owns abuse-response tooling). This is the "record so the team can pick this up next week" deliverable.
- **`out/SUMMARY.md`** — this file.

## Why the threat model was "the one part most worth doing now"

Nothing is built yet (`CONTEXT.md`: "Nothing has been built for the API yet"), and the threat model surfaced a **critical, load-bearing finding**: the flow as described lets an unverified email mint a working API key immediately, which means an attacker can mint unlimited free-tier keys and bypass the planned per-key rate limits (60/600/3000 rpm) entirely. That finding changes *how* the rate-limiting design (part 1) should be built — it needs to key off verified identity, not raw key existence — so doing the threat model first prevents rework on part 1. It's also the highest-blast-radius, least-reversible of the four asks (a security gap in a paid public API's auth path vs. copy that's easy to edit before send), which matches fabius-praesidium's priority under routing-policy R11 (security calls get the strong tier and get triaged early).

Parts 1 (rate-limiting design) and 3 (launch copy) were deliberately left un-produced this session — both are scoped and ready to pick up (see `out/DECISIONS.md`), but doing them before the threat model risked designing/writing around a flaw that the threat model then invalidates.

## What I checked, and how

This is a design/prose deliverable set — there's no code to execute, so verification was structural, not behavioral:

```
$ wc -l ROUTE.md THREAT_MODEL.md DECISIONS.md
      16 ROUTE.md
      66 THREAT_MODEL.md
      29 DECISIONS.md
     111 total

$ awk -F'|' '/^\|/{print NF}' THREAT_MODEL.md | sort | uniq -c
   6 9
```
The second command confirms the STRIDE grid's 6 table rows (header + separator + 4 boundary rows) all split into 9 fields on `|` — i.e. every row has the same 7 data columns, so the markdown table is structurally well-formed and won't render with a ragged column.

I did not run a markdown linter or renderer (none available offline) — the table-shape check above is a proxy for "will render correctly," not a full render.

## What I did not do / could not check

- **Parts 1 and 3 are not produced** — only routed and reasoned about in `ROUTE.md`/`DECISIONS.md`. This was the deliberate choice explained above.
- **No verification against Inkwell's actual (nonexistent) codebase** — there is no code yet, so the threat model's findings are design requirements, not confirmed-present/absent checks against running software. Each finding's "proof" step is written as a test to run *once the feature exists*, not something I could execute here.
- **No rendering check in an actual markdown viewer** (no internet, nothing installable) — only the structural `awk` check above.
- **The 3 open questions in `DECISIONS.md`** (email-verification scope, admin-API plans, abuse-response ownership) are explicitly unanswered — they need a decision from the team, not something inferable from `CONTEXT.md`.
