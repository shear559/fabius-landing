// Keep decorative motion in sync with visibility and the system preference.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const regions = [...document.querySelectorAll('[data-motion-region], .showcase, .system, .core')];
const animatedSVGs = [...document.querySelectorAll('#sysmapSvg, .route-visual, .stage-artwork')];
function sync() {
  const paused = reduced.matches || document.hidden;
  document.body.dataset.motion = paused ? 'paused' : 'running';
  animatedSVGs.forEach(svg => {
    const offscreen = svg.closest('[data-motion-offscreen="true"]');
    if (paused || offscreen || svg.closest('[data-sequence-paused="true"]')) svg.pauseAnimations();
    else svg.unpauseAnimations();
  });
  document.dispatchEvent(new CustomEvent('fabius:motion', { detail: { paused } }));
}
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
