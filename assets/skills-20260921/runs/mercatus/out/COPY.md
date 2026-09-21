# Tidepool — launch copy

All facts below are sourced from FACTS.md. No accuracy claims, competitor comparisons, or
"best/number one" claims are used, per the fact sheet's constraints.

## Positioning statement

For surfers and small-boat sailors who need to know if conditions are worth the trip, Tidepool
is the tide and swell forecast app — covering 312 surf spots and 41 marinas in Portugal and
Morocco — that turns your own saved limits into a go/wait call for each spot. Unlike reading raw
tide, swell, and wind numbers yourself, Tidepool makes the call for you — a 7-day forecast,
refreshed every 30 minutes, that works offline for the last forecast you opened.

## Landing page headline — three options

**1.**
Headline: Know if it's a go before you check the swell charts.
Subhead: 312 spots and 41 marinas across Portugal and Morocco, with a go/wait call built from
your own limits.

**2.**
Headline: Your limits. Your call. Every spot, every 30 minutes.
Subhead: Tidepool turns tide, swell, and wind into one go/wait answer — for 312 surf spots and
41 marinas in Portugal and Morocco.

**3.**
Headline: 180 surfers and sailors tested it for 10 weeks. Now it launches.
Subhead: Tide, swell, and wind for 312 spots and 41 marinas in Portugal and Morocco — with a
go/wait call built from your own limits.

### Which one ships: Option 1

A landing page visitor arriving from a launch push is problem-aware, not yet product-aware —
they know the "should I go?" problem, not the app. Option 1's headline names that exact moment
(checking swell charts to decide) and promises the path past it, before it ever mentions the
product. Option 2 leads with the mechanism, which is the right *second* beat, not the hook — it
does the heavy lifting in the subhead instead. Option 3 leads with a beta-testing stat that
doesn't tell the reader what those 180 testers found, so it reads as filler credibility rather
than a claim that carries weight. Option 1's subhead then supplies the concrete numbers (312 /
41 / Portugal and Morocco) that Option 1's headline leaves out, so the pair covers both the hook
and the proof.

## Launch post — surf-community newsletter

### Draft

Tidepool launches October 1.

It's a tide and swell forecast app for surfers and small-boat sailors, covering 312 spots and 41
marinas across Portugal and Morocco. Enter your own limits for tide height, swell period and
direction, and wind, and Tidepool gives you a straight go or wait call for each spot — no more
squinting at raw charts to decide if it's worth the drive.

Forecasts run 7 days out and refresh every 30 minutes. Out of signal at the coast? Tidepool
still works offline for the last forecast you opened.

We spent 10 weeks testing this with 180 surfers and sailors before opening it up. We're a team
of four, based in Ericeira.

Tidepool is free for 3 spots. Tidepool Plus is $4 a month or $36 a year — try it free for 14
days. It's on iPhone and Apple Watch; Android isn't ready yet.

Get it October 1.

*(152 words, counted with `python3 -c "print(len(open('draft.txt').read().split()))"`)*

### Prose tell lint — findings

Core point of the draft: Tidepool launches Oct 1 and turns raw tide/swell/wind data into a
personal go-or-wait call, at a stated coverage, price, and platform.

| # | Shape | Evidence | Fix |
|---|---|---|---|
| 1 | Evasive wording — an aside steering what the reader should feel | "— no more squinting at raw charts to decide if it's worth the drive" | Cut it: the sentence already states the point ("gives you a straight go or wait call for each spot"); the aside adds a feeling, not a fact. |
| 2 | False contrast and staging — a question staged to answer itself | "Out of signal at the coast? Tidepool still works offline for the last forecast you opened." | State the answer directly, no staged question. |

Nothing else in the draft was touched: the short opening line is a deliberate newsletter hook
(not a stacked-fragment pattern — the rest of the piece varies sentence length normally), the
numbers are all sourced from FACTS.md, and the post already ends on the CTA rather than a recap
or a closing maxim.

### Repaired — shipped version

Tidepool launches October 1.

It's a tide and swell forecast app for surfers and small-boat sailors, covering 312 spots and 41
marinas across Portugal and Morocco. Enter your own limits for tide height, swell period and
direction, and wind, and Tidepool gives you a straight go or wait call for each spot.

Forecasts run 7 days out and refresh every 30 minutes. Tidepool still works offline for the last
forecast you opened, so it's there even out of signal at the coast.

We spent 10 weeks testing this with 180 surfers and sailors before opening it up. We're a team
of four, based in Ericeira.

Tidepool is free for 3 spots. Tidepool Plus is $4 a month or $36 a year — try it free for 14
days. It's on iPhone and Apple Watch; Android isn't ready yet.

Get it October 1.

*(142 words)*
