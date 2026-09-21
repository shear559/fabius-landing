/fabius:fabius-disciplina A customer report is in ISSUE.md and the billing rules are in POLICY.md. Find the root cause, reproduce it with a failing test before you change any code, fix it, and prove the fix. The existing tests pass on the current code, so do not trust them to cover this. Run the tests with `python3 -m unittest`.

Write out/REPORT.md with the root cause, the failing test output before the fix, the passing output after, and anything else the same bug touches.

---
How to work here:
- Everything you need is in this folder. There is no internet access and nothing may be installed. Use Node.js built-ins (Node 26) and Python 3.9 with its standard library plus numpy and scipy.
- Put every deliverable in ./out/.
- Finish with ./out/SUMMARY.md: what you produced, what you checked and how (paste the real command output), and what you did not do or could not check.
- Aim to finish in about 15 minutes.
