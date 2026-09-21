# SUMMARY — Website Lead Intake n8n Workflow

## What I produced

- **`out/workflow.json`** — importable n8n workflow (`active: false`). Webhook → normalize → validate → Google Sheets dedupe-by-email search → branch (duplicate: respond and stop; new: append row with `welcomeEmailSent=false` → send welcome email → mark row sent → Slack notify → respond). Every external-service node (`googleSheets` ×3, `emailSend`, `slack`) uses `onError: continueErrorOutput`; every error output converges on a shared `Format Error` node that fans out in parallel to a Slack `#alerts` post and an error HTTP response, plus a Sticky Note on the canvas itself listing everything that needs live verification.
- **`out/workflow.test.mjs`** — `node:test` suite, two parts:
  1. Structural checks read `workflow.json` directly: every node has a unique id/name, every connection points at a real node, every non-trigger node is reachable from the webhook trigger and has an incoming connection, every service node opts into an error output that traces forward to the Slack alert node, and every node with `credentials` references them as `{id, name}` only (plus a scan of `parameters` for any literal-looking secret under a key like `key/token/secret/password`).
  2. Logic checks re-implement the documented control flow as a small pure function (`processLead`) driven by stub services (in-memory sheet, fake email/Slack/alert senders — no real n8n execution, since none is available here) and walk three required scenarios plus a fourth I added for the validation branch: new lead, duplicate, failing email step, and missing email.
- **`out/RUNBOOK.md`** — flow diagram, the idempotency design rationale (append-before-send, mark-sent-after-send, why a failed send is never auto-retried), a documented concurrency gap in using Google Sheets as a dedupe store, the numbered live-instance verification checklist, and manual remediation steps for a failed welcome-email alert.

## What I checked, and how

Parsed and structurally sanity-checked the JSON:
```
$ node -e "const w=require('./out/workflow.json'); console.log('nodes:', w.nodes.length, 'connections keys:', Object.keys(w.connections).length);"
nodes: 16 connections keys: 11
```

Ran the full test suite:
```
$ node --test out/workflow.test.mjs
▶ workflow.json structure
  ✔ every node has a unique id and name (1.518407ms)
  ✔ every connection references nodes that exist (0.340335ms)
  ✔ every non-trigger, non-sticky node is connected (reachable from the trigger, or is an intentional sink) (1.190756ms)
  ✔ an error path exists: service-calling nodes opt into continueErrorOutput and their error output reaches an alert node (0.512152ms)
  ✔ credential-bearing nodes reference credentials by {id, name} and never embed a secret value (0.523046ms)
  ✔ workflow is not active (must be reviewed on a live instance before activation) (0.134062ms)
✔ workflow.json structure (6.107788ms)
▶ workflow logic (stubbed services)
  ✔ new lead: added to the sheet, welcome email sent once, posted to Slack, no alert (3.164437ms)
  ✔ duplicate lead: second submission with the same email is skipped, no second email, no second Slack post, no alert (0.343454ms)
  ✔ failing email step: lead is recorded, alert fires, email is not marked sent, and a retried submission is treated as a duplicate (never double-sent) (0.604536ms)
  ✔ missing email: rejected with 400 and an alert, before any service is called (0.254557ms)
✔ workflow logic (stubbed services) (4.702082ms)
ℹ tests 10
ℹ suites 2
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```
All 10 pass, 0 failures.

(One iteration along the way: my first cut of the error-path test required *every* Slack/Sheets/email node — including the alert node itself — to have its own further error branch, which doesn't make sense for the terminal alert node. Fixed by exempting the alert node explicitly, since it and the error-response node run in parallel off `Format Error` rather than chained, so a Slack outage during alerting still lets the caller get an error response.)

## What I did not do / could not check

- **No live n8n instance and no internet were available** in this environment, so nothing here was validated against n8n's actual node schemas, imported into a real n8n UI, or executed for real. This is a from-memory design, not a live-verified one.
- I could not confirm the exact `operation` enum values and parameter key names for the Google Sheets node (`search`/`append`/`update`, `filtersUI`, `columns.matchingColumns`) against a specific installed n8n version — these have changed across releases. Flagged explicitly in `RUNBOOK.md` §3 and in the in-canvas Sticky Note as the top item to verify before activation.
- I could not test the SMTP/Gmail node choice, Slack credential type (`slackApi` vs `slackOAuth2Api`), or whether the installed `respondToWebhook` version accepts an expression for `options.responseCode` — all flagged as live-instance checks.
- The dedupe mechanism (Google Sheets search-then-append) has a known, documented race: two near-simultaneous submissions for the same email could both pass the duplicate check before either row is appended, producing two welcome emails. I could not test this concurrency scenario here (no live Sheets API, no queue-mode n8n instance) — it's called out in `RUNBOOK.md` §2 with mitigation options (queue-mode concurrency lock, or a store with a real unique constraint) rather than silently assumed away.
- All credential IDs, spreadsheet ID, and Slack channel IDs in `workflow.json` are `REPLACE_WITH_*` placeholders — they must be created and substituted in the target n8n instance; this was not something I could set up without one.
