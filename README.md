# fabius — landing page

The public site for **fabius — one set of rules above every model**.

[Website](https://fabius-landing.vercel.app) · [Fabius repository](https://github.com/shear559/fabius) · [Quickstart](https://github.com/shear559/fabius/blob/main/QUICKSTART.md)

## What the page explains

Fabius **3.5.1** organizes fifteen skills around distinct responsibilities: the `fabius` router, the `fabius-parcus` lean core and thirteen specialists. The router is designed to select relevant instructions and compose them around a task. The host supplies the model, loads the instructions and controls tools and permissions. Installation does not guarantee automatic skill activation; the page explains explicit invocation and a first-run check.

The front page follows one flow:

1. The problem: overlapping instructions and useful skills that go unloaded.
2. A compact roster of the two coordinating skills and thirteen specialists.
3. Request → route → compose → execute with available tools → verify → remember.
4. One illustrative launch-page composition: design, copy, engineering and approved project context.
5. Four interactive demonstrations, followed by installation and ten FAQ answers.

The [skill contracts](https://github.com/shear559/fabius/tree/main/skills) and [architecture](https://github.com/shear559/fabius/blob/main/ARCHITECTURE.md) are the sources for capability ownership. No skill selection, model improvement or tool availability is guaranteed by the landing page.

## Four interactive demonstrations

| Demonstration | Interaction | Source |
| --- | --- | --- |
| Math & visualization | Explore exact graphs and see how a changed parameter affects the answer. | [Preview](assets/showcase-20260930-focused/math/preview.html) · [Download](assets/showcase-20260930-focused/math/source.zip) |
| Agent teams | Inspect the task graph, dispatch decisions and produced artifacts. | [Preview](assets/showcase-20260930-focused/swarm/preview.html) · [Download](assets/showcase-20260930-focused/swarm/source.zip) |
| Project memory | Retrieve source-linked context with preserved decision history. | [Preview](assets/showcase-20260930-focused/memory/preview.html) · [Download](assets/showcase-20260930-focused/memory/source.zip) |
| Clear code | Edit input, run a readable function and inspect its output and checks. | [Preview](assets/showcase-20260930-focused/code/preview.html) · [Download](assets/showcase-20260930-focused/code/source.zip) |

Each supports a guided walkthrough, phone/desktop framing and a full-size preview. These are authored demonstrations refined with Fabius. They use disclosed local examples, do not call live models and reset when reopened. They illustrate capabilities rather than measuring model improvement. Their [source, scope and recorded checks](assets/showcase-20260930-focused/verification.html) remain available.

## Source and design

Static `index.html`, `styles.css` and `main.js`; no build step or package installation. The gallery still uses `assets/showcase-20260916/showcase.js` and `showcase.css`. Their dated folder name does not make them archival: they are active dependencies of the current four-demo gallery.

Keep the canonical slogan, green tokens, self-hosted Rubik, square buttons, beetles and continuous S-wave artwork. The system map shows the available skills and their relationship to one result; it is not a live routing trace. It scrolls within its own container on narrow screens and honors reduced motion. The compact roster and workflow provide the same explanation without depending on the diagram.

The visible FAQ and its JSON-LD must remain word-for-word equivalent. Keep executable JavaScript external to satisfy the production CSP. Model and platform marks are illustrative; they do not establish integration testing, affiliation or endorsement.

## Local preview and verification

```sh
python3 -m http.server 8799
```

Serve from the repository root. Check the rendered page at phone, tablet and desktop widths, including WebKit. Exercise the menu, keyboard tabs, copy buttons, four demo tours, preview sizing, full-size dialog and FAQ. Check local links, images, console and network failures, reduced motion and FAQ/schema parity.

A local server does not supply production security headers. After publication, verify the exact [canonical website](https://fabius-landing.vercel.app), its rendered content, assets, console, headers and matching whitepaper. A source change or push alone does not establish that the live page works.

## Publication

The existing Vercel project is linked to `main`; a push can publish the site. Keep publication scoped to reviewed changes and verify the resulting deployment. `vercel.json` supplies a same-origin CSP and restricts microphone, camera and geolocation. Assets are cached immutably, so a replaced image needs a new filename. Root stylesheet and JavaScript references carry dated version suffixes when those files change.

The whitepaper must match the corresponding Fabius release. The product repository provides executable repository checks through `bash scripts/verify-all.sh --mode=dev`; these check implementation and release integrity, not a model-quality gain.

## Historical evidence

Historical material remains available without leading the homepage:

- [Evidence archive](https://github.com/shear559/fabius/blob/main/docs/archive/README.md): results, receipts and limitations in the product repository.
- [Whitepaper](fabius-as-a-system.pdf): the corresponding Fabius release artifact.
- [Paired artifact study](build-study.html): original submissions, protocol and results.
- [September 30 refined gallery](assets/showcase-20260930-refined/verification.html): the earlier eight-artifact presentation and its checks.
- [September 30 systems](assets/showcase-20260930/verification.html), [September 21 media and science](assets/showcase-20260921/verification.html), and [September 16 refinement](assets/showcase-20260916/verification.html): source and methodology for earlier editions.

This presentation change does not rerun experiments, revise historical results or replace archived artifacts.

## Licence

Public source does not imply an open-source licence. Fabius is proprietary. Its [LICENSE](https://github.com/shear559/fabius/blob/main/LICENSE) grants personal, non-commercial installation and use as an agent plugin through the published marketplace command on machines you control. Redistribution, modification and commercial use require prior written permission. Model access and connected services may have separate costs.
