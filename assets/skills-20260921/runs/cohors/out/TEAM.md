# Support inbox agent team

Source facts: `INBOX.md` (~220 tickets/day, en/pt; mix 38% how-to, 22% bug, 17% billing,
12% account access, 7% feature request, 3% security, 1% legal; helpdesk tools: read ticket,
read plan/invoices [read-only], add tag, assign queue, create draft reply, add internal note;
sending is a *separate* permission; billing disputes → billing queue; security reports →
security@, never answered by a bot; legal → legal queue, untouched).

## How many agents this needs: 2

Not 1, not 3+.

- **Not 1.** A single agent that both classifies *and* drafts would need the draft tool in its
  own allowlist for every ticket, including billing disputes, security reports and legal
  requests. "Security reports are never answered by a bot" would then rest entirely on the
  model following an instruction correctly on every one of ~7/day security tickets, forever.
  Splitting classification from drafting into two agents turns that into a **structural**
  guarantee: the `triage` agent's tool allowlist has no `create_draft_reply` entry, so it is
  mechanically incapable of producing customer-facing text, whatever it decides to classify.
  The error this second agent prevents is nameable: *a misclassified or borderline
  billing/security/legal ticket gets an automated draft reply.*
- **Not 3+.** The other candidate split was a third "escalator" agent for billing disputes,
  security reports and legal. It was dropped: escalation here is nothing more than the routing
  action (tag + assign_queue + internal note) that `triage` already performs as part of
  classifying every ticket — there's no extra capability, judgment, or tool it would need that
  `triage` doesn't already have. A separate agent would duplicate `triage`'s tools for no new
  privilege boundary, which is exactly the kind of agent `fabius-cohors` says not to spawn (no
  independent piece of work, no independent review, nothing that doesn't fit one window).
- The two agents are also genuinely **independent enough to fan out**: `triage` runs on every
  incoming ticket in parallel (no ticket's classification depends on another's), and `drafter`
  only ever starts after its own ticket's `triage` task has succeeded — a plain two-level
  sequential-then-parallel pipeline, not a swarm.

No agent in this plan has a "send" tool. Sending a reply is a separate helpdesk permission per
`INBOX.md`, and it is not in either agent's allowlist — "nothing is sent to a customer without a
person approving it" is enforced by the tools that simply don't exist for either agent, not by an
instruction either agent could ignore. The plan's own dependency graph enforces the second hard
rule the same way: `billing_dispute`, `security_report` and `legal` tickets have **no** `drafter`
task at all (see `plan-output.json`), so no draft is ever generated for them — not "the drafter
was told not to," but "the drafter was never invoked."

## Agent 1 — `triage`

| | |
|---|---|
| **Description** | Classify one new support ticket (English or Portuguese) into exactly one category, tag it, and assign it to the matching helpdesk queue. Dispatch first, on every new ticket, before any drafting happens. |
| **Tools (5)** | `read_ticket`, `read_customer_account` (plan + invoices, read-only), `add_tag`, `assign_queue`, `add_internal_note` |
| **Permissions** | `read: allow` (needs the ticket and, sometimes, account context) · `write: allow` (tag/assign/note are internal helpdesk state, never customer-facing, so per-item human approval would just add ~220 no-op approvals/day against the 4-hour first-response target) · `execute: deny` · `network: deny` (no tool here reaches outside the helpdesk) |
| **Output contract** | `{ ticketId, category ∈ {how_to, bug, billing_question, billing_dispute, account_access, feature_request, security_report, legal, other}, language ∈ {en, pt}, queue ∈ {self_serve, engineering, product, billing, account_security, security, legal, general}, tags[], needsHumanEscalation: boolean, note (≤500 chars, empty for security_report/legal by rule) }` |
| **Escalation behavior** | `billing_dispute`→`billing` queue, `security_report`→`security` queue (reaches security@, never a bot reply), `legal`→`legal` queue untouched (note stays empty — no interpretation of the request), all three with `needsHumanEscalation: true`. |

## Agent 2 — `drafter`

| | |
|---|---|
| **Description** | Draft a candidate reply for a ticket `triage` already classified as `how_to`, `bug`, `account_access`, `feature_request` or `billing_question` — never `billing_dispute`, `security_report` or `legal`. Dispatch only after a successful `triage` task on one of those five categories. |
| **Tools (5)** | `read_ticket`, `read_customer_account` (read-only), `search_help_centre` (140 articles), `create_draft_reply`, `add_internal_note` — deliberately **no** `add_tag`/`assign_queue` (routing is `triage`'s job, not this agent's) and **no send tool of any kind** |
| **Permissions** | `read: allow` · `write: allow` (drafting is pre-approval by construction — nothing this agent writes reaches a customer until a person sends it) · `execute: deny` · `network: deny` |
| **Output contract** | `{ ticketId, category ∈ {how_to, bug, account_access, feature_request, billing_question}, draftText (≤4000 chars, in the ticket's language), sourcesUsed[] (help-centre article ids actually cited, ≤5), confidence ∈ {high, medium, low}, readyForReview: true }` |
| **Escalation behavior** | None — this agent is never dispatched for the three escalation categories in the first place. |

## Orchestration pattern

Sequential-then-parallel, two levels (confirmed by `scripts/cohort.mjs plan`):

```
Level 1 (parallel, 8 tickets)         Level 2 (parallel, 5 tickets — 3 have none)
─────────────────────────────         ──────────────────────────────────────────
t_howto            ──triage──┐   ┌──▶ d_howto            (drafter)
t_bug               ─────────┤   ├──▶ d_bug               (drafter)
t_billing_question  ─────────┤   ├──▶ d_billing_question  (drafter)
t_billing_dispute   ─────────┤   │    (no drafter task — billing queue, human-only)
t_account_access    ─────────┤   ├──▶ d_account_access    (drafter)
t_feature_request   ─────────┤   ├──▶ d_feature_request   (drafter)
t_security_report   ─────────┤   │    (no drafter task — security@, never a bot reply)
t_legal             ─────────┘   │    (no drafter task — legal queue, untouched)
```

Every `drafter` task's output still stops at a draft; a person approves and sends from the
helpdesk UI using the separate send permission neither agent holds. That human approval gate is
the human-in-the-loop step from `fabius-cohors`'s five patterns — it lives outside this plan
because it is a person acting in the helpdesk, not a task this scheduler runs.

## Plan file

`out/team.json` — schema `fabius-cohort/v1`, 2 agents, 13 tasks (8 `triage` + 5 `drafter`,
one sample ticket per category from `INBOX.md`'s mix). Validated with the scheduler's own
`check` and `plan` commands; see `out/SUMMARY.md` for the pasted output.
