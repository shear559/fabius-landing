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
  $$('[data-copy]').forEach((box) => {
    const btn = $('.copy', box);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(box.dataset.copy);
        const old = btn.textContent;
        btn.textContent = 'Copied';
        btn.classList.add('done');
        setTimeout(() => { btn.textContent = old; btn.classList.remove('done'); }, 1600);
      } catch (_) { /* clipboard blocked — no-op */ }
    });
  });

  /* ── scroll reveals ─────────────────────────────────────── */
  const revealTargets = $$(
    '.sec-head, .ladder-fig, .text-link, ' +
    '.formula-band, .gate-fig, .math-work, .flow-loop, .rloop, .rescard, ' +
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

  /* ── hero parallax — the beetle swarm drifts slower than the page (depth) ── */
  const swarm = $('#swarm');
  if (swarm && !reduce) {
    let ticking = false;
    const drift = () => {
      ticking = false;
      const y = Math.min(scrollY, 760) * 0.15;
      swarm.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(drift); } }, { passive: true });
    drift();
  }

  /* ── emblem: draw-in "creation" on every spiral it appears (not nav/footer) ── */
  const emblems = $$('.draw-emblem');
  if (emblems.length && !reduce && 'IntersectionObserver' in window) {
    emblems.forEach((svg) => {
      const path = $('.draw-spiral', svg), dot = $('.draw-dot', svg);
      if (!path) return;
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)';
      if (dot) { dot.style.opacity = '0'; dot.style.transition = 'opacity .4s ease .95s'; }
    });
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const path = $('.draw-spiral', en.target), dot = $('.draw-dot', en.target);
        if (path) path.style.strokeDashoffset = '0';
        if (dot) dot.style.opacity = '1';
        // keep a restrained static glow once the draw-in completes
        setTimeout(() => en.target.classList.add('drawn'), 1500);
        obs.unobserve(en.target);
      });
    }, { threshold: 0.4 });
    emblems.forEach((svg) => io.observe(svg));
  }

  /* ── explainer video: play-in-view + auto-hiding controls ──────── */
  const dVideo = $('#demoVideo'), dFrame = $('#demoFrame'), dToggle = $('#demoToggle');
  if (dVideo && dFrame) {
    let hideTimer = null;
    // keep the button up only while sitting on the poster (so it stays discoverable)
    const atPoster = () => dVideo.paused && dVideo.currentTime < 0.06;
    const showControls = () => {
      dFrame.classList.add('show-controls');
      clearTimeout(hideTimer);
      if (!atPoster()) hideTimer = setTimeout(() => dFrame.classList.remove('show-controls'), 2600);
    };
    const hideControls = () => { clearTimeout(hideTimer); dFrame.classList.remove('show-controls'); };
    const setPlay = (play) => {
      if (play) dVideo.play().catch(() => {});
      else dVideo.pause();
      if (dToggle) dToggle.setAttribute('aria-label', play ? 'Pause the explainer' : 'Play the explainer');
    };
    const toggle = () => { setPlay(dVideo.paused); showControls(); };
    dToggle && dToggle.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    dVideo.addEventListener('click', toggle);
    dVideo.addEventListener('play', () => { dFrame.classList.add('playing'); showControls(); });
    dVideo.addEventListener('pause', () => { dFrame.classList.remove('playing'); showControls(); });
    dFrame.addEventListener('pointermove', showControls);
    dFrame.addEventListener('pointerleave', () => { if (!atPoster()) hideControls(); });
    // tap/click anywhere outside the video dismisses the controls
    document.addEventListener('pointerdown', (e) => { if (!dFrame.contains(e.target)) hideControls(); });
    showControls();
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver((ents) => {
        ents.forEach((en) => setPlay(en.isIntersecting && en.intersectionRatio >= 0.4));
      }, { threshold: [0, 0.4, 0.75] }).observe(dFrame);
    }
  }

  /* ── living walkers (sakana-style beetles crossing the field) ── */
  const WB = `<svg class="wb" viewBox="0 0 120 150" fill="none">
    <g stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path class="leg la" style="--ox:40px;--oy:50px" d="M40 50 L17 41 L7 47"/>
      <path class="leg lb" style="--ox:80px;--oy:50px" d="M80 50 L103 41 L113 47"/>
      <path class="leg lb" style="--ox:36px;--oy:73px" d="M36 73 L10 73 L2 86"/>
      <path class="leg la" style="--ox:84px;--oy:73px" d="M84 73 L110 73 L118 86"/>
      <path class="leg la" style="--ox:39px;--oy:99px" d="M39 99 L15 113 L8 128"/>
      <path class="leg lb" style="--ox:81px;--oy:99px" d="M81 99 L105 113 L112 128"/>
    </g>
    <g stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M53 17 C46 8 41 5 36 3"/><path d="M67 17 C74 8 79 5 84 3"/></g>
    <ellipse cx="60" cy="20" rx="12" ry="11" fill="currentColor"/>
    <path d="M46 30 Q60 27 74 30 L82 50 Q60 46 38 50 Z" fill="currentColor"/>
    <path d="M60 47 C84 47 92 66 92 90 C92 120 78 140 60 140 C42 140 28 120 28 90 C28 66 36 47 60 47 Z" fill="currentColor"/>
    <line x1="60" y1="52" x2="60" y2="134" stroke="var(--seam,#fff)" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>
    <g transform="translate(60,92) scale(0.40) translate(-50,-50)"><path d="M50 50 L61 50 L61 39 L39 39 L39 61 L72 61 L72 28 L28 28 L28 72 L83 72 L83 17 L17 17" fill="none" stroke="var(--seam,#fff)" stroke-width="6" stroke-linecap="square"/><circle cx="50" cy="50" r="3.4" fill="var(--seam,#fff)"/></g>
  </svg>`;
  const buildWalkers = (stage, configs) => {
    if (!stage) return;
    const frag = document.createDocumentFragment();
    configs.forEach((c) => {
      const w = document.createElement('div');
      // legs are imperceptible below ~52px — skip their two keyframe animations there
      w.className = 'walker' + (c.dir < 0 ? ' rtl' : '') + (c.size < 52 ? ' no-legs' : '');
      // --x parks the walker at a scattered resting spot under prefers-reduced-motion,
      // where the crossing animation is off and every walker would otherwise pile up at left:0
      const x = ((c.lane * 1.7 + c.size * 2.3) % 88) + 4;
      w.style.cssText = `--lane:${c.lane}%;--size:${c.size}px;--dur:${c.dur}s;--delay:${c.delay}s;--op:${c.op};--bd:${c.bob}s;--ld:${c.leg}s;--x:${x.toFixed(1)}%`;
      if (c.color) w.style.color = c.color;
      w.innerHTML = `<div class="walker-bob">${WB}</div>`;
      frag.appendChild(w);
    });
    stage.appendChild(frag);
  };
  const small = matchMedia('(max-width:640px)').matches;
  // two-tier swarm: a few LARGE + SLOW anchors (graceful depth) and MANY tiny + very fast ones
  const heroWalk = [
    // large, slow anchors
    { lane: 16, size: 102, dur: 32, delay: -5,  op: .46, dir: 1,  bob: 1.9, leg: .74, color: '#9b6bff' },
    { lane: 70, size: 90,  dur: 36, delay: -16, op: .4,  dir: -1, bob: 2.1, leg: .82 },
    { lane: 44, size: 56,  dur: 24, delay: -9,  op: .3,  dir: 1,  bob: 1.6, leg: .64 },
    // many small, very fast
    { lane: 8,  size: 22, dur: 4,   delay: -1, op: .24, dir: 1,  bob: .5 },
    { lane: 30, size: 18, dur: 3,   delay: -2, op: .2,  dir: -1, bob: .44 },
    { lane: 52, size: 20, dur: 3.4, delay: -1, op: .22, dir: 1,  bob: .46 },
    { lane: 84, size: 16, dur: 2.6, delay: -2, op: .18, dir: -1, bob: .4 },
    { lane: 38, size: 24, dur: 4.4, delay: -3, op: .24, dir: 1,  bob: .5 },
    { lane: 62, size: 14, dur: 2.4, delay: -1, op: .16, dir: -1, bob: .38 },
    { lane: 22, size: 18, dur: 3.2, delay: -2, op: .2,  dir: 1,  bob: .44 },
    { lane: 76, size: 20, dur: 3.6, delay: -4, op: .2,  dir: 1,  bob: .46 },
    { lane: 48, size: 16, dur: 2.8, delay: -1, op: .18, dir: -1, bob: .4 },
    { lane: 90, size: 18, dur: 3,   delay: -3, op: .2,  dir: -1, bob: .42 },
    { lane: 14, size: 14, dur: 2.5, delay: -2, op: .16, dir: 1,  bob: .38 },
    { lane: 58, size: 22, dur: 4,   delay: -1, op: .22, dir: 1,  bob: .48 },
    { lane: 34, size: 16, dur: 2.7, delay: -4, op: .18, dir: -1, bob: .4 },
    { lane: 80, size: 14, dur: 2.3, delay: -1, op: .16, dir: 1,  bob: .36 },
  ];
  const coreWalk = [
    { lane: 20, size: 84, dur: 28, delay: -6, op: .82, dir: 1,  bob: 1.8, leg: .72, color: '#b491ff' },
    { lane: 68, size: 52, dur: 21, delay: -11, op: .66, dir: -1, bob: 1.5, leg: .6,  color: '#8a5cff' },
    { lane: 44, size: 20, dur: 3.6, delay: -2, op: .6,  dir: 1,  bob: .46, color: '#c9b6ff' },
    { lane: 86, size: 16, dur: 2.8, delay: -1, op: .55, dir: -1, bob: .4,  color: '#9b6bff' },
    { lane: 34, size: 18, dur: 3,   delay: -3, op: .55, dir: 1,  bob: .42, color: '#b491ff' },
    { lane: 58, size: 14, dur: 2.4, delay: -1, op: .5,  dir: -1, bob: .38, color: '#c9b6ff' },
    { lane: 78, size: 18, dur: 3.2, delay: -2, op: .5,  dir: 1,  bob: .44, color: '#9b6bff' },
    { lane: 14, size: 16, dur: 2.6, delay: -1, op: .52, dir: -1, bob: .4,  color: '#b491ff' },
    { lane: 50, size: 14, dur: 2.3, delay: -3, op: .48, dir: 1,  bob: .36, color: '#c9b6ff' },
  ].filter((_, i) => small ? i < 5 : true);
  // defer the decorative swarm DOM build off the critical path → smoother first paint / input
  const buildSwarms = () => {
    buildWalkers($('#swarm'), small ? heroWalk.filter((_, i) => i < 9) : heroWalk);
    buildWalkers($('#coreWalk'), coreWalk);
  };
  if ('requestIdleCallback' in window) requestIdleCallback(buildSwarms, { timeout: 700 });
  else setTimeout(buildSwarms, 150);

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
  $$('[role="tablist"]').forEach((list) => {
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

/* ── the system map: router → lean core → 13 layers → spine, drawn as a
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
    ['disciplina', 'process', '#2563eb'], ['decor', 'design', '#db2777'], ['cohors', 'agents', '#0891b2'],
    ['archivum', 'memory', '#d97706'], ['mercatus', 'go-to-market', '#059669'], ['praesidium', 'security', '#e11d48'],
    ['ludus', 'games', '#7c3aed'], ['catena', 'on-chain · seal', '#ca8a04'], ['machina', 'automation', '#0d9488'],
    ['scientia', 'science', '#3730a3'], ['doctrina', 'AI/ML eng.', '#4338ca'], ['fortuna', 'markets', '#15803d'],
    ['concilium', 'council', '#0ea5e9'],
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
  node(router.cx, router.cy, router.w, router.h, 'smap-router', 'fabius — router', 'layer · machinery · tier');
  node(core.cx, core.cy, core.w, core.h, 'smap-core', 'fabius-parcus — core', 'lean · runs under every layer');
  LAYERS.forEach(([name, sub, acc], i) => node(lx(i), LY, LW, LH, 'smap-layer', name, sub, acc, 'bug-' + name));
  node(spine.cx, spine.cy, spine.w, spine.h, 'smap-spine', 'the spine', 'references · CORPUS.md · evals · AGENTS.md');

  const lab = (x, y, t) => gNode.appendChild(mk('text', { class: 'smap-lab', x, y, text: t }));
  lab(710, 118, 'dispatches'); lab(300, cBot + 54, 'under every layer'); lab(710, 632, 'end to end');

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
