// One motion preference for the original marquee and every decorative scene.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const control = document.querySelector('#mqPause');
const toggle = document.querySelector('#motionToggle');
const marquee = document.querySelector('#marquee');
const regions = [...document.querySelectorAll('[data-motion-region], .showcase, .system, .core')];
const animatedSVGs = [...document.querySelectorAll('.shape-object, #sysmapSvg, .route-visual')];
let userPaused = control?.getAttribute('aria-pressed') === 'true';
function sync() {
  const paused = reduced.matches || document.hidden || userPaused;
  document.body.dataset.motion = paused ? 'paused' : 'running';
  marquee?.classList.toggle('paused', userPaused);
  toggle?.setAttribute('aria-pressed', String(userPaused));
  if (toggle) {
    toggle.querySelector('.motion-label').textContent = userPaused ? 'Resume motion' : 'Pause motion';
    toggle.querySelector('.motion-symbol').textContent = userPaused ? '▷' : 'Ⅱ';
  }
  control?.setAttribute('aria-label', userPaused ? 'Resume page motion' : 'Pause page motion');
  animatedSVGs.forEach(svg => {
    const offscreen = svg.closest('[data-motion-offscreen="true"]');
    if (paused || offscreen || svg.closest('[data-sequence-paused="true"]')) svg.pauseAnimations();
    else svg.unpauseAnimations();
  });
  document.dispatchEvent(new CustomEvent('fabius:motion', { detail: { paused } }));
}
if (control) new MutationObserver(() => {
  userPaused = control.getAttribute('aria-pressed') === 'true';
  sync();
}).observe(control, { attributes:true, attributeFilter:['aria-pressed'] });
toggle?.addEventListener('click', () => {
  userPaused = !userPaused;
  control?.setAttribute('aria-pressed', String(userPaused));
  sync();
});
reduced.addEventListener('change', sync);
document.addEventListener('visibilitychange', sync);
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({target,isIntersecting}) => {
      target.dataset.motionOffscreen = String(!isIntersecting);
    });
    sync();
  }, { rootMargin:'100px' });
  regions.forEach(region => observer.observe(region));
}
sync();
