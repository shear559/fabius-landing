# Summary

## What I produced

A 2-agent support-inbox team, expressed in the `fabius-cohort/v1` schema that ships with the
`fabius-cohors` skill's scheduler (`scripts/cohort.mjs`):

- **`out/team.json`** — the plan: 2 agent definitions (`triage`, `drafter`) with description,
  instructions, tool allowlist, permissions and a strict output schema each, plus 13 sample
  tasks (8 `triage` + 5 `drafter`) covering one ticket per category in `INBOX.md`'s mix
  (how-to, bug, billing question, billing dispute, account access, feature request, security
  report, legal).
- **`out/TEAM.md`** — the design writeup: why 2 agents (not 1, not 3+), each agent's precise
  description/tools/permissions/output contract, and the orchestration diagram.
- **`out/demo.mjs`** + **`out/demo-output.json`** — a deterministic worked run through
  `executePlan` (canned outputs, no model/network/shell calls) proving the plan actually
  executes end to end under the scheduler's caller-owned authorize/runner seam.

Design, in one line: `triage` classifies + tags + routes every ticket (read-only ticket/account
access, no drafting tool at all); `drafter` only drafts for the five safe categories and never
gets a tag/assign/send tool. Neither agent has any tool that sends to a customer — that
permission is intentionally absent from both allowlists, and the plan's dependency graph never
creates a `drafter` task for `billing_dispute`, `security_report` or `legal` tickets. Full
rationale (including the M1 "name the error a second agent prevents" test used to reject both a
1-agent and a 3-agent design) is in `TEAM.md`.

## What I checked, and how

1. **Scheduler's own `check` command** — validates schema, agent/task shape, tool-name and
   permission-value legality, output-schema legality:

   ```
   $ node .../fabius-cohors/scripts/cohort.mjs check out/team.json
   {
     "ok": true,
     "tasks": 13,
     "agents": 2
   }
   ```

2. **Scheduler's own `plan` command** — validates the dependency graph (no cycles, no unknown
   deps) and returns deterministic execution order/levels, written to `out/plan-output.json`:

   ```
   agents: ['triage', 'drafter']
   order: ['t_howto', 't_bug', 't_billing_question', 't_billing_dispute', 't_account_access',
           't_feature_request', 't_security_report', 't_legal', 'd_howto', 'd_bug',
           'd_billing_question', 'd_account_access', 'd_feature_request']
   levels: [
     ['t_howto', 't_bug', 't_billing_question', 't_billing_dispute', 't_account_access',
      't_feature_request', 't_security_report', 't_legal'],
     ['d_howto', 'd_bug', 'd_billing_question', 'd_account_access', 'd_feature_request']
   ]
   ```

   Level 1 is all 8 `triage` tasks running in parallel (none depend on each other); level 2 is
   only the 5 `drafter` tasks for the draftable categories — confirming, structurally, that
   `t_billing_dispute`, `t_security_report` and `t_legal` have no downstream drafting task.

3. **End-to-end execution** (`out/demo.mjs`, deterministic canned outputs, no model/network/
   shell/file writes beyond `out/demo-output.json`) — ran the full plan through
   `executePlan()` with an `authorize` function that additionally asserts, at runtime, that
   `triage` never carries `create_draft_reply`, `drafter` never carries `add_tag`/
   `assign_queue`, and no agent carries any tool containing "send":

   ```
   $ node out/demo.mjs
   { "status": "succeeded", "tasks": { ... 13 entries, all "succeeded" ... } }
   ```

   Then verified programmatically that none of the three escalation-only tickets
   (`t_billing_dispute`, `t_security_report`, `t_legal`) has a matching `drafter` output:

   ```
   status: succeeded
   escalation-only tickets have no matching drafter task (by design):
     t_billing_dispute -> drafted: False
     t_security_report -> drafted: False
     t_legal -> drafted: False
   ```

   Every task output was also schema-checked by `cohort.mjs` itself during `executePlan`
   (`outputCheck` runs on every task's return value before it's accepted) — the run succeeding
   means all 13 outputs matched their agent's declared contract.

## What I did not do / could not check

- **No live helpdesk integration.** `authorize`/`runner` in the demo are hand-written stand-ins
  with canned per-ticket outputs, not a real model call or a real helpdesk API — the scheduler
  is explicitly caller-owned execution (no bundled tools/models), and this sandbox has no
  network access to wire up either. The demo shows the plan and contracts are mechanically
  sound, not that a live model classifies/drafts correctly.
  - Did not benchmark classification accuracy, draft quality, or Portuguese-language output
  quality against real tickets — there is no ground-truth ticket set here to score against
  (that would be `fabius-doctrina`/`fabius-disciplina` territory with real data).
- **No enforcement test of the "sending is a separate permission" rule beyond absence of a
  send tool.** I confirmed neither agent's allowlist contains a send-capable tool and that the
  plan never wires a send action; I did not (and could not, in this sandbox) verify how the
  real helpdesk enforces that separate permission on its side.
- **The scheduler itself has no conditional/runtime branching** — `plan.tasks` is a fixed graph
  checked once, so the 13 tasks are a representative *sample* (one ticket per category) rather
  than a live dispatcher that decides, for each of the ~220 real tickets/day, whether to also
  spawn a `drafter` task from `triage`'s actual output. In production that routing decision
  (spawn `drafter` only when `triage.category` is one of the five safe values) is the caller's
  job, external to this scheduler — I noted this explicitly in `TEAM.md` rather than papering
  over it.
- Did not run the skill's own test suite (`scripts/cohort.test.mjs`, `catalogue.test.mjs`) —
  out of scope for validating this specific plan, and not requested.
