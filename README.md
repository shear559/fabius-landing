# Fabius landing page

The product website for [Fabius](https://github.com/shear559/fabius), created by Ariel Shemesh. Published at https://fabius-landing.vercel.app. Buildless HTML, CSS and JavaScript; the existing Vercel project deploys `main`.

## Experience

- The original Fabius beetle sits in a standalone, outlined illustration with orbital geometry, connected context/result panels and an accessible motion control. Decorative characters no longer move behind the text.
- A keyboard-accessible task chooser explains example website, research and automation routes. These are authored illustrations, not live agent runs.
- A shared motion control pauses the marquee, standalone artwork and system animation. Motion also respects reduced-motion preferences, tab visibility and offscreen sections.
- The original granular lime material extends through the demo framing, architecture, research, installation and FAQ. Sky blue accents mark context and capabilities; apricot accents mark design and verification. The palette repeats across the illustrations and functional sections. A four-phase routing illustration has path-following signals, manual stage controls and a pause-aware clock. It is explicitly illustrative.
- The original beetle banner and two moving rows present 36 model families with their logos. A pause control and reduced-motion mode keep the list accessible.
- The original workflow and skill architecture explain how responsibilities fit together.
- The original routing charts, value inequality and worked example explain proportional effort, tool costs, dependencies and context selection. Their inputs and assumptions are illustrative, not benchmark results.
- The project-memory gallery demonstrates retrieval, sources, superseded decisions and saving a decision within the example.
- Four source-downloadable demonstrations cover math, agent teams, memory and code.
- Installation, licence and support remain linked to the product repository.
- Position Fabius as a model-agnostic working method across LLM providers. Lead with the user's model and task; keep named agent apps in setup instructions as examples, not a model whitelist. The default installation tab explains the general instruction-loading route.

The previous benchmark reports, comparison galleries and score archives are removed from the current tree. They remain in Git history. The whitepaper is synchronized with the product repository and describes the architecture and conditional theory without comparative scores.

## Source

`index.html`, `styles.css`, `main.js`: the main page and original brand system.
`polish.css`, `motion.mjs`: native-resolution gallery frames, compact-phone layout and the shared motion preference.
`experience.css`, `experience.mjs`: illustrated sections and the interactive routing examples.
`refinement.css`, `choreography.mjs`: the granular material and secondary color system, standalone foreground scene and routing scene clock.
`design-preview.html`, `design-preview.css`, `design-preview.mjs`: a noindex, same-origin responsive verification fixture for the public page. It leaves production CSP and framing protection intact.
`assets/gallery/`: shared gallery controls and styles.
`assets/showcase-20260930-focused/`: the four preserved working examples and their checks.
`DESIGN.md`: brand and motion constraints.

## Verification

Serve the root with a static HTTP server and exercise the model marquee, pause control, installation controls, navigation and four gallery tours at phone and desktop widths. Check reduced motion, keyboard focus, console, network, FAQ/schema parity and local links. Apply `vercel.json` headers during browser testing. The gallery's verification page links executable checks and the browser verification script.

After pushing, verify the deployment commit and canonical domain. Keep the whitepaper byte-identical to the corresponding product source. Source downloads have no build step and run without model credentials.

## Licence

Publicly readable, proprietary. [The product licence](https://github.com/shear559/fabius/blob/main/LICENSE) governs use. Third-party assets retain their notices. See `/privacy` for the website’s local-storage behavior.
