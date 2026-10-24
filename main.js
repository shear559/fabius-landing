/* fabius — landing interactions. Progressive enhancement, reduced-motion aware. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ── nav: frosted on scroll ─────────────────────────────── */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── mobile menu ────────────────────────────────────────── */
  const toggle = $('#navToggle'), menu = $('#mobileMenu');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
    menu.hidden = !open;
    if (!open && menu.contains(document.activeElement)) toggle.focus();
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  matchMedia('(min-width:901px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ── copy buttons ───────────────────────────────────────── */
  $$('[data-copy]').forEach((box, i) => {
    const btn = $('.copy', box);
    if (!btn) return;
    const commands = box.dataset.copy;
    const label = btn.textContent;
    const feedback = document.createElement('div');
    feedback.className = 'copy-feedback';
    const status = document.createElement('p');
    status.className = 'copy-status';
    status.id = `copy-status-${i}`;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    const manual = document.createElement('textarea');
    manual.className = 'copy-manual';
    manual.readOnly = true;
    manual.hidden = true;
    manual.wrap = 'off';
    manual.rows = commands.split('\n').length;
    manual.value = commands;
    manual.setAttribute('aria-label', 'Commands for manual copy');
    manual.setAttribute('aria-describedby', status.id);
    feedback.append(status, manual);
    if (box.classList.contains('hero-cmd')) box.insertAdjacentElement('afterend', feedback);
    else box.append(feedback);
    btn.setAttribute('aria-describedby', status.id);
    let pending = false, resetTimer;
    const selectForCopy = (message) => {
      manual.hidden = false;
      manual.focus({ preventScroll: true });
      manual.select();
      manual.setSelectionRange(0, commands.length);
      status.textContent = `${message} The commands below are selected. Press Ctrl+C or Command+C, or use your device’s Copy action.`;
      btn.textContent = label;
    };
    btn.addEventListener('click', async () => {
      if (pending) return;
      pending = true;
      clearTimeout(resetTimer);
      btn.classList.remove('done');
      btn.setAttribute('aria-disabled', 'true');
      btn.textContent = 'Copying…';
      status.textContent = '';
      try {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
          selectForCopy('Automatic copy is unavailable.');
          return;
        }
        await navigator.clipboard.writeText(commands);
        manual.hidden = true;
        status.textContent = 'Commands copied to clipboard.';
        btn.textContent = 'Copied';
        btn.classList.add('done');
        resetTimer = setTimeout(() => { btn.textContent = label; btn.classList.remove('done'); }, 1600);
      } catch (error) {
        selectForCopy('Automatic copy failed.');
      } finally {
        pending = false;
        btn.removeAttribute('aria-disabled');
      }
    });
  });

  /* ── scroll reveals ─────────────────────────────────────── */
  const revealTargets = $$(
    '.sec-head, .ladder-fig, .text-link, ' +
    '.formula-band, .gate-fig, .math-work, .rloop, .rescard, ' +
    '.research-copy, .research-pts li, .core-in, ' +
    '.install-terminal, .install-points li'
  );
  if (!reduce && 'IntersectionObserver' in window) {
    // orchestrated stagger: grouped items cascade by their position within the group.
    // grids cascade row-wise (modulo columns) so nothing waits more than ~2 steps.
    revealTargets.forEach((el) => {
      el.classList.add('reveal');
      const sibs = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
      let i = 0;
      if (el.matches('.install-points li')) i = Math.min(sibs, 3);
      else if (el.matches('.research-pts li')) i = Math.min(sibs, 3);
      if (i) el.style.setProperty('--reveal-i', i);
    });
    const revealOne = (el) => {
      if (el.classList.contains('in')) return;
      el.classList.add('in');
      el.addEventListener('transitionend', () => el.classList.add('done'), { once: true });
      setTimeout(() => el.classList.add('done'), 1200);
    };
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        revealOne(en.target);
        obs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    revealTargets.forEach((el) => io.observe(el));
    // WebKit can coalesce IntersectionObserver work during very fast programmatic
    // scrolling. A lightweight viewport probe keeps the experience deterministic,
    // while the timeout is the final content-visibility backstop.
    let revealTick = false;
    const revealVisible = () => {
      revealTick = false;
      revealTargets.forEach((el) => {
        if (el.classList.contains('in')) return;
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight * 0.92 && r.bottom > 0) {
          revealOne(el);
          io.unobserve(el);
        }
      });
    };
    addEventListener('scroll', () => {
      if (revealTick) return;
      revealTick = true;
      setTimeout(revealVisible, 24);
    }, { passive: true });
    setTimeout(revealVisible, 350);
    setTimeout(() => revealTargets.forEach(revealOne), 4500);
  }

  /* ── marquee: a pause control everyone can reach (WCAG 2.2.2) ── */
  const mq = $('#marquee'), mqBtn = $('#mqPause');
  if (mq && mqBtn) {
    mqBtn.addEventListener('click', () => {
      const paused = mq.classList.toggle('paused');
      mqBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      mqBtn.setAttribute('aria-label', paused ? 'Resume the moving model list' : 'Pause the moving model list');
    });
  }

  /* ── install tabs — roving tabindex, arrow keys, hidden panels ── */
  $$('#install [role="tablist"]').forEach((list) => {
    const tabs = $$('[role="tab"]', list);
    if (!tabs.length) return;
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const select = (i, focus) => {
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (panels[j]) panels[j].hidden = !on;
      });
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        let n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });
  });

  /* ── active section in nav ──────────────────────────────── */
  const links = $$('.nav-links a');
  if (links.length && 'IntersectionObserver' in window) {
    const map = new Map();
    links.forEach((a) => { const id = a.getAttribute('href').slice(1); const s = document.getElementById(id); if (s) map.set(s, a); });
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const a = map.get(en.target);
        if (a && en.isIntersecting) {
          links.forEach((l) => l.removeAttribute('aria-current'));
          a.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, s) => spy.observe(s));
  }
})();

/* ── the system map: router → lean core → 13 available skills → shared result, drawn as a
   curved fan with packets flowing along the connectors — the system-map
   fan view. Connectors draw in on scroll, then the packets flow.
   Reduced-motion: fully drawn, static, no packets. */
(() => {
  'use strict';
  const svg = document.getElementById('sysmapSvg');
  if (!svg) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (t, a = {}, kids = []) => {
    const n = document.createElementNS(NS, t);
    for (const k in a) { if (k === 'text') n.textContent = a[k]; else n.setAttribute(k, a[k]); }
    (Array.isArray(kids) ? kids : [kids]).forEach((c) => c && n.appendChild(c));
    return n;
  };
  const LAYERS = [
    ['disciplina', 'process', '#76b900'], ['decor', 'design', '#9ade2b'], ['cohors', 'agents', '#5e9400'],
    ['archivum', 'memory', '#8ccb2e'], ['mercatus', 'go-to-market', '#76b900'], ['praesidium', 'security', '#9ade2b'],
    ['ludus', 'games', '#5e9400'], ['catena', 'on-chain · seal', '#8ccb2e'], ['machina', 'automation', '#76b900'],
    ['scientia', 'science', '#9ade2b'], ['doctrina', 'AI/ML eng.', '#5e9400'], ['fortuna', 'markets', '#8ccb2e'],
    ['concilium', 'council', '#76b900'],
  ];
  const W = 1280, n = LAYERS.length;
  const router = { cx: 640, cy: 52, w: 252, h: 56 };
  const core = { cx: 640, cy: 178, w: 300, h: 56 };
  const spine = { cx: 640, cy: 558, w: 346, h: 54 };
  const LY = 378, LW = 88, LH = 70, MG = 56, SPAN = W - MG * 2;
  const lx = (i) => MG + SPAN * i / (n - 1);

  const defs = mk('defs');
  defs.appendChild(mk('marker', { id: 'smArrow', viewBox: '0 0 10 10', refX: 8.5, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
    mk('path', { d: 'M0 0 L10 5 L0 10 z', class: 'smap-arrow' })));
  svg.appendChild(defs);
  const gLink = mk('g'), gDot = mk('g', { class: 'smap-dots' }), gNode = mk('g');
  svg.appendChild(gLink); svg.appendChild(gDot); svg.appendChild(gNode);

  const paths = [];
  const link = (d, id, trunk) => {
    const p = mk('path', { d, id, class: 'smap-link' + (trunk ? ' sm-trunk' : ''), 'marker-end': 'url(#smArrow)' });
    gLink.appendChild(p); paths.push(p);
  };
  const cBot = core.cy + core.h / 2, sTop = spine.cy - spine.h / 2;
  link(`M${router.cx} ${router.cy + router.h / 2} L${core.cx} ${core.cy - core.h / 2 - 2}`, 'sm-disp', true);
  LAYERS.forEach((_, i) => link(`M${core.cx} ${cBot} C ${core.cx} ${cBot + 78} ${lx(i)} ${LY - LH / 2 - 78} ${lx(i)} ${LY - LH / 2 - 2}`, `sm-o${i}`));
  LAYERS.forEach((_, i) => link(`M${lx(i)} ${LY + LH / 2} C ${lx(i)} ${LY + LH / 2 + 78} ${spine.cx} ${sTop - 61} ${spine.cx} ${sTop - 2}`, `sm-i${i}`));
  link(`M${spine.cx} ${spine.cy + spine.h / 2} L${spine.cx} 672`, 'sm-end', true);

  const node = (cx, cy, w, h, cls, name, sub, acc, iconId) => {
    const g = mk('g', { class: 'smap-node ' + cls, transform: `translate(${cx - w / 2} ${cy - h / 2})` });
    if (acc) g.setAttribute('style', `--acc:${acc}`);
    g.appendChild(mk('rect', { width: w, height: h, rx: 13 }));
    if (iconId) { // layer nodes carry their skill's beetle, stacked above the name
      const use = mk('use', { class: 'smap-ic', href: '#' + iconId, x: w / 2 - 11, y: 9, width: 22, height: 24 });
      use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + iconId);
      g.appendChild(use);
      g.appendChild(mk('text', { class: 'smap-name', x: w / 2, y: h - 25, text: name }));
      g.appendChild(mk('text', { class: 'smap-sub', x: w / 2, y: h - 12, text: sub }));
    } else {
      g.appendChild(mk('text', { class: 'smap-name', x: w / 2, y: h / 2 - 3, text: name }));
      g.appendChild(mk('text', { class: 'smap-sub', x: w / 2, y: h / 2 + 12, text: sub }));
    }
    gNode.appendChild(g);
  };
  node(router.cx, router.cy, router.w, router.h, 'smap-router', 'fabius — router', 'select relevant skills');
  node(core.cx, core.cy, core.w, core.h, 'smap-core', 'fabius-parcus — core', 'scope · effort · stop condition');
  LAYERS.forEach(([name, sub, acc], i) => node(lx(i), LY, LW, LH, 'smap-layer', name, sub, acc, 'bug-' + name));
  node(spine.cx, spine.cy, spine.w, spine.h, 'smap-spine', 'one checked result', 'tools · evidence · approved memory');

  const lab = (x, y, t) => gNode.appendChild(mk('text', { class: 'smap-lab', x, y, text: t }));
  lab(710, 118, 'routes'); lab(300, cBot + 54, 'available specialists'); lab(710, 632, 'verify and remember');

  if (!RM) paths.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });

  const flow = () => {
    paths.forEach((p, i) => {
      const dot = mk('circle', { r: 3.4, class: 'smap-dot' });
      const mp = mk('mpath', { href: '#' + p.id });
      mp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + p.id); // WebKit/older Safari
      dot.appendChild(mk('animateMotion', { dur: (2 + (i % 5) * 0.28).toFixed(2) + 's', begin: (-i * 0.17).toFixed(2) + 's', repeatCount: 'indefinite', calcMode: 'linear' }, mp));
      gDot.appendChild(dot);
    });
    svg.classList.add('flowing');
  };
  const run = () => {
    if (!RM) paths.forEach((p, i) => { p.style.transition = `stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1) ${(i * 0.028).toFixed(2)}s`; p.style.strokeDashoffset = '0'; });
    svg.classList.add('in');
    if (!RM) setTimeout(flow, 1500);
  };
  if (RM || !('IntersectionObserver' in window)) { run(); return; }
  const io = new IntersectionObserver((es, o) => { es.forEach((e) => { if (e.isIntersecting) { run(); o.disconnect(); } }); }, { threshold: 0.2 });
  io.observe(svg);
})();
