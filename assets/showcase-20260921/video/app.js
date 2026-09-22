(() => {
  'use strict';
  const F = window.FILM;
  const $ = s => document.querySelector(s);
  const video = $('#film'), cc = $('#cc'), ccState = $('#cc-state'), now = $('#now');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (!F || !video) return;

  const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const pad = n => String(n).padStart(2, '0');
  // Decimal units, as file managers and ffprobe report them: 1 MB = 1,000,000 bytes.
  const mb = b => (b / 1e6).toFixed(2) + ' MB';
  const kb = b => Math.round(b / 1e3) + ' kB';
  const num = n => ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n);
  const cap = w => w[0].toUpperCase() + w.slice(1);
  const secs = n => `${(+n).toFixed(1)} s`;
  const el = (tag, props = {}, kids = []) => {
    const n = Object.assign(document.createElement(tag), props);
    for (const k of kids) n.append(k);
    return n;
  };

  // Chapters: one button per scene; choosing one seeks the film.
  const buttons = F.scenes.map((s, i) => {
    const b = el('button', { type: 'button' }, [
      el('span', { className: 'num', textContent: pad(i + 1) }),
      el('span', {}, [el('span', { className: 'beat', textContent: s.beat }), el('strong', { textContent: s.title })]),
      el('time', { dateTime: `PT${s.start}S`, textContent: clock(s.start) })
    ]);
    b.setAttribute('aria-label', `Jump to ${clock(s.start)}: ${s.beat}, ${s.title}`);
    if (s.id === 'connect') { b.dataset.tourStep = '2'; b.dataset.tourAction = 'click'; }
    b.addEventListener('click', () => {
      video.currentTime = s.start + 0.01;
      // A deliberate choice starts playback, unless the reader prefers still pictures.
      if (!reduce.matches) video.play().catch(() => {});
      paint(i);
    });
    $('#chapter-list').append(el('li', {}, [b]));
    return b;
  });

  // Storyboard strip.
  F.scenes.forEach((s, i) => {
    const img = el('img', { src: s.thumb, alt: `Scene ${i + 1} key frame: ${s.lines.join(' ')}`, width: 640, height: 360, loading: 'lazy', decoding: 'async' });
    $('#strip').append(el('li', {}, [el('figure', {}, [img, el('figcaption', {}, [
      el('span', { className: 'beat', textContent: `${pad(i + 1)} · ${s.beat}` }),
      el('b', { textContent: s.title }),
      el('span', { className: 'lines', textContent: s.lines.slice(1).join(' ') })
    ])])]));
  });

  $('#storyboard-title').textContent = `${cap(num(F.scenes.length))} frames, one line of thought.`;

  // How it was made. Every number below is what render.js read back from the files it wrote.
  const lineCount = F.scenes.reduce((a, s) => a + s.lines.length, 0);
  const R = F.reading, holds = R.scenes.slice(0, -1).map(s => s.hold), endHold = R.scenes[R.scenes.length - 1].hold;
  const lows = F.contrast.filter(c => c.kind === 'body'), heads = F.contrast.filter(c => c.kind === 'headline');
  const min = (rows, k) => Math.min(...rows.map(r => r[k]));
  const steps = [
    ['Script', `${F.scenes.length} scenes`, `${lineCount} on-screen lines, each one taken from the Lattice site. One file drives scenes, captions and chapters.`],
    ['Timing', `${secs(F.mp4.duration)}`, `Paced for reading at ${R.wordsPerSecond * 60} words a minute. Every scene holds at least ${Math.min(...holds).toFixed(1)} s after its last line is read; the end card holds ${endHold.toFixed(1)} s, complete.`],
    ['Storyboard', `${F.scenes.length} key frames`, `Thumbnails pulled from the lossless master: ${kb(F.thumbBytes)} in total, plus a ${kb(F.posterBytes)} poster.`],
    ['Scenes', 'HTML · CSS · SVG', 'The site’s colours, Rubik, grain and Phosphor icons. No CSS animation and no clock: each frame is drawn from its time alone, in a page of its own.'],
    ['Render', `${F.mp4.frames} frames`, `${F.mp4.width}×${F.mp4.height} at ${F.mp4.fps} fps, captured in Chromium in ${Math.round(F.captureSeconds)} s.${F.verified ? ` ${F.verified.identical} of ${F.verified.sampled} re-captured frames hash identically.` : ''}`],
    ['Encode', `${mb(F.mp4.bytes)}`, `MP4 (H.264, ${F.mp4.pixFmt}, Rec. 709 matrix, faststart). The VP9 WebM is ${mb(F.webm.bytes)}. Both from a lossless master; ${F.cues} caption cues.`]
  ];
  steps.forEach(([name, figure, text], i) => $('#pipeline').append(el('li', {}, [
    el('span', { className: 'step', textContent: `Step ${pad(i + 1)}` }),
    el('h3', { textContent: name }),
    el('span', { className: 'figure', textContent: figure }),
    el('p', { textContent: text })
  ])));

  // Contrast of every line, measured on the rendered frames.
  $('#contrast-summary').textContent = `All ${F.contrast.filter(c => c.pass).length} of ${F.contrast.length} lines pass. Body-size lines need 4.5:1 and reach at least ${min(lows, 'median').toFixed(2)}:1; headlines need 3:1 and reach at least ${min(heads, 'median').toFixed(2)}:1.`;
  const ratio = v => `${v.toFixed(2)}:1`;
  for (const c of F.contrast) {
    const scene = F.scenes.find(s => s.id === c.scene);
    $('#contrast-rows').append(el('tr', {}, [
      el('th', { scope: 'row' }, [el('span', { className: 'scene', textContent: scene.title }), el('span', { textContent: c.text })]),
      el('td', { textContent: `${c.px} px` }),
      el('td', {}, [el('b', { textContent: ratio(c.median) })]),
      el('td', { textContent: ratio(c.p5) }),
      el('td', { textContent: c.mp4 ? ratio(c.mp4) : '—' }),
      el('td', { textContent: `${c.need}:1 ${c.pass ? '✓' : '✗'}` })
    ]));
  }

  // Captions: on by default, one toggle. The film is silent and shows every word itself, so the
  // captions describe the picture instead of repeating it. The page draws the current cue itself, in a
  // strip under the picture: native caption rendering is placed differently by every engine and lands
  // on the film's text or under the native controls, so no caption track is handed to the video.
  const caption = $('#caption'), captionText = $('#caption-text');
  const cueAt = t => F.captions.find(c => t >= c.start && t < c.end) || (t >= F.duration ? F.captions[F.captions.length - 1] : null);
  let shown = null;
  function drawCaption() {
    const c = cueAt(video.currentTime);
    if (c === shown) return;
    shown = c;
    captionText.textContent = c ? c.text : '';
  }
  function setCaptions(on) {
    caption.hidden = !on;
    cc.setAttribute('aria-pressed', String(on));
    ccState.textContent = on ? 'on' : 'off';
  }
  cc.addEventListener('click', () => setCaptions(cc.getAttribute('aria-pressed') !== 'true'));
  // timeupdate alone runs at about 4 Hz; while playing, follow the frames so a cue changes with its scene.
  let raf = 0;
  const follow = () => { drawCaption(); raf = video.paused ? 0 : requestAnimationFrame(follow); };
  video.addEventListener('play', () => { if (!raf) raf = requestAnimationFrame(follow); });
  for (const e of ['timeupdate', 'seeking', 'seeked', 'loadedmetadata', 'emptied']) video.addEventListener(e, drawCaption);
  setCaptions(true);
  drawCaption();
  // Chapters stay available to the browser's own menu; an opaque-origin sandbox would refuse the file.
  if (window.origin !== 'null') video.append(el('track', { kind: 'chapters', src: 'chapters.vtt', srclang: 'en', label: 'Chapters' }));

  // Mark the scene that is playing.
  let current = -1;
  function paint(i) {
    if (i === current) return;
    current = i;
    buttons.forEach((b, j) => (j === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
    now.textContent = `Scene ${i + 1} of ${F.scenes.length} · ${F.scenes[i].title}`;
  }
  const sceneAt = t => Math.max(0, F.scenes.findLastIndex(s => t >= s.start - 0.001));
  video.addEventListener('timeupdate', () => paint(sceneAt(video.currentTime)));
  video.addEventListener('seeked', () => paint(sceneAt(video.currentTime)));
  paint(0);
})();
