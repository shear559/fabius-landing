// A paced, authored illustration. There is no model request or live telemetry.
const panel = document.querySelector('#route-panel');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

if (panel) {
  const scene = panel.closest('[data-motion-region]');
  const svg = panel.querySelector('.route-visual');
  const buttons = [...panel.querySelectorAll('[data-phase-select]')];
  const stages = [
    ['Understand the goal', 'The request and approved context define the work.'],
    ['Select the right skills', 'The router connects only the relevant expertise.'],
    ['Work through the plan', 'Selected skills guide the model and available tools.'],
    ['Check the handoff', 'Verification connects the result to the original goal.']
  ];
  const duration = 4800;
  let phase = 0;
  let inspectingPhase = false;
  let timer = null;
  let startedAt = 0;
  let remaining = duration;

  function draw() {
    panel.dataset.phase = String(phase);
    panel.querySelector('#route-phase-count').textContent = `0${phase + 1} / 04`;
    panel.querySelector('#route-phase-title').textContent = stages[phase][0];
    panel.querySelector('#route-phase-detail').textContent = stages[phase][1];
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === phase)));
  }

  function stopClock() {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
    remaining = Math.max(0, remaining - (performance.now() - startedAt));
  }

  function sync() {
    const globalPause = reduced.matches || document.hidden || document.body.dataset.motion === 'paused';
    const active = !globalPause && !inspectingPhase && scene.dataset.motionOffscreen !== 'true';
    panel.dataset.sequencePaused = String(!active);
    if (active) {
      svg.unpauseAnimations();
      if (timer === null) {
        startedAt = performance.now();
        timer = setTimeout(() => {
          timer = null;
          phase = (phase + 1) % stages.length;
          remaining = duration;
          draw();
          sync();
        }, remaining);
      }
    } else {
      stopClock();
      svg.pauseAnimations();
    }
  }

  buttons.forEach((button, index) => button.addEventListener('click', () => {
    stopClock();
    inspectingPhase = true;
    phase = index;
    remaining = duration;
    draw();
    sync();
  }));
  new MutationObserver(() => {
    stopClock();
    inspectingPhase = false;
    phase = 0;
    remaining = duration;
    draw();
    sync();
  }).observe(panel, { attributes:true, attributeFilter:['aria-labelledby'] });
  document.addEventListener('fabius:motion', sync);
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  draw();
  sync();
}

// Share the pointer response between the two opening illustrations.
const precisePointer = matchMedia('(hover: hover) and (pointer: fine)');
function bindPointerArtwork(sceneSelector, artworkSelector) {
  const scene = document.querySelector(sceneSelector);
  const artwork = scene?.querySelector(artworkSelector);
  if (!artwork) return;

  let frame = null;
  let clientX = 0;
  let clientY = 0;
  let displaced = false;
  const canMove = () => precisePointer.matches && !reduced.matches &&
    !document.hidden && document.body.dataset.motion !== 'paused' && scene.dataset.motionOffscreen !== 'true';
  const reset = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (!displaced) return;
    artwork.style.removeProperty('--pointer-x');
    artwork.style.removeProperty('--pointer-y');
    displaced = false;
  };
  scene.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !canMove()) return;
    clientX = event.clientX;
    clientY = event.clientY;
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (!canMove()) return reset();
      const rect = scene.getBoundingClientRect();
      if (!rect.width || !rect.height) return reset();
      const x = ((clientX - rect.left) / rect.width - .5) * 16;
      const y = ((clientY - rect.top) / rect.height - .5) * 12;
      artwork.style.setProperty('--pointer-x', `${x.toFixed(2)}px`);
      artwork.style.setProperty('--pointer-y', `${y.toFixed(2)}px`);
      displaced = true;
    });
  }, { passive: true });
  scene.addEventListener('pointerleave', reset);
  scene.addEventListener('pointercancel', reset);
  document.addEventListener('fabius:motion', () => { if (!canMove()) reset(); });
  reduced.addEventListener('change', reset);
  precisePointer.addEventListener('change', reset);
}
bindPointerArtwork('.hero-intro', '.tool-orbit');
bindPointerArtwork('.fabius-stage', '.stage-scene');
