/fabius:fabius-machina Build an n8n workflow, as importable n8n JSON, for this: when our website form posts to a webhook, drop duplicates by email so each lead is processed once, add the lead to a Google Sheet, send a welcome email, and post to Slack. Any failure must alert us, and the welcome email must never go out twice.

There is no n8n instance and no internet here. Design it from the n8n node types you know, and mark exactly what must be checked against a live instance before activation. Write a Node test, out/workflow.test.mjs (node:test), that validates the workflow's structure (every node connected, an error path present, credentials referenced and never embedded) and walks sample payloads through its logic with the external services stubbed: a new lead, a duplicate, and a failing email step. Deliverables: out/workflow.json, out/workflow.test.mjs, out/RUNBOOK.md.

---
How to work here:
- Everything you need is in this folder. There is no internet access and nothing may be installed. Use Node.js built-ins (Node 26) and Python 3.9 with its standard library plus numpy and scipy.
- Put every deliverable in ./out/.
- Finish with ./out/SUMMARY.md: what you produced, what you checked and how (paste the real command output), and what you did not do or could not check.
- Aim to finish in about 15 minutes.
