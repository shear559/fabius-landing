#!/usr/bin/env node
/* Caption placement test for the player page. Run from the folder that holds index.html:
     node source/tests/captions-test.js            screenshots go to $TMPDIR/lattice-captions
     SHOTS=some/dir node source/tests/captions-test.js
     BROWSER=webkit node source/tests/captions-test.js   one engine only
   Serves the page with the target Content-Security-Policy inside a sandboxed iframe, in Chromium (opaque
   and same-origin sandbox) and WebKit, at 390, 1280 and 1440 px. At the start, middle and end of every
   scene, once paused and once playing with the native controls shown (pointer over the video), it
   checks that the page's caption strip shows the cue for the current time, lies wholly outside the
   video box (so it can cover neither the film nor the native controls), fits its text, sits in the
   viewport and meets 4.5:1 contrast. Each case is screenshotted.
   Needs Playwright (require(process.env.PLAYWRIGHT) or 'playwright') with Chromium and WebKit. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium, webkit } = require(process.env.PLAYWRIGHT || 'playwright');
const ROOT = path.resolve(__dirname, '../..');
const SHOTS = path.resolve(process.env.SHOTS || path.join(os.tmpdir(), 'lattice-captions'));
const T = require(path.join(ROOT, 'source/scenes/timeline.js'));
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'none'";
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webm': 'video/webm', '.mp4': 'video/mp4', '.vtt': 'text/vtt', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/host.html') {
    const sb = new URL(req.url, 'http://x').searchParams.get('sb');
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(`<!doctype html><body style="margin:0"><iframe id=f sandbox="${sb}" src="/index.html" style="border:0;width:100vw;height:100vh"></iframe>`);
  }
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  const st = fs.statSync(f), h = { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'content-security-policy': CSP, 'accept-ranges': 'bytes' };
  const r = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (r) {
    const a = r[1] ? +r[1] : 0, b = r[2] ? +r[2] : st.size - 1;
    res.writeHead(206, { ...h, 'content-range': `bytes ${a}-${b}/${st.size}`, 'content-length': b - a + 1 });
    return fs.createReadStream(f, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { ...h, 'content-length': st.size });
  fs.createReadStream(f).pipe(res);
}).listen(0);

const cueAt = t => (T.scenes.find(s => t >= s.start && t < s.end) || T.scenes[T.scenes.length - 1]).caption.text;
const samples = T.scenes.flatMap(s => [['start', s.start + 0.1], ['middle', (s.start + s.end) / 2], ['end', Math.min(s.end, T.duration) - 0.1]]
  .map(([phase, t]) => ({ scene: s.id, phase, t: +t.toFixed(2) })));

// Everything the checks need, read in one pass so time cannot move between the reads.
const measure = () => {
  const v = document.querySelector('#film'), c = document.querySelector('#caption'), txt = document.querySelector('#caption-text');
  const vr = v.getBoundingClientRect(), cr = c.getBoundingClientRect();
  const px = s => s.match(/[\d.]+/g).map(Number);
  const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const cs = getComputedStyle(c), L1 = lum(px(cs.color)), L2 = lum(px(cs.backgroundColor));
  return { t: v.currentTime, paused: v.paused, error: v.error && `media error ${v.error.code}`, src: v.currentSrc.split('/').pop(), hidden: c.hidden, text: txt.textContent,
    video: { top: vr.top, bottom: vr.bottom, left: vr.left, right: vr.right }, cap: { top: cr.top, bottom: cr.bottom, left: cr.left, right: cr.right, height: cr.height },
    fits: c.scrollWidth <= c.clientWidth && c.scrollHeight <= c.clientHeight, vh: innerHeight, contrast: (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) };
};

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const lines = [];
  let pass = 0, fail = 0;
  const check = (tag, m, want) => {
    const problems = [];
    if (m.hidden || m.cap.height < 1) problems.push('caption not shown');
    if (m.text !== want) problems.push(`text "${m.text}", expected "${want}"`);
    if (m.cap.top < m.video.bottom - 0.5) problems.push(`strip top ${m.cap.top.toFixed(1)} is above the video bottom ${m.video.bottom.toFixed(1)}`);
    if (m.cap.left < m.video.left - 0.5 || m.cap.right > m.video.right + 0.5) problems.push('strip wider than the picture');
    if (!m.fits) problems.push('text overflows the strip');
    if (m.cap.top < 0 || m.cap.bottom > m.vh) problems.push('strip outside the viewport');
    if (m.contrast < 4.5) problems.push(`contrast ${m.contrast.toFixed(2)}:1`);
    // A failed video would leave no native controls or picture to collide with, so it fails the case too.
    if (m.error) problems.push(`${m.error} on ${m.src}`);
    problems.length ? fail++ : pass++;
    lines.push(`${problems.length ? 'FAIL' : 'PASS'}  ${tag} t=${m.t.toFixed(2)}${m.paused ? ' paused' : ' playing'}: "${m.text}", ` +
      `strip ${Math.round(m.cap.top - m.video.bottom)} px below the picture, ${Math.round(m.cap.height)} px tall, ${m.contrast.toFixed(1)}:1` +
      (problems.length ? ' — ' + problems.join('; ') : ''));
  };
  for (const [bname, btype] of [['chromium', chromium], ['webkit', webkit]].filter(([n]) => !process.env.BROWSER || n === process.env.BROWSER)) {
    const browser = await btype.launch();
    // Opaque-origin WebKit refuses every 'self' resource under this CSP, so WebKit runs with allow-same-origin only.
    for (const sb of bname === 'chromium' ? ['allow-scripts', 'allow-scripts allow-same-origin'] : ['allow-scripts allow-same-origin']) {
      for (const width of [390, 1280, 1440]) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await ctx.newPage();
        await page.goto(`http://127.0.0.1:${server.address().port}/host.html?sb=${encodeURIComponent(sb)}`);
        const fr = await (await page.waitForSelector('#f')).contentFrame();
        await fr.waitForFunction(() => document.querySelector('#film').readyState >= 1, null, { timeout: 20000 });
        const origin = sb.includes('same') ? 'so' : 'opaque', base = `${bname}-${origin}-${width}`;
        const tag0 = `${bname} ${width}px [${sb}]`;
        await fr.evaluate(() => { const v = document.querySelector('#film'); v.muted = true; v.preload = 'auto'; document.querySelector('.screen').scrollIntoView({ block: 'center', behavior: 'instant' }); });
        await page.waitForTimeout(200);
        const vid = await fr.$('#film'), box = await vid.boundingBox();
        // A clipped page capture: an element capture waits for the playing video to be "stable".
        const clip = await (await fr.$('.screen')).boundingBox();
        const shot = async file => {
          for (let i = 0; ; i++) {
            try { return await page.screenshot({ path: path.join(SHOTS, file), clip, timeout: 20000 }); }
            catch (e) { if (i === 2) throw e; }
          }
        };
        const hover = () => page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.4);
        // First load, before anything is touched.
        await hover();
        await page.waitForTimeout(300);
        check(`${tag0} first load`, await fr.evaluate(measure), cueAt(0));
        await shot(`${base}-first-load.png`);
        for (const s of samples) {
          const tag = `${tag0} ${s.scene} ${s.phase}`;
          // Paused: every engine shows its native controls.
          await fr.evaluate(async t => {
            const v = document.querySelector('#film'); v.pause();
            if (Math.abs(v.currentTime - t) > 0.001) { const p = new Promise(r => v.addEventListener('seeked', r, { once: true })); v.currentTime = t; await p; }
          }, s.t);
          await hover();
          await page.waitForTimeout(250);
          const m = await fr.evaluate(measure);
          check(`${tag} paused`, m, cueAt(m.t));
          await shot(`${base}-${s.scene}-${s.phase}-paused.png`);
          // Playing, pointer over the video so the native controls show.
          await fr.evaluate(async t => {
            const v = document.querySelector('#film');
            const p = new Promise(r => v.addEventListener('seeked', r, { once: true })); v.currentTime = Math.max(0, t - 0.3); await p;
            await v.play();
          }, s.t);
          await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height * 0.4 + 5);
          await page.waitForTimeout(250);
          const q = await fr.evaluate(measure);
          await shot(`${base}-${s.scene}-${s.phase}-playing.png`);
          check(`${tag} playing`, q, cueAt(q.t));
        }
        await ctx.close();
      }
    }
    await browser.close();
  }
  console.log(lines.join('\n'));
  console.log(`${pass}/${pass + fail} caption checks passed; screenshots in ${SHOTS}`);
  server.close();
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); server.close(); process.exit(1); });
