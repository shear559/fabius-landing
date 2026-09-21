/* Deterministic scene driver. Nothing here reads a clock: every frame is a pure function of
   window.__seek(t). No CSS transitions or animations are used anywhere in the scenes. */
(function () {
  'use strict';
  const T = window.TIMELINE;
  const clamp = v => Math.min(1, Math.max(0, v));
  const outCubic = p => 1 - Math.pow(1 - p, 3);
  const inOutCubic = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const lerp = (a, b, e) => a + (b - a) * e;
  const parse = s => Object.fromEntries(s.split(';').map(kv => kv.split(':')).map(([k, v]) => [k.trim(), parseFloat(v)]));

  // Every frame is drawn on a freshly mounted copy of the stage. Reusing one DOM let the browser keep
  // rasterised layers from earlier frames, so a frame's pixels depended on what was rendered before it.
  const pristine = document.getElementById('stage').cloneNode(true);
  let scenes, blob;
  function mount() {
    const fresh = pristine.cloneNode(true);
    document.getElementById('stage').replaceWith(fresh);
    blob = document.getElementById('blob');
    scenes = build();
  }

  // Build the copy column of each scene from the script, so screen text and captions share one source.
  const build = () => T.scenes.map(sc => {
    const el = document.querySelector(`[data-scene="${sc.id}"]`);
    const copy = el.querySelector('.copy');
    sc.lines.forEach((line, i) => {
      const d = document.createElement(line.role === 'title' || line.role === 'title-soft' ? 'h2' : 'p');
      d.className = 'l-' + line.role;
      d.dataset.line = `${sc.id}-${i}`;
      d.textContent = line.text;
      d.dataset.a = `t:${(line.at - sc.start).toFixed(2)};d:${T.lineIn};y:28;o:0`;
      copy.appendChild(d);
    });
    const anims = [...el.querySelectorAll('[data-a]')].map(n => ({ n, p: parse(n.dataset.a) }));
    const draws = [...el.querySelectorAll('[data-draw]')].map(n => ({ n, p: parse(n.dataset.draw) }));
    return { sc, el, anims, draws, art: el.querySelector('.art') };
  });

  // The painted blob holds one pose per scene and only moves during a scene change.
  const poses = {
    scatter: [1000, 110, 1.00, -8], notebook: [1030, 120, 0.98, -4], capture: [950, 70, 1.02, 6],
    connect: [990, 120, 1.00, -10], export: [1010, 90, 0.98, 3], end: [1010, 90, 0.98, 3]
  };

  function frame(t) {
    scenes.forEach(({ sc, el, anims, draws, art }, i) => {
      const last = i === scenes.length - 1;
      // Scenes dip through paper. The end card eases in more slowly, since paper to green is the
      // largest change of tone in the film, and it never leaves: the film ends on it, still.
      const inE = last ? inOutCubic(clamp((t - sc.start) / T.endFadeIn)) : outCubic(clamp((t - sc.start) / T.fadeIn));
      const outE = last ? 0 : inOutCubic(clamp((t - (sc.end - T.exit)) / T.exit));
      const vis = t >= sc.start && (last || t < sc.end);
      el.style.opacity = vis ? (inE * (1 - outE)).toFixed(4) : '0';
      el.style.visibility = vis ? 'visible' : 'hidden';
      el.style.translate = `0 ${(-16 * outE).toFixed(2)}px`;
      if (!vis) return;
      const lt = t - sc.start;
      // A slow push on the artwork keeps the held moments alive without anything looping.
      if (art) art.style.scale = lerp(1, 1.025, inOutCubic(clamp(lt / (sc.end - sc.start)))).toFixed(5);
      for (const { n, p } of anims) {
        const e = outCubic(clamp((lt - p.t) / p.d));
        const k = 1 - e;
        n.style.opacity = lerp(p.o ?? 0, 1, e).toFixed(4);
        n.style.translate = `${((p.x || 0) * k).toFixed(2)}px ${((p.y || 0) * k).toFixed(2)}px`;
        if (p.s) n.style.scale = lerp(p.s, 1, e).toFixed(4);
        if (p.r) n.style.transform = `rotate(${(p.r * k).toFixed(3)}deg)`;
      }
      for (const { n, p } of draws) n.style.strokeDashoffset = (1 - inOutCubic(clamp((lt - p.t) / p.d))).toFixed(4);
    });
    let cur = 0;
    scenes.forEach(({ sc }, i) => { if (t >= sc.start - T.exit) cur = i; });
    const a = poses[T.scenes[Math.max(0, cur - 1)].id], b = poses[T.scenes[cur].id];
    const e = cur === 0 ? 1 : inOutCubic(clamp((t - (T.scenes[cur].start - T.exit)) / 1.6));
    const [x, y, s, r] = b.map((v, j) => lerp(a[j], v, e));
    blob.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg) scale(${s.toFixed(4)})`;
    blob.style.opacity = outCubic(clamp(t / 0.8)).toFixed(4);
  }

  window.__seek = t => { mount(); frame(t); return document.fonts.ready; };
  window.__ready = Promise.all(['400 24px Rubik', '500 100px Rubik', '550 150px Rubik'].map(f => document.fonts.load(f)))
    .then(() => document.fonts.ready).then(() => window.__seek(0));
  // Opening film.html directly in a browser shows a scrubber-free preview at ?t=seconds.
  const q = new URLSearchParams(location.search).get('t');
  if (q !== null) window.__ready.then(() => window.__seek(parseFloat(q)));
})();
