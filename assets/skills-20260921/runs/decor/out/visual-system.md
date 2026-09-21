# Tidepool — visual system
Theme: dark (only — deep-sea navy is the brand ground; no light theme built)

Rationing — one paragraph: color-strategy rung is "one accent on a near-monochrome ground" (design-critique.md §9): the navy scale carries ~95% of every surface, functional chrome (borders, dividers, body text) stays neutral-gray-on-navy, and the single accent (a warm amber, "buoy amber") is reserved for the plan toggle's active state, the Plus plan's price/CTA, and every focus ring. No material beyond flat color — no paper grain, no glass blur — a forecast tool reads as instrument-panel precise, not textured.

## Colors            Name · Value · Token (base name → semantic alias) · Role · Never
  deep navy          #0A1626  --navy-900 → --canvas       page ground                        never used for text
  navy panel         #102338  --navy-800 → --surface       card / row background              never for body text
  navy panel raised  #14293F  --navy-700 → --surface-2     the "Plus" card, popovers          never as the only cue for emphasis — pair with accent border
  fog                #EDF3F8  --fog-50 → --text            headings, body, primary labels     never below 4.5:1 (never on accent — use --on-accent instead)
  fog muted          #9FB2C4  --fog-300 → --muted          secondary text, captions, FAQ body never for a call-to-action label
  steel border       #5C82A8  --steel-400 → --border       hairlines, input/control edges     never lighter than needed — one weight only, no double borders
  buoy amber         #FF9E46  --amber-400 → --accent       price emphasis, active toggle, CTA fill, focus never as a control fill for neutral actions (nav, close, back)
  ink on amber       #1A0F03  --ink-950 → --on-accent      text/icon sitting on accent fill   never used on navy backgrounds
  focus ring         #FFB870  --amber-300 → --focus        keyboard focus outline only        never decorative, never removed

## Type roles        per band: display · heading · body · ui · code
  display: system-ui stack (weights used: 700) · sizes 40px/32px (1440/360, clamped) · line-height 1.1 · letter-spacing −0.02em · fallback stack -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif · rule: the pricing headline only · never on more than one line's worth of copy
  heading: system-ui stack (weights used: 700, 600) · sizes 24px / 20px / 17px (h2/h3/h4) · line-height 1.25 · letter-spacing −0.01em · fallback stack as above · rule: section titles, plan names, price figures · never justified
  body: system-ui stack (weights used: 400) · size 16px · line-height 1.55 · letter-spacing 0 · fallback stack as above · rule: paragraphs, FAQ answers, feature list items · never below 16px
  ui: system-ui stack (weights used: 600) · size 15px · line-height 1.3 · letter-spacing 0 · fallback stack as above · rule: buttons, toggle labels, tags · never lowercase-forced on proper nouns
  code: none recorded — no code surfaces in this build

## Spacing           density calm/generous · base unit 8px · max width 1120px (72rem-ish content column, cards cap at 380px) · gap between sections 80px (64px at 360px viewport) · padding inside a card 32px (24px at 360px) · gap between elements 16–24px
## Radius            control (button/toggle): 10px · input: none recorded (no free-text inputs) · card: 16px · tag (badge "14-day trial", "Save 25%"): 999px (pill) · image: none recorded · overlay: none recorded (no modal in this build)
## Elevation         card → no drop shadow; the Plus card is distinguished by --surface-2 (lighter navy) + a 1px --accent border, never a shadow · sticky/none: no sticky chrome in this build
## States            hover → surface lightens one step (--surface → --surface-2) on cards; CTA hover = accent at 90% opacity, transform: none (no layout shift) · press → `transform: scale(0.97)`, 100ms · focus → 2px --focus outline, 3px offset, applied via :focus-visible, never suppressed · disabled → not applicable (no disabled controls in this build) · loading → not applicable (static page) · empty → not applicable · error → not applicable
## Components        toggle (monthly/yearly segmented switch): two-option radiogroup, pill track, accent fill follows the checked option; pricing card: header (plan name + tagline) → price line → feature list (checkmark glyphs, inline SVG, currentColor) → CTA button; FAQ: native `<details>/<summary>` accordion, no JS; badge: pill tag for "Free trial" / "Save 25%"
## Copy conventions  casing: sentence case throughout (no title case, no all-caps except the eyebrow-style badges which use small-caps-style tracking, not literal uppercase transform) · emoji policy: none · numerals: prices always show the currency symbol and whole dollars ($4, $36); voice/person/tone is fabius-mercatus's territory — this file only fixes casing and glyph rules
## DO / DON'T        DO keep every functional control (nav, toggle track, borders, body text) neutral navy/fog/steel · DO reserve amber for the Plus plan's price, its CTA, the active toggle state and focus rings only · DO use exactly one radius per element family (10/16/999, never a fourth) · DO drive all motion through transform/opacity only, capped ~150ms · DON'T let amber appear on the Free plan's CTA or on more than one price at a time · DON'T add a shadow anywhere — elevation is surface-color + border only · DON'T use pure #000 or pure #FFF anywhere · DON'T fake a heading break with `<br>` — rely on `text-wrap: balance`
