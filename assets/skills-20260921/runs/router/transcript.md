# fabius — full run transcript

Clean Claude Code session with only the Fabius plugin loaded. Tool results are shortened to 1,500 characters; paths are masked.

## The brief

```
/fabius:fabius Next month we open a paid public API for our note-taking app (context in CONTEXT.md). I need four things: a rate-limiting design for the API, a threat model of the sign-up and API-key flow, the launch announcement for our newsletter, and a record of the decisions so the team can pick this up next week.

Plan it first. For each part, say which Fabius skills you load, how much machinery the part needs, which model tier it deserves, and why. Write that routing plan to out/ROUTE.md as a table. Then do the one part that is most worth doing now, and say why you chose it.

---
How to work here:
- Everything you need is in this folder. There is no internet access and nothing may be installed. Use Node.js built-ins (Node 26) and Python 3.9 with its standard library plus numpy and scipy.
- Put every deliverable in ./out/.
- Finish with ./out/SUMMARY.md: what you produced, what you checked and how (paste the real command output), and what you did not do or could not check.
- Aim to finish in about 15 minutes.

```

**Bash**

```
{
 "command": "ls -la && echo --- && find . -maxdepth 3 -type f | head -100"
}
```

```
total 8
drwxr-xr-x@ 4 [owner]  wheel  128 Sep 21 19:36 .
drwxr-xr-x@ 6 [owner]  wheel  192 Sep 21 19:36 ..
-rw-r--r--@ 1 [owner]  wheel  676 Sep 21 19:36 CONTEXT.md
drwxr-xr-x@ 2 [owner]  wheel   64 Sep 21 19:36 out
---
./CONTEXT.md
```

**Read**

```
{
 "file_path": "./CONTEXT.md"
}
```

```
1	# Inkwell — context for the API launch
2	
3	- Inkwell is a note-taking app: 41,000 monthly active users, 1,900 paying teams.
4	- The public API opens on 2026-10-15: REST over HTTPS, one API key per workspace, keys created in the web app.
5	- Planned limits: Free 60 requests/minute, Pro 600 requests/minute, Team 3,000 requests/minute.
6	- Stack: Node.js API servers behind a load balancer (4 instances), Postgres, Redis already used for sessions.
7	- Sign-up: email + password or Google sign-in; a new workspace can create an API key immediately.
8	- Team: 2 backend engineers, 1 designer, 1 marketer. The newsletter goes to 38,000 subscribers.
9	- Nothing has been built for the API yet.
10	
```

**Skill**

```
{
 "skill": "fabius:fabius-praesidium",
 "args": "Threat model the sign-up and API-key flow for Inkwell's new paid public API (STRIDE per trust boundary), before any code is written."
}
```

```
Launching skill: fabius:fabius-praesidium
```

**Bash**

```
{
 "command": "sed -n '1,80p' \"[fabius-3.2.0]/skills/fabius-praesidium/references/security-playbook.md\" 2>/dev/null | head -100"
}
```

```
# Fabius Praesidium — security playbook

The operational depth for `fabius-praesidium`. The skill is the contract (threat-model → audit → harden → prove); this file is how you actually run each step — full templates, every variant, worked examples. The **deep** hardening + audit library (HTTP headers, auth patterns, per-type validation cookbook, output-encoding by sink, supply-chain commands, per-stack quick-harden) lives in the companion [hardening-guides.md](hardening-guides.md), indexed by [CORPUS.md](../../../CORPUS.md) and paged in **one slice at a time** (routing-policy R9 · M9). **Defensive only — harden / detect / audit / test. Scout wide, strike narrow.**

---

## 1. STRIDE per trust boundary — the template

You can't harden a surface you haven't mapped. First name the three things, then walk STRIDE per boundary. Each cell is a question — *can they?* An empty cell is an **un-checked** threat, not a safe one.

**Scope it first (fill before the grid):**
```
Assets:           <data · money · identity · availability — what's worth stealing/breaking>
Trust boundaries: <every edge data crosses a privilege line: client→server, svc→svc, user→admin, untrusted→trusted>
Adversary:        <who · what access they start with · which asset they want>
```

**The grid** — one row per boundary, one mitigation note per threat:

| Boundary | Spoofing | Tampering | Repudiation | Info-disclosure | DoS | Elevation |
|---|---|---|---|---|---|---|
| client → server | | | | | | |
| service →  …
```

**Fabius:** Good, I have the template. Now let me write the routing plan and the threat model.

**Write**

```
{
 "file_path": "./out/ROUTE.md",
 "content": "# Routing plan — Inkwell public API launch\n\nFour independent deliverables, routed separately. \"Machinery\" follows the fabius capability ladder (R2–R3): stay at the smallest rung that holds a high-quality answer — a single-pass draft, one specialist skill, no swarm, unless the task itself has parallel/independent sub-parts.\n\n| # | Part | Fabius skill(s) loaded | Machinery | Model tier | Why |\n|---|------|------------------------|-----------|------------|-----|\n| 1 | Rate-limiting design for the API | `fabius-disciplina` (system design: evidence, alternatives, proof) under `fabius-parcus` | Single-pass design doc: one agent, no swarm — algorithm choice (token bucket vs sliding window), key (per-API-key vs per-workspace), storage (existing Redis), behavior across the 4 LB'd instances, 429/header contract, tier mapping to the numbers already given (60/600/3000 rpm) | **Strong** | Real architectural judgment under ambiguity that's expensive to get wrong later: race conditions across 4 stateless instances sharing Redis, burst vs sustained limits, what happens at tier boundaries. Not mechanical — this is exactly the \"architecture, ambiguity\" case routing-policy R11 reserves the strong tier for. |\n| 2 | Threat model of sign-up + API-key flow | `fabius-praesidium` (STRIDE per trust boundary, OWASP pass) | Single-pass STRIDE grid over 2–3 trust boundaries (client→signup, signup→key-issuance, key→API), no swarm, no offensive tooling (defensive only) | **Strong** | Security judgment on a flow that gates a *paid* public API — wrong calls here (e.g. unthrottled signup, key shown once vs logged, Google-vs-password parity) are hard to reverse once workspaces and keys exist in the wild. Routing-policy R11 puts security calls in the strong-tier bucket explicitly. |\n| 3 | Launch announcement for the newsletter | `fabius-mercatus` (positioning, message-to-awareness match, copy …
```

```
File created successfully at: ./out/ROUTE.md (file state is current in your context — no need to Read it back)
```

**Fabius:** Now I'll produce the threat model — the chosen deliverable.

**Write**

```
{
 "file_path": "./out/THREAT_MODEL.md",
 "content": "# Threat model — Inkwell sign-up & API-key flow\n\nScope: the path from \"visitor lands on inkwell.app\" to \"workspace has a working API key that can call the paid public API.\" Nothing is built yet, so every ❌ below is a design requirement, not a regression.\n\n## Scope\n\n```\nAssets:           user accounts (41k MAU) · workspace note data (private, business-sensitive for\n                   1,900 paying teams) · billing tier (free/pro/team — determines rate limit and\n                   what the customer pays for) · API keys (bearer secrets) · session tokens (Redis)\nTrust boundaries: (A) browser → signup (email+password / Google)\n                  (B) signup → API-key issuance (new workspace mints a key immediately)\n                  (C) API key in the wild → API servers (per-request, behind the LB)\n                  (D) Google → Inkwell backend (OAuth identity assertion)\nAdversary:        unauthenticated internet actor automating account creation; a workspace member\n                   or ex-member misusing a key they still hold; anyone who finds a key leaked in a\n                   public repo / log / support ticket; a paying customer's competitor trying to\n                   read the customer's rate-limit budget or data via a stolen key\n```\n\n## STRIDE grid\n\n| Boundary | Spoofing | Tampering | Repudiation | Info-disclosure | DoS | Elevation |\n|---|---|---|---|---|---|---|\n| (A) browser → signup | email ownership not proven before workspace is usable ❌ | client must never set its own plan/tier field — server derives it from billing state ❌ (unbuilt: state explicitly) | no signup/login event log (actor, IP, timestamp) ❌ | password-reset / signup errors must not reveal \"email exists\" (user enumeration) ❌ (design now) | no CAPTCHA/velocity limit on signup → scripted mass account creation ❌ | N/A here |\n| (B) signup → key issuance | N/A (same p …
```

```
File created successfully at: ./out/THREAT_MODEL.md (file state is current in your context — no need to Read it back)
```

**Fabius:** Now the decisions record for the team, plus SUMMARY.md.

**Write**

```
{
 "file_path": "./out/DECISIONS.md",
 "content": "# Decisions log — Inkwell public API launch (routing session, 2026-09-21)\n\nFor the team to pick up next week. One line per decision: **what**, **why**, **status**.\n\n1. **Work is split into 4 routed parts** (rate-limiting design, threat model, launch copy, this log) — see `out/ROUTE.md` for the full routing table (skill/machinery/tier per part).\n   *Why:* the four asks have different risk profiles and need different depth/model tiers; routing them separately avoids over- or under-spending on any one.\n   *Status:* done.\n\n2. **Threat model (sign-up + API-key flow) done first**, ahead of the rate-limiting design, the newsletter copy, or any code.\n   *Why:* nothing is built yet, and the threat model surfaced a **critical** finding — an unverified email can mint a working API key immediately, which lets an attacker bypass the planned per-key rate limits entirely by minting unlimited free-tier keys. That finding changes how part 1 (rate limiting) should be designed, so it had to come first. See `out/THREAT_MODEL.md`.\n   *Status:* done — see findings list for the 1 critical / 2 high / 2 medium items and their fixes.\n\n3. **Rate-limiting design (part 1) is NOT started.**\n   *Why:* not the highest-leverage next step this session (see #2); the concrete limits (60/600/3000 rpm by tier) are already given in `CONTEXT.md`, so this is scoped and ready to pick up.\n   *Status:* open. **Next owner should start from `out/THREAT_MODEL.md`'s \"Cross-cutting dependency\" note** — the limiter must key off verified workspace identity, not raw key existence, or the critical finding above defeats it.\n\n4. **Launch announcement (part 3) is NOT started.**\n   *Why:* launch is a month out (2026-10-15); writing final newsletter copy before the API's security posture and limits are locked risks having to rewrite it. Routed to `fabius-mercatus`, mid model tier — see `out/ROUTE.md`.\n …
```

```
File created successfully at: ./out/DECISIONS.md (file state is current in your context — no need to Read it back)
```

**Bash**

```
{
 "command": "cd ./out && ls -la && echo --- && wc -l ROUTE.md THREAT_MODEL.md DECISIONS.md && echo --- && awk -F'|' '/^\\|/{print NF}' THREAT_MODEL.md | sort | uniq -c"
}
```

```
total 40
drwxr-xr-x@ 5 [owner]  wheel   160 Sep 21 19:38 .
drwxr-xr-x@ 4 [owner]  wheel   128 Sep 21 19:36 ..
-rw-r--r--@ 1 [owner]  wheel  3073 Sep 21 19:38 DECISIONS.md
-rw-r--r--@ 1 [owner]  wheel  3416 Sep 21 19:37 ROUTE.md
-rw-r--r--@ 1 [owner]  wheel  8274 Sep 21 19:38 THREAT_MODEL.md
---
      16 ROUTE.md
      66 THREAT_MODEL.md
      29 DECISIONS.md
     111 total
---
   6 9
```

**Write**

```
{
 "file_path": "./out/SUMMARY.md",
 "content": "# Summary — Inkwell public API launch, routing session\n\n## What I produced\n\n- **`out/ROUTE.md`** — routing table for all 4 asks (rate-limiting design, threat model, launch copy, decisions log): which Fabius skill(s), how much machinery, which model tier, and why, per part.\n- **`out/THREAT_MODEL.md`** — the part I actually executed: a STRIDE threat model of the sign-up → API-key-issuance → API-request flow, across 4 trust boundaries (browser→signup, signup→key issuance, key→API servers, Google OAuth→backend). 5 ranked findings (1 critical, 2 high, 2 medium), each as severity → fix → proof, plus an explicit dependency note for whoever builds the rate limiter.\n- **`out/DECISIONS.md`** — a short, dated decisions log: what was decided this session, why, current status per part, and 3 open questions that need a human call (email verification scope, admin-API plans, who owns abuse-response tooling). This is the \"record so the team can pick this up next week\" deliverable.\n- **`out/SUMMARY.md`** — this file.\n\n## Why the threat model was \"the one part most worth doing now\"\n\nNothing is built yet (`CONTEXT.md`: \"Nothing has been built for the API yet\"), and the threat model surfaced a **critical, load-bearing finding**: the flow as described lets an unverified email mint a working API key immediately, which means an attacker can mint unlimited free-tier keys and bypass the planned per-key rate limits (60/600/3000 rpm) entirely. That finding changes *how* the rate-limiting design (part 1) should be built — it needs to key off verified identity, not raw key existence — so doing the threat model first prevents rework on part 1. It's also the highest-blast-radius, least-reversible of the four asks (a security gap in a paid public API's auth path vs. copy that's easy to edit before send), which matches fabius-praesidium's priority under routing-policy R11 (security c …
```

```
File created successfully at: ./out/SUMMARY.md (file state is current in your context — no need to Read it back)
```

**Fabius:** ## Done

Planned all four parts and routed them in `out/ROUTE.md`, then executed the highest-leverage one: the threat model.

**Routing summary:**
| Part | Skill | Tier | Why |
|---|---|---|---|
| Rate-limiting design | `fabius-disciplina` | Strong | architecture judgment under ambiguity |
| Threat model | `fabius-praesidium` | Strong | security calls, irreversible if wrong |
| Launch copy | `fabius-mercatus` | Mid | bounded artifact, low blast radius, easily revised |
| Decisions log | `fabius-archivum` | Cheap | mechanical transcription of already-made decisions |

**Why the threat model first:** it surfaced a critical finding — unverified email lets a new workspace mint a working API key immediately, so an attacker can mint unlimited free-tier keys and bypass the planned per-key rate limits entirely. That directly changes how the rate-limiting design needs to be built, so doing it first avoids designing part 1 around a flaw the threat model then invalidates. It's also the least-reversible of the four asks (auth-path security on a paid public API vs. easily-edited copy).

Delivered in `./out/`: `ROUTE.md`, `THREAT_MODEL.md` (STRIDE grid across 4 trust boundaries, 5 ranked findings with severity→fix→proof), `DECISIONS.md` (what was decided, status per part, 3 open questions for the team), and `SUMMARY.md`. Rate-limiting design and launch copy were deliberately left un-produced this pass — they're scoped and ready to pick up next week per `DECISIONS.md`.
