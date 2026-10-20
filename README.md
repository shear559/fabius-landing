# Fabius landing page

The product website for [Fabius](https://github.com/shear559/fabius), created by Ariel Shemesh. Published at https://fabius-landing.vercel.app. Buildless HTML, CSS and JavaScript; the existing Vercel project deploys `main`.

## Experience

- A model-family selector explains the separation between instructions, model and host. It makes no model calls.
- A workflow explorer steps through three authored task routes.
- A project-memory demo retrieves current fictional records, preserves superseded history, and optionally saves one note in browser local storage. Reset removes only its own entry.
- Four source-downloadable demonstrations cover math, agent teams, memory and code.
- Installation, licence and support remain linked to the product repository.

The previous benchmark reports, comparison galleries and score archives are removed from the current tree. They remain in Git history. The whitepaper is synchronized with the product repository and describes the architecture and conditional theory without comparative scores.

## Source

`index.html`, `styles.css`, `main.js`: the main page and original brand system.
`experience.css`, `experience.mjs`, `experience-model.mjs`: the model, route and memory experiences.
`assets/gallery/`: shared gallery controls and styles.
`assets/showcase-20260930-focused/`: the four preserved working examples and their checks.
`DESIGN.md`: brand and motion constraints.

## Verification

Run `node --test tests/*.test.mjs` for local memory behavior. Serve the root with a static HTTP server, exercise the model choices, all route steps, memory save/retrieve/new session/reset, installation controls, navigation and four gallery tours at phone and desktop widths. Check reduced motion, keyboard focus, console, network, FAQ/schema parity and local links. Apply `vercel.json` headers during browser testing.

After pushing, verify the deployment commit and canonical domain. Keep the whitepaper byte-identical to the corresponding product source. Source downloads have no build step and run without model credentials.

## Licence

Publicly readable, proprietary. [The product licence](https://github.com/shear559/fabius/blob/main/LICENSE) governs use. Third-party assets retain their notices. See `/privacy` for the website’s local-storage behavior.
