# Summary

## What I produced

`out/COPY.md`, containing:

1. **Positioning statement** — filled the "for / who / is the / that / unlike / it" template
   using only FACTS.md.
2. **Three landing-page headline options**, each with a one-line subhead, plus which one ships
   and why (Option 1 — leads with the problem-aware moment, defers the coverage numbers to the
   subhead).
3. **Launch post for a surf-community newsletter** (draft, 152 words), followed by a **prose
   tell lint pass** against `references/prose-tell-lint.md`'s shape → repair table, and the
   **repaired, shipped version** (142 words).

## What I checked, and how

- **Fact-sheet-only constraint.** Extracted every number in `out/COPY.md` and every number in
  `FACTS.md` and diffed them by eye:
  ```
  COPY.md numbers: 1 2 3 4 7 10 14 30 36 41 142 152 180 312
  FACTS.md numbers: 01 2026 3 4 7 10 14 30 36 41 180 312
  ```
  The only COPY.md numbers not in FACTS.md are `1`/`2` (from "October 1" and list/footnote
  markers) and `142`/`152` (the word counts I computed for the two post versions, not marketing
  claims). Every marketing figure used (312 spots, 41 marinas, 7-day forecast, 30-minute
  refresh, 180 testers, 10 weeks, team of four, free-for-3-spots, $4/mo, $36/yr, 14-day trial,
  iPhone + Apple Watch, no Android, Oct 1 2026) traces to a line in FACTS.md.
- **Forbidden-claims constraint** (no accuracy %, no competitor comparison, no "best/#1"):
  ```
  $ grep -niE "accuracy|best|number one|#1|most accurate|better than|beats|outperform" out/COPY.md
  3:All facts below are sourced from FACTS.md. No accuracy claims, competitor comparisons, or
  4:"best/number one" claims are used, per the fact sheet's constraints.
  ```
  The only hits are my own disclaimer sentence — no such claim appears in the actual copy.
- **Word count on the launch post**, computed programmatically rather than eyeballed:
  ```
  $ python3 -c "..."
  draft words: 152
  repaired words: 142
  ```
  Both are under the 250-word cap.
- **Prose tell lint**, run by hand against `references/prose-tell-lint.md`'s shape table (read
  the draft whole first, noted its core point, then checked each sentence against the table).
  Found two tells, listed with quoted evidence in `out/COPY.md`:
  1. An aside steering reader feeling ("no more squinting at raw charts... worth the drive")
     that restates a point already made — cut per the table's repair.
  2. A question staged to answer itself ("Out of signal at the coast? Tidepool still works
     offline...") — folded into a direct statement.
  Repaired version ships in `out/COPY.md`; nothing else was touched (capped to one audit, one
  repair pass, per router rule M11).

## What I did not do / could not check

- No A/B data, no real audience, no ability to render or preview the landing page — this is
  copy only, not a built page (visual execution is out of scope per the routing boundary with
  `fabius-decor`).
- I did not run the lint against the positioning statement or the headline options, only the
  launch post, as the task specified.
- No internet access, so I could not check the post against any live newsletter template or
  word-count/rendering quirks of a specific ESP (Mailchimp, Substack, etc.) — word count was
  verified by direct token count only.
