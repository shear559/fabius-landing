// A paced, authored illustration. There is no model request or live telemetry.
const panel = document.querySelector('#route-panel');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

if (panel) {
  const scene = panel.closest('[data-motion-region]');
  const svg = panel.querySelector('.route-visual');
  const play = panel.querySelector('#route-play');
  const buttons = [...panel.querySelectorAll('[data-phase-select]')];
  const stages = [
    ['Understand the goal', 'The request and approved context define the work.'],
    ['Select the right skills', 'The router connects only the relevant expertise.'],
    ['Work through the plan', 'Selected skills guide the model and available tools.'],
    ['Check the handoff', 'Verification connects the result to the original goal.']
  ];
  const duration = 4800;
  let phase = 0;
  let manuallyPaused = false;
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
    const active = !globalPause && !manuallyPaused && scene.dataset.motionOffscreen !== 'true';
    panel.dataset.sequencePaused = String(!active);
    play.disabled = globalPause;
    play.textContent = active ? 'Ⅱ' : '▷';
    play.setAttribute('aria-pressed', String(!active));
    play.setAttribute('aria-label', globalPause ? 'Routing illustration paused by page motion preference' : active ? 'Pause routing illustration' : 'Play routing illustration');
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
    manuallyPaused = true;
    phase = index;
    remaining = duration;
    draw();
    sync();
  }));
  play.addEventListener('click', () => {
    manuallyPaused = !manuallyPaused;
    sync();
  });
  new MutationObserver(() => {
    stopClock();
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

// Small perspective response on precise pointers; artwork only, never text.
const hero = document.querySelector('.fabius-stage');
const instruments = hero?.querySelector('.stage-scene');
const precisePointer = matchMedia('(hover: hover) and (pointer: fine)');
if (hero && instruments) {
  let frame = null;
  let x = 0;
  let y = 0;
  const canMove = () => precisePointer.matches && !reduced.matches &&
    document.body.dataset.motion !== 'paused' && !document.hidden && hero.dataset.motionOffscreen !== 'true';
  const reset = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    instruments.style.removeProperty('--pointer-x');
    instruments.style.removeProperty('--pointer-y');
  };
  hero.addEventListener('pointermove', event => {
    if (!canMove()) return;
    const rect = hero.getBoundingClientRect();
    x = ((event.clientX - rect.left) / rect.width - .5) * 16;
    y = ((event.clientY - rect.top) / rect.height - .5) * 12;
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (!canMove()) return reset();
      instruments.style.setProperty('--pointer-x', `${x.toFixed(2)}px`);
      instruments.style.setProperty('--pointer-y', `${y.toFixed(2)}px`);
    });
  }, { passive: true });
  hero.addEventListener('pointerleave', reset);
  document.addEventListener('fabius:motion', () => { if (!canMove()) reset(); });
  reduced.addEventListener('change', reset);
  precisePointer.addEventListener('change', reset);
}
