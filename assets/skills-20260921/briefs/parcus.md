/fabius:fabius-parcus This repository has one open pull request on the branch feature/keep-case (see PR.md). The request behind it, issue #209, is small: let callers keep uppercase letters in slugs, with the default behaviour unchanged. The pull request is far bigger than that.

Strip it back to the smallest change that does the job. The existing tests and the pull request's new keepCase test must pass. Commit the result on the branch, write the final diff against main to out/final.diff, and write a short, kind review note for the contributor to out/REVIEW.md.

---
How to work here:
- Everything you need is in this folder. There is no internet access and nothing may be installed. Use Node.js built-ins (Node 26) and Python 3.9 with its standard library plus numpy and scipy.
- Put every deliverable in ./out/.
- Finish with ./out/SUMMARY.md: what you produced, what you checked and how (paste the real command output), and what you did not do or could not check.
- Aim to finish in about 15 minutes.
