# RUNBOOK — Website Lead Intake Workflow

`out/workflow.json` — an importable n8n workflow. Designed offline from n8n node knowledge with **no live instance available to test against**. Read the checklist in section 2 before you flip this to active.

## 1. What it does

```
Webhook (POST) → Normalize → Validate email
                                 │ (missing) → Format Error → Slack #alerts + Respond 400
                                 ▼
                        Google Sheets: search by email
                                 │ (search fails) → Format Error → Slack #alerts + Respond 500
                                 ▼
                          Is a row found?
                     ┌── yes (duplicate) ──────────────► Respond 200 "duplicate, skipped"
                     └── no (new lead)
                             ▼
                    Google Sheets: append row (welcomeEmailSent=false)
                             │ (fails) → Format Error → Slack #alerts + Respond 500
                             ▼
                    Send welcome email
                             │ (fails) → Format Error → Slack #alerts + Respond 500
                             ▼
                    Google Sheets: mark row welcomeEmailSent=true
                             │ (fails) → Format Error → Slack #alerts + Respond 500
                             ▼
                    Slack: notify #sales-leads
                             │ (fails) → Format Error → Slack #alerts + Respond 500
                             ▼
                    Respond 200 "created"
```

Every external-service node (Google Sheets ×3, Send Welcome Email, Slack Notify) is set to `onError: continueErrorOutput`, so a failure routes to its second output instead of silently aborting the run. All error branches converge on **Format Error → Slack #alerts + Respond to Webhook**, which fire in parallel (not chained), so a Slack outage doesn't prevent the caller from getting an error response.

## 2. Idempotency design — why the welcome email can't double-send

- **Dedupe key is email**, checked by a Google Sheets search *before* anything else happens. If a row for that email already exists, the run stops at "duplicate" — no re-append, no re-send, no re-post to Slack.
- The lead row is **appended before** the welcome email is sent, with `welcomeEmailSent=false`, and only flipped to `true` after the send succeeds. This means:
  - If the email send fails, the row still exists (unsent). A retried/resubmitted request for that email will now hit the duplicate check and be skipped — **the email will never be sent twice**, but it also won't auto-retry. The failure alert is the signal for a human to fix the underlying issue (bad SMTP creds, etc.) and manually resend or re-trigger for that one row. This is a deliberate trade-off: we chose "never twice" over "always eventually sent," per the stated requirement.
- **Known gap — concurrent duplicate race:** Google Sheets has no atomic check-and-insert. Two webhook calls for the same email arriving close together could both pass the "search by email" step before either has appended a row, producing two rows and two emails. This is a real limitation of using a spreadsheet as the dedupe store under concurrency. If your traffic can plausibly deliver bursts of duplicate submissions within seconds, mitigate by:
  - Running n8n in queue mode with a concurrency limit / mutex keyed on email, or
  - Replacing the dedupe store with something that has a real unique constraint (Postgres `INSERT ... ON CONFLICT DO NOTHING`, Redis `SETNX`), then writing to the Sheet as a secondary/reporting step.
  - This was not testable here since there is no live instance or database available in this environment.

## 3. What must be checked against a live n8n instance before activation

This was built from node-type knowledge, not a live schema fetch (no instance or internet was available). Specifically verify:

1. **Google Sheets node (`n8n-nodes-base.googleSheets`, `typeVersion: 4.6`)** — confirm the exact `operation` values used here (`search`, `append`, `update`) and their parameter shapes (`filtersUI.values[].lookupColumn/lookupValue`, `columns.matchingColumns`, `columns.value`) against whatever version is installed. This node's schema has changed across n8n releases; get it from the live node UI or an MCP `get_node_info`/`search_nodes` call, not from memory.
2. **`n8n-nodes-base.emailSend` (SMTP)** — confirm this is the right node for your mail provider. If sending via Gmail/Outlook OAuth2 instead of raw SMTP, swap to `n8n-nodes-base.gmail` and its own parameter/credential shape.
3. **`n8n-nodes-base.slack`, `typeVersion: 2.3`** — confirm `resource`/`operation`/`select` values and whether your Slack app uses `slackApi` (bot token) or `slackOAuth2Api` credentials.
4. **Credentials** — every `REPLACE_WITH_CREDENTIAL_ID` / `REPLACE_WITH_SPREADSHEET_ID` / `REPLACE_WITH_CHANNEL_ID` / `REPLACE_WITH_ALERTS_CHANNEL_ID` placeholder must be replaced with real credential/resource IDs created in the target instance. No secret is embedded in this file by design (see test suite) — credentials are referenced by `{id, name}` only.
5. **Sheet schema** — the target "Leads" sheet must have header columns `email, firstName, lastName, company, submittedAt, welcomeEmailSent` (or update the node's column mapping to match your actual headers).
6. **Webhook path** — `website-lead-form` is a placeholder; confirm it doesn't collide with an existing webhook, and update the website form's POST URL to match the instance's real webhook URL (test vs. production).
7. **Respond to Webhook dynamic status code** (`Respond - Error` node uses `={{ $json.statusCode }}`) — confirm the installed `respondToWebhook` typeVersion (1.4 here) supports an expression for `options.responseCode`; some earlier versions require a static number.
8. **`active: false`** — the workflow ships inactive intentionally. Activate only after the above are confirmed and you've run at least one real end-to-end test (new lead, duplicate, and a forced failure) against a test Sheet/Slack channel.

## 4. Manual remediation for a failed welcome email

When the `Slack - Alert Failure` message names `Send Welcome Email` as the failed node:

1. Open the Leads sheet, find the row for that email with `welcomeEmailSent=false`.
2. Fix the underlying cause (SMTP credential, quota, etc.).
3. Either re-run the workflow manually for that one lead (paste the original payload into a manual execution) or send the welcome email by hand and flip `welcomeEmailSent` to `true` yourself so the row stops looking unsent.
