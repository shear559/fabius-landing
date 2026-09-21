/fabius:fabius-praesidium server.js ships to production on Friday (see README.md). Do a security review before it does: threat-model it per trust boundary, find what an attacker would actually exploit, and for each finding give the severity, the fix, and a regression test that fails before the fix and passes after.

Apply the fixes to server.js and add the tests under test/. Show the regression tests failing on the original code and passing on the fixed code. Write out/SECURITY-REVIEW.md.

---
How to work here:
- Everything you need is in this folder. There is no internet access and nothing may be installed. Use Node.js built-ins (Node 26) and Python 3.9 with its standard library plus numpy and scipy.
- Put every deliverable in ./out/.
- Finish with ./out/SUMMARY.md: what you produced, what you checked and how (paste the real command output), and what you did not do or could not check.
- Aim to finish in about 15 minutes.
