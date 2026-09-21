# Decisions log — Inkwell public API launch (routing session, 2026-09-21)

For the team to pick up next week. One line per decision: **what**, **why**, **status**.

1. **Work is split into 4 routed parts** (rate-limiting design, threat model, launch copy, this log) — see `out/ROUTE.md` for the full routing table (skill/machinery/tier per part).
   *Why:* the four asks have different risk profiles and need different depth/model tiers; routing them separately avoids over- or under-spending on any one.
   *Status:* done.

2. **Threat model (sign-up + API-key flow) done first**, ahead of the rate-limiting design, the newsletter copy, or any code.
   *Why:* nothing is built yet, and the threat model surfaced a **critical** finding — an unverified email can mint a working API key immediately, which lets an attacker bypass the planned per-key rate limits entirely by minting unlimited free-tier keys. That finding changes how part 1 (rate limiting) should be designed, so it had to come first. See `out/THREAT_MODEL.md`.
   *Status:* done — see findings list for the 1 critical / 2 high / 2 medium items and their fixes.

3. **Rate-limiting design (part 1) is NOT started.**
   *Why:* not the highest-leverage next step this session (see #2); the concrete limits (60/600/3000 rpm by tier) are already given in `CONTEXT.md`, so this is scoped and ready to pick up.
   *Status:* open. **Next owner should start from `out/THREAT_MODEL.md`'s "Cross-cutting dependency" note** — the limiter must key off verified workspace identity, not raw key existence, or the critical finding above defeats it.

4. **Launch announcement (part 3) is NOT started.**
   *Why:* launch is a month out (2026-10-15); writing final newsletter copy before the API's security posture and limits are locked risks having to rewrite it. Routed to `fabius-mercatus`, mid model tier — see `out/ROUTE.md`.
   *Status:* open, low urgency — revisit once parts 1–2's decisions are locked (the copy will want to reference the real limits and any auth requirements, e.g. "verify your email to get your key").

5. **This decisions log (part 4) is intentionally thin.**
   *Why:* per the routing plan it's a cheap-tier, mechanical transcription task — it records what was decided, not new analysis. It should be updated (not regenerated) as parts 1 and 3 land.
   *Status:* done for this session; needs one more pass after part 1 and part 3 are produced.

## Open questions for the team (not answered in this session — need a human call)

- Is email verification already planned anywhere in the signup flow, or does it need to be added as new scope before 2026-10-15? (This session assumed "no" based on `CONTEXT.md` silence — confirm.)
- Will there ever be an admin/internal API alongside the customer-facing one? (Affects whether workspace-scoped keys need a separate credential type — see threat model, low-urgency elevation finding.)
- Who owns signup-abuse response (CAPTCHA vendor choice, velocity-limit thresholds) — backend engineers or is this expected from existing infra?
