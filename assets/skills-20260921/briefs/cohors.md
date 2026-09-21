/fabius:fabius-cohors Design an agent team for our support inbox. The volumes, tools and rules are in INBOX.md. The agents read new tickets, classify them, draft replies for the common cases, and escalate billing disputes and security reports to people. Nothing is ever sent to a customer without a person approving it.

For each agent give a precise description, the minimum tool allowlist, its permissions and an output contract, and decide how many agents this really needs. Express the plan in the format of the scheduler that ships with the fabius-cohors skill (scripts/cohort.mjs, next to its SKILL.md) and validate it with that scheduler's check and plan commands. Deliverables: out/team.json, out/TEAM.md, and the scheduler's output.

---
How to work here:
- Everything you need is in this folder. There is no internet access and nothing may be installed. Use Node.js built-ins (Node 26) and Python 3.9 with its standard library plus numpy and scipy.
- Put every deliverable in ./out/.
- Finish with ./out/SUMMARY.md: what you produced, what you checked and how (paste the real command output), and what you did not do or could not check.
- Aim to finish in about 15 minutes.
