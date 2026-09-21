/fabius:fabius-decor Design and build the pricing section for Tidepool, a tide and swell forecast app for surfers and small-boat sailors. The facts and prices are in FACTS.md; use only those. Brand direction: deep-sea navy, one accent colour of your choice, calm and precise, never cute.

Capture the visual system first, in out/visual-system.md. Then build out/index.html: one self-contained file (inline CSS and JS, system fonts, no external requests, no images from the web) with the free tier and Tidepool Plus, a monthly / yearly switch, what each plan includes, and a short FAQ. It must work at 360 px and 1440 px wide, be fully usable with a keyboard, meet WCAG 2.2 AA contrast, and respect reduced motion. Check it in a real browser if you can; if you cannot, say so.

---
How to work here:
- Everything you need is in this folder. There is no internet access and nothing may be installed. Use Node.js built-ins (Node 26) and Python 3.9 with its standard library plus numpy and scipy.
- Put every deliverable in ./out/.
- Finish with ./out/SUMMARY.md: what you produced, what you checked and how (paste the real command output), and what you did not do or could not check.
- Aim to finish in about 15 minutes.
