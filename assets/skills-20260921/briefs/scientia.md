/fabius:fabius-scientia We ran an RNA-seq experiment: 3 control and 3 treated samples. counts.csv holds raw read counts per gene; metadata.csv describes the samples. Which genes respond to the treatment?

Start from competing hypotheses, analyse the data in Python (numpy and scipy only), control the false discovery rate, and report what these data can and cannot support. Deliverables: out/analysis.py (reruns end to end), out/results.csv (gene, mean expression, log2 fold change, p value, adjusted p value, called), out/volcano.svg, and out/REPORT.md.

---
How to work here:
- Everything you need is in this folder. There is no internet access and nothing may be installed. Use Node.js built-ins (Node 26) and Python 3.9 with its standard library plus numpy and scipy.
- Put every deliverable in ./out/.
- Finish with ./out/SUMMARY.md: what you produced, what you checked and how (paste the real command output), and what you did not do or could not check.
- Aim to finish in about 15 minutes.
