/fabius:fabius-fortuna A forum post (TIP.md) claims that a 50/200-day moving-average crossover on this index (prices.csv, daily closes) returns 30% a year. Test the claim honestly: trading costs, an out-of-sample period you do not touch until the end, drawdowns, and how much of any result could be luck given how many variants you try. Use Python with numpy only.

Deliverables: out/backtest.py (reruns end to end), out/results.json (daily equity for the strategy and for buy-and-hold, drawdowns, and metrics per period), and out/REPORT.md. This is analysis, not investment advice.

---
How to work here:
- Everything you need is in this folder. There is no internet access and nothing may be installed. Use Node.js built-ins (Node 26) and Python 3.9 with its standard library plus numpy and scipy.
- Put every deliverable in ./out/.
- Finish with ./out/SUMMARY.md: what you produced, what you checked and how (paste the real command output), and what you did not do or could not check.
- Aim to finish in about 15 minutes.
