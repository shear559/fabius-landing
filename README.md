# Fabius Website

The public website for [Fabius](https://github.com/shear559/fabius), a coordinated working method for AI agents.

[Website](https://fabius-landing.vercel.app)

The site explains the method, presents interactive demonstrations and directs visitors to installation, research and support. Its animated task routing and agent scenes are illustrative experiences, not live agent execution or measured benchmarks.

## Implementation

The website uses authored HTML, CSS and JavaScript with an original beetle-based visual identity, local assets and motion modules. It has no application build step, account system or AI inference backend.

Provider and model marks describe compatibility context; they do not establish partnership or restrict Fabius to a fixed model list.

## Run locally

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open `http://127.0.0.1:8080`.

## Source guide

| Area | Purpose |
| --- | --- |
| `index.html` | Main product page |
| CSS files | Layout, visual system and responsive presentation |
| JavaScript modules | Interaction, motion and demonstrations |
| `assets/` | Original artwork and supporting media |
| `privacy.html`, `terms.html`, `support.html` | Supporting public pages |
| `vercel.json` | Hosting and response configuration |

[DESIGN.md](DESIGN.md) records the visual direction. Keep product claims and paper references aligned with the source Fabius repository.

## Verification

```sh
node --test _checks/protection.test.mjs
```

Also inspect navigation, responsive layouts, keyboard access, reduced-motion behavior and public links in a browser. The automated protection checks do not verify that the website's demonstrations execute real agent tasks.

Original artwork and third-party materials retain their respective rights.
