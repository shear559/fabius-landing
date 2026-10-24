// Progressive enhancement: the complete, readable list is the default.
const field = document.querySelector('#models');
const stage = field?.querySelector('#marquee');
const view = field?.querySelector('#modelViewToggle');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const canOrbit = CSS.supports('offset-path', 'path("M 0 0 L 1 1")') && 'ResizeObserver' in window;

if (stage && view && canOrbit) {
  const rows = [...stage.querySelectorAll('.mq-row')].map(row => {
    const rail = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS(rail.namespaceURI, 'path');
    rail.classList.add('model-rail');
    rail.setAttribute('aria-hidden', 'true');
    rail.append(path);
    row.prepend(rail);
    return { row, path, tiles:[...row.querySelectorAll('.model-tile')] };
  });
  let expanded = false;
  let lastWidth = 0;

  function sizePaths() {
    const width = stage.clientWidth;
    if (!width || !stage.classList.contains('is-orbit') || expanded) return;
    const style = getComputedStyle(field);
    // Resolve rem-valued design tokens through the rendered tile.
    const tile = rows[0].tiles[0].querySelector('.mq-logo').offsetWidth;
    const unit = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const gap = parseFloat(style.getPropertyValue('--model-gap')) * unit;
    const y = Math.round(tile * .66);
    const low = Math.round(tile * 1.48);
    rows.forEach(({row, path, tiles}, rowIndex) => {
      const curve = `M ${-tile} ${y} C ${width * .17} ${y}, ${width * .18} ${low}, ${width * .5} ${low} C ${width * .82} ${low}, ${width * .83} ${y}, ${width + tile} ${y}`;
      path.setAttribute('d', curve);
      // Long offstage tails preserve logo spacing at every screen width.
      const tail = Math.max(tile * 2, (tiles.length * (tile + gap) - path.getTotalLength()) / 2);
      const full = `M ${-tile-tail} ${y} H ${-tile} ${curve.slice(curve.indexOf(' C'))} H ${width+tile+tail}`;
      path.setAttribute('d', full);
      const length = path.getTotalLength();
      const duration = length / 24;
      row.style.setProperty('--model-path', `path("${full}")`);
      row.style.setProperty('--model-duration', `${duration}s`);
      tiles.forEach((element, i) => {
        // Start the first names near the visible entrance, not halfway through a hidden tail.
        const phase = ((tail + tile) / length + i / tiles.length) % 1;
        element.style.setProperty('--model-delay', `${-(rowIndex ? 1-phase : phase) * duration}s`);
      });
    });
    lastWidth = width;
  }

  function syncView() {
    const orbit = !reduced.matches;
    stage.classList.toggle('is-orbit', orbit);
    stage.classList.toggle('is-expanded', expanded);
    view.hidden = !orbit;
    view.setAttribute('aria-expanded', String(expanded));
    view.querySelector('span').textContent = expanded ? 'Back to icon flow' : 'View all models';
    sizePaths();
  }

  view.addEventListener('click', () => {
    expanded = !expanded;
    syncView();
    // Collapsing the full list keeps its keyboard/touch control in view.
    if (!expanded) view.scrollIntoView({block:'nearest', behavior:'instant'});
  });
  reduced.addEventListener('change', syncView);
  new ResizeObserver(() => {
    if (Math.abs(stage.clientWidth - lastWidth) > 1) sizePaths();
  }).observe(stage);
  syncView();
}
