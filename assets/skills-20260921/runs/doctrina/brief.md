/fabius:fabius-doctrina We want to route incoming support messages to the right queue automatically. messages.csv holds 720 labelled messages with 4 labels. Decide the smallest approach that could hold, build it in Python (numpy and scipy only, no model APIs), and evaluate it properly: against a simple control, on data it never saw during development, with uncertainty on the numbers. Then say whether it is good enough to ship behind a human fallback, and where it fails.

Deliverables: out/train.py (reruns end to end), out/metrics.json, and out/REPORT.md.

---
How to work here:
- Everything you need is in this folder. There is no internet access and nothing may be installed. Use Node.js built-ins (Node 26) and Python 3.9 with its standard library plus numpy and scipy.
- Put every deliverable in ./out/.
- Finish with ./out/SUMMARY.md: what you produced, what you checked and how (paste the real command output), and what you did not do or could not check.
- Aim to finish in about 15 minutes.
