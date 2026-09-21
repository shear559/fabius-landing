# Beetle Garden Dash — Summary

## What I produced

`out/index.html` — a single self-contained file (canvas + inline JS + inline CSS, no
external requests, no assets, no dependencies). 667 lines, ~20 KB.

**Core loop (fun within ~10s):** a green beetle moves continuously around the garden
(arrow keys / WASD, or touch-drag anywhere as a virtual joystick) dodging falling
autumn leaves that sway and rotate as they drop, racing to reach a red apple. Eating
the apple scores a point, respawns the beetle at the bottom, and spawns a new apple
at a random spot near the top — difficulty (leaf speed, spawn rate, and eventually
simultaneous multi-spawns) ramps with score (teach → test → twist). Touching a leaf
costs one of 3 lives (brief invulnerability + blink after a hit); losing all lives ends
the run.

**Juice added on top of the working loop:**
- Squash/stretch on the beetle body tied to speed, animated legs/antennae, facing rotation
- Hit-stop (brief freeze) + screen shake + red flash on leaf collision, particle burst
- Particle burst + pulsing glow ring + tiny synth chime (WebAudio, no files) on eating
- Bobbing food, swaying/rotating leaves, drop shadows
- `prefers-reduced-motion` is checked once at load: shake magnitude, flash opacity,
  hit-stop duration, and particle counts are all reduced (not just "on/off") when set

**State machine:** `menu → play → (pause ⇄ play) → gameover → menu`, each state owns
its own render/overlay; input handlers branch on `state` rather than boolean flags.

**Controls:** Arrow keys/WASD (keyboard), touch-drag joystick + on-canvas pause button
(touch), mouse click fallback for desktop testing. P/Escape toggles pause, R restarts,
Space/Enter starts or restarts from menu/game-over. Session high score is kept in a JS
variable and survives restarts within the page load (not persisted to disk, as scoped).

## What I checked, and how

1. **JS syntax validity** — extracted the inline `<script>` body and ran Node's parser:
   ```
   $ node --check /tmp/extracted.js && echo "JS SYNTAX OK"
   JS SYNTAX OK
   ```

2. **No external assets/requests** — grepped the file for any src/href/network calls:
   ```
   $ grep -nE 'src=|href=|http://|https://|fetch\(|XMLHttpRequest' index.html || echo "none found"
   none found
   ```

3. **Visual verification via headless Chrome** (`/Applications/Google Chrome.app`,
   `--headless --disable-gpu --screenshot`), rendered at 480×800 and inspected the
   output images directly:
   - **Menu state**: title panel, instructions, green beetle, apple, "Tap / Space to
     Play" button all render correctly.
   - **Play state** (forced `state = STATE.PLAY` in a scratch copy, not the shipped
     file): HUD (score, session best, 3 life-icons, pause button), a falling leaf,
     the pulsing apple, and the beetle with legs/antennae all render and layer
     correctly with no HUD overlap.
   - **Game over state** (scratch copy with `score=4, highScore=7`): panel shows
     "Score: 4" / "Best: 7" and the restart button, confirming the high-score display
     path works.
   - File sizes for reference: menu screenshot 31.7 KB, play 23.5 KB, game-over 22.0 KB
     PNGs — all non-blank, confirming canvas actually drew content each time.

## What I did not do / could not check

- **No real interactive/input testing.** Headless Chrome screenshots confirm each
  render state visually, but I could not click/drag/tap or hold keys against a live
  page in this environment, so keyboard movement feel, the touch-joystick drag
  behavior, and audio playback (WebAudio beeps) are implemented per the design but
  not empirically exercised. Code review of the input handlers (keydown/keyup,
  touchstart/move/end, mousedown) shows correct state-machine gating, but a manual
  playtest in a real browser is recommended before considering this fully verified.
- **No cross-browser/device testing** (mobile Safari touch quirks, small-screen
  layout at very narrow widths) — only one headless Chrome viewport (480×800) was
  checked.
- **`prefers-reduced-motion` was verified by code inspection only** (the flag is read
  once at load and gates shake/flash/hit-stop/particle magnitudes); I did not have a
  way to toggle the OS-level media query in the headless run to screenshot the
  reduced-motion path specifically.
- Did not add persistent (localStorage) high score since the task asked for a
  **session** high score — this is intentional, not an omission.
