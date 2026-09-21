#!/usr/bin/env node
/* Render the Lattice launch film.
   node product/source/render.js              capture every frame, then encode everything
   node product/source/render.js --encode     re-encode from the existing lossless master
   node product/source/render.js --verify 40  re-capture 40 evenly spaced frames and compare hashes
   node product/source/render.js --meta       rewrite captions, chapters, contrast and film-data.js only
   Needs: Playwright (require(process.env.PLAYWRIGHT) or 'playwright'), ffmpeg, cwebp. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const T = require('./scenes/timeline.js');
const { measure, table } = require('./contrast.js');
const { timing } = require('./timing.js');

const SRC = __dirname, OUT = path.resolve(SRC, '..');
const BUILD = process.env.LATTICE_BUILD || path.join(os.tmpdir(), 'lattice-film-build');
const MASTER = path.join(BUILD, 'master.mkv');
const HASHES = path.join(SRC, 'frames.sha256');
const FRAMES = Math.round(T.duration * T.fps);
const WORKERS = 8;
const arg = process.argv.slice(2);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const ff = (...a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: 'inherit' });
const log = (...a) => console.log('[render]', ...a);

async function openPages(n) {
  // Software rasterising, fixed scale and no GPU keep pixels identical between runs.
  const browser = await chromium.launch({ args: ['--disable-gpu', '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });
  const pages = [];
  for (let i = 0; i < n; i++) {
    const page = await browser.newPage({ viewport: { width: T.width, height: T.height }, deviceScaleFactor: 1 });
    page.on('pageerror', e => { throw e; });
    await page.goto('file://' + path.join(SRC, 'scenes', 'film.html'));
    await page.evaluate(() => window.__ready);
    pages.push(page);
  }
  return { browser, pages };
}
const shot = async (page, f) => {
  await page.evaluate(t => window.__seek(t), f / T.fps);
  return page.screenshot({ type: 'png', animations: 'disabled', caret: 'hide' });
};

async function capture() {
  fs.mkdirSync(BUILD, { recursive: true });
  const enc = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(T.fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264rgb', '-qp', '0', '-preset', 'ultrafast', '-pix_fmt', 'rgb24', MASTER], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => enc.on('close', c => (c ? rej(new Error('ffmpeg ' + c)) : res())));
  const { browser, pages } = await openPages(WORKERS);
  const hashes = [];
  const t0 = Date.now();
  for (let f = 0; f < FRAMES; f += WORKERS) {
    const batch = await Promise.all(pages.map((p, i) => (f + i < FRAMES ? shot(p, f + i) : null)));
    for (const buf of batch) {
      if (!buf) continue;
      hashes.push(sha(buf));
      if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
    }
    if (f % 150 === 0) log(`frame ${f}/${FRAMES}`);
  }
  enc.stdin.end();
  await done;
  await browser.close();
  const secs = (Date.now() - t0) / 1000;
  fs.writeFileSync(HASHES, hashes.map((h, i) => `${h}  frame-${String(i).padStart(4, '0')}`).join('\n') + '\n');
  const all = sha(hashes.join('\n'));
  log(`captured ${FRAMES} frames in ${secs.toFixed(1)} s, film hash ${all.slice(0, 16)}`);
  return { captureSeconds: +secs.toFixed(1), filmHash: all };
}

async function verify(n) {
  const want = fs.readFileSync(HASHES, 'utf8').trim().split('\n').map(l => l.split('  ')[0]);
  const { browser, pages } = await openPages(1);
  let bad = 0;
  for (let k = 0; k < n; k++) {
    const f = Math.round((k * (FRAMES - 1)) / (n - 1));
    if (sha(await shot(pages[0], f)) !== want[f]) { bad++; log('MISMATCH frame', f); }
  }
  await browser.close();
  log(`verify: ${n - bad}/${n} re-captured frames identical to frames.sha256`);
  process.exitCode = bad ? 1 : 0;
  // Record the result next to the other render numbers so the page reports what was measured.
  const data = path.join(OUT, 'film-data.js');
  if (fs.existsSync(data)) {
    const txt = fs.readFileSync(data, 'utf8').replace(/,\n "verified": [^\n]*\n\};\n$/, '\n};\n');
    fs.writeFileSync(data, txt.replace(/\n\};\n$/, `,\n "verified": ${JSON.stringify({ identical: n - bad, sampled: n })}\n};\n`));
  }
}

const stamp = s => {
  const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
};

// Browsers stack simultaneous cues bottom-up, which reverses reading order. So each time a line
// appears, a new cue starts holding every line then on screen, top to bottom, until the next line
// or the end of the scene. A line arriving within MERGE seconds of the cue's start joins that cue
// instead, so no caption flashes up for a fraction of a second (an eyebrow and its headline arrive
// together).
const MERGE = 0.6;
function cueList() {
  return T.scenes.flatMap(s => {
    const groups = [];
    s.lines.forEach((l, i) => {
      const g = groups[groups.length - 1];
      if (g && l.at - g.start < MERGE) g.upto = i; else groups.push({ start: l.at, upto: i });
    });
    return groups.map((g, k) => ({
      start: g.start, end: k + 1 < groups.length ? groups[k + 1].start : s.end,
      text: s.lines.slice(0, g.upto + 1).map(x => x.text).join('\n'), beat: s.beat, scene: s.id
    }));
  });
}

function captions() {
  let vtt = 'WEBVTT\n\n', n = 0, beat = '';
  for (const c of cueList()) {
    const s = T.scenes.find(x => x.id === c.scene);
    if (c.beat !== beat) { beat = c.beat; vtt += `NOTE Beat: ${s.beat} — ${s.title} (${stamp(s.start)} to ${stamp(s.end)})\n\n`; }
    vtt += `${c.scene}-${++n}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n\n`;
  }
  fs.writeFileSync(path.join(OUT, 'captions.vtt'), vtt);
  let ch = 'WEBVTT\n\n';
  T.scenes.forEach((s, i) => { ch += `chapter-${i + 1}\n${stamp(s.start)} --> ${stamp(s.end)}\n${s.beat}: ${s.title}\n\n`; });
  fs.writeFileSync(path.join(OUT, 'chapters.vtt'), ch);
  return n;
}

function encode() {
  if (!fs.existsSync(MASTER)) throw new Error('No master at ' + MASTER + ' — run without --encode first.');
  const t0 = Date.now();
  // RGB to Rec. 709 limited range, tagged, so browsers decode the colours the scenes were drawn in.
  const yuv = 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p';
  const tags = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
  // H.264: film tuning + AQ keeps the grain, which is what dithers the gradients against banding.
  ff('-i', MASTER, '-vf', yuv, ...tags, '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-tune', 'film',
    '-x264-params', 'aq-mode=3:aq-strength=0.9:deblock=-1,-1', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', '-an', path.join(OUT, 'film.mp4'));
  // VP9, two passes at constrained quality.
  const vp9 = ['-i', MASTER, '-vf', yuv, ...tags, '-c:v', 'libvpx-vp9', '-b:v', '1400k', '-maxrate', '2200k', '-crf', '30',
    '-row-mt', '1', '-tile-columns', '2', '-deadline', 'good', '-cpu-used', '2', '-aq-mode', '0', '-an'];
  const pass = path.join(BUILD, 'vp9pass');
  ff(...vp9, '-pass', '1', '-passlogfile', pass, '-f', 'null', os.platform() === 'win32' ? 'NUL' : '/dev/null');
  ff(...vp9, '-pass', '2', '-passlogfile', pass, path.join(OUT, 'film.webm'));
  const encodeSeconds = +((Date.now() - t0) / 1000).toFixed(1);

  // Poster and storyboard thumbnails come straight from the lossless master.
  const still = (t, file, w, q) => {
    const png = path.join(BUILD, path.basename(file) + '.png');
    ff('-i', MASTER, '-vf', `select=eq(n\\,${Math.round(t * T.fps)}),scale=${w}:-1:flags=lanczos`, '-frames:v', '1', png);
    execFileSync('cwebp', ['-quiet', '-q', String(q), '-m', '6', png, '-o', file]);
  };
  const posterScene = T.scenes.find(s => s.id === 'notebook');
  still(posterScene.thumb, path.join(OUT, 'poster.webp'), 1920, 86);
  fs.mkdirSync(path.join(OUT, 'thumbs'), { recursive: true });
  T.scenes.forEach((s, i) => still(s.thumb, path.join(OUT, 'thumbs', `${i + 1}-${s.id}.webp`), 640, 82));
  return { encodeSeconds };
}

// Every number the page shows comes from the files themselves, read after they were written.
function probe(file) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries',
    'format=duration,size:stream=codec_name,pix_fmt,width,height,nb_read_frames,r_frame_rate,color_space', '-of', 'json', file]));
  const st = j.streams[0], [num, den] = st.r_frame_rate.split('/').map(Number);
  return { codec: st.codec_name, pixFmt: st.pix_fmt, colorSpace: st.color_space, width: st.width, height: st.height, fps: num / den,
    frames: +st.nb_read_frames, bytes: fs.statSync(file).size, duration: +(+j.format.duration).toFixed(3) };
}

// Contrast of every line at rest, on rendered frames, cross-checked on the decoded MP4.
async function contrast() {
  const { browser, pages } = await openPages(1);
  const mp4 = path.join(OUT, 'film.mp4');
  const decode = n => execFileSync('ffmpeg', ['-v', 'error', '-i', mp4, '-vf', `select=eq(n\\,${n}),scale=in_color_matrix=bt709:in_range=tv,format=rgb24`,
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
  const rows = await measure(pages[0], T, fs.existsSync(mp4) ? decode : null);
  await browser.close();
  console.log(table(rows));
  const failed = rows.filter(r => !r.pass).length;
  log(`contrast: ${rows.length - failed}/${rows.length} lines pass`);
  if (failed) process.exitCode = 1;
  return rows;
}

function writeData(stats, cues, contrastRows) {
  const size = f => fs.statSync(path.join(OUT, f)).size;
  const mp4 = probe(path.join(OUT, 'film.mp4'));
  const read = timing(T);
  const data = {
    fps: T.fps, width: T.width, height: T.height, duration: T.duration, frames: FRAMES, framesInMp4: mp4.frames,
    scenes: T.scenes.map((s, i) => ({ id: s.id, title: s.title, beat: s.beat, start: s.start, end: s.end, thumb: `thumbs/${i + 1}-${s.id}.webp`, lines: s.lines.map(l => l.text) })),
    cues, captions: cueList().map(({ start, end, text }) => ({ start, end, text })), mp4, webm: probe(path.join(OUT, 'film.webm')),
    contrast: contrastRows.map(({ scene, text, px, weight, kind, need, median, p5, encoded, pass }) => ({ scene, text, px, weight, kind, need, median, p5, mp4: encoded && encoded.median, mp4p5: encoded && encoded.p5, pass })),
    reading: { ...T.reading, scenes: read.map(({ scene, length, hold, holdNeeded, pass }) => ({ scene, length, hold, holdNeeded, pass })) },
    posterBytes: size('poster.webp'), thumbBytes: T.scenes.reduce((a, s, i) => a + size(`thumbs/${i + 1}-${s.id}.webp`), 0),
    masterBytes: fs.statSync(MASTER).size, ...stats, renderedOn: 'Chromium (Playwright), software raster, ' + WORKERS + ' pages'
  };
  fs.writeFileSync(path.join(OUT, 'film-data.js'), '/* Generated by source/render.js — do not edit. */\nwindow.FILM = ' + JSON.stringify(data, null, 1) + ';\n');
  const mb = n => `${n} bytes (${(n / 1e6).toFixed(2)} MB)`;
  log(`mp4 ${mb(data.mp4.bytes)}; webm ${mb(data.webm.bytes)}; poster ${data.posterBytes} bytes`);
  for (const k of ['mp4', 'webm']) if (data[k].bytes > 6e6) { log(`FAIL ${k} over 6 MB`); process.exitCode = 1; }
  for (const r of read) if (!r.pass) { log(`FAIL ${r.scene}: holds ${r.hold} s after reading, needs ${r.holdNeeded} s`); process.exitCode = 1; }
}

(async () => {
  if (arg[0] === '--verify') return verify(parseInt(arg[1] || '30', 10));
  let stats = {};
  const prev = path.join(OUT, 'film-data.js');
  if (arg[0] === '--meta') {
    const old = JSON.parse(fs.readFileSync(prev, 'utf8').replace(/^[^]*?window\.FILM = /, '').replace(/;\s*$/, ''));
    const cues = captions();
    writeData({ captureSeconds: old.captureSeconds, filmHash: old.filmHash, encodeSeconds: old.encodeSeconds }, cues, await contrast());
    return;
  }
  if (arg[0] === '--encode' && fs.existsSync(prev)) {
    const m = fs.readFileSync(prev, 'utf8').match(/"captureSeconds": ([\d.]+),\s*"filmHash": "(\w+)"/);
    if (m) stats = { captureSeconds: +m[1], filmHash: m[2] };
  } else stats = await capture();
  const cues = captions();
  Object.assign(stats, encode());
  writeData(stats, cues, await contrast());
})().catch(e => { console.error(e); process.exit(1); });
