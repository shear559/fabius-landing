// Measures WCAG contrast of every text layer against the rendered pixels behind it,
// and checks that every text layer sits inside its format's safe area.
//
// Method, per format:
//   1. Load formats/<id>.svg in headless Chromium at its true size, fonts loaded.
//   2. Read each text layer's box (getBoundingClientRect: full ascent-to-descent box) and fill.
//   3. Hide the type group and screenshot: these are the actual pixels behind the text.
//   4. For every pixel in each box, compute the WCAG 2.x ratio between the fill and that pixel.
//      The layer's score is the minimum over its box (worst pixel), not an average.
//   5. Threshold: 3:1 for large text (>= 24 px, or >= 18.66 px bold), else 4.5:1.
// Also checks the export PNG/WebP exist at the right size and the export matches the SVG render.
// Usage, from the studio folder root: node measure/measure.js
//   -> measure/contrast-report.json and measure/contrast-report.md
// Add --renders to keep the intermediate screenshots in measure/renders/{full,bg}-<id>.png;
// without it they go to a temporary folder that is deleted at the end.
'use strict';
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT);
const ROOT = path.resolve(__dirname, '..');
const FORMATS = require('../tools/formats.json');

const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lumRGB = (r, g, b) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const rawRGB = (file) => execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
const probe = (file) => execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]).toString().trim();

(async () => {
  const browser = await chromium.launch();
  const keep = process.argv.includes('--renders');
  const outDir = keep ? path.join(ROOT, 'measure', 'renders') : fs.mkdtempSync(path.join(require('os').tmpdir(), 'lattice-measure-'));
  fs.mkdirSync(outDir, { recursive: true });
  const report = { method: 'worst pixel in each text layer box vs. the same render with type hidden; WCAG 2.x relative luminance', formats: [] };

  for (const F of FORMATS) {
    const page = await browser.newPage({ viewport: { width: F.w, height: F.h }, deviceScaleFactor: 1 });
    await page.goto('file://' + path.join(ROOT, 'formats', `${F.id}.svg`));
    await page.evaluate(() => document.fonts.ready);
    const layers = await page.evaluate(() => [...document.querySelectorAll('text.tx')].map((el) => {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return { layer: el.dataset.layer, text: el.textContent, x: r.x, y: r.y, w: r.width, h: r.height, fill: cs.fill, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10) };
    }));
    const fullPng = path.join(outDir, `full-${F.id}.png`);
    await page.screenshot({ path: fullPng });
    await page.evaluate(() => { document.getElementById('type').style.visibility = 'hidden'; });
    const bgPng = path.join(outDir, `bg-${F.id}.png`);
    await page.screenshot({ path: bgPng });
    await page.close();

    const bg = rawRGB(bgPng);
    const results = layers.map((L) => {
      const [r, g, b] = L.fill.match(/\d+/g).map(Number);
      const fl = lumRGB(r, g, b);
      const x0 = Math.max(0, Math.floor(L.x)), y0 = Math.max(0, Math.floor(L.y));
      const x1 = Math.min(F.w, Math.ceil(L.x + L.w)), y1 = Math.min(F.h, Math.ceil(L.y + L.h));
      let min = Infinity, n = 0, worst = null;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * F.w + x) * 3; const c = ratio(fl, lumRGB(bg[i], bg[i + 1], bg[i + 2])); n++;
        if (c < min) { min = c; worst = [x, y, bg[i], bg[i + 1], bg[i + 2]]; }
      }
      const large = L.size >= 24 || (L.size >= 18.66 && L.weight >= 700);
      const need = large ? 3 : 4.5;
      const inSafe = L.x >= F.safe.x - 0.5 && L.y >= F.safe.y - 0.5 && L.x + L.w <= F.w - F.safe.x + 0.5 && L.y + L.h <= F.h - F.safe.y + 0.5;
      return { layer: L.layer, text: L.text, fill: L.fill, size: L.size, weight: L.weight, box: [L.x, L.y, L.w, L.h].map((v) => +v.toFixed(1)), pixels: n, min: +min.toFixed(2), worstPixel: worst, need, pass: min >= need, inSafe };
    });

    // Export integrity: sizes, and the export PNG equals a fresh render (same pixels).
    const png = path.join(ROOT, 'exports', `lattice-${F.id}-${F.w}x${F.h}.png`);
    const webp = png.replace(/\.png$/, '.webp');
    const a = rawRGB(png), b = rawRGB(fullPng);
    let diff = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
    const low = results.reduce((m, r) => (r.min < m.min ? r : m));
    // The lowest ratio per threshold class, so every reported ratio travels with the bar it must clear.
    const worst = (need) => { const rs = results.filter((r) => r.need === need); if (!rs.length) return null; const w = rs.reduce((m, r) => (r.min < m.min ? r : m)); return { min: w.min, layer: w.layer, size: w.size, need }; };
    report.formats.push({
      id: F.id, size: `${F.w}x${F.h}`, safe: F.safe, png: probe(png), webp: probe(webp), exportMatchesRender: diff === 0,
      lowest: low.min, lowestLayer: low.layer, lowestSize: low.size, lowestNeed: low.need, lowestLarge: worst(3), lowestBody: worst(4.5), pass: results.every((r) => r.pass), safeOk: results.every((r) => r.inSafe), layers: results,
    });
  }
  await browser.close();
  if (!keep) fs.rmSync(outDir, { recursive: true, force: true });

  fs.writeFileSync(path.join(__dirname, 'contrast-report.json'), JSON.stringify(report, null, 2));
  const md = ['# Contrast and safe-area report', '', report.method + '.', '',
    'Thresholds (WCAG 2.x AA): large text (>= 24 px, or >= 18.66 px bold) needs 3:1; body text needs 4.5:1.', '',
    '| Format | Size | Text layers | Lowest large text (needs 3:1) | Lowest body text (needs 4.5:1) | AA | In safe area | PNG / WebP size | Export = render |', '|---|---|---|---|---|---|---|---|---|',
    ...report.formats.map((f) => `| ${f.id} | ${f.size} | ${f.layers.length} | ${f.lowestLarge ? `${f.lowestLarge.min.toFixed(2)}:1 (${f.lowestLarge.layer}, ${f.lowestLarge.size} px)` : '—'} | ${f.lowestBody ? `${f.lowestBody.min.toFixed(2)}:1 (${f.lowestBody.layer}, ${f.lowestBody.size} px)` : '—'} | ${f.pass ? 'pass' : 'FAIL'} | ${f.safeOk ? 'yes' : 'NO'} | ${f.png} / ${f.webp} | ${f.exportMatchesRender ? 'yes' : 'no'} |`),
    '', '## Every layer', '', '| Format | Layer | Text | px | Needs | Worst-pixel ratio | Safe |', '|---|---|---|---|---|---|---|',
    ...report.formats.flatMap((f) => f.layers.map((l) => `| ${f.id} | ${l.layer} | ${l.text} | ${l.size} | ${l.need}:1 | ${l.min.toFixed(2)}:1 ${l.pass ? '' : 'FAIL'} | ${l.inSafe ? 'yes' : 'NO'} |`)), ''];
  fs.writeFileSync(path.join(__dirname, 'contrast-report.md'), md.join('\n'));
  for (const f of report.formats) console.log(`${f.id.padEnd(9)} ${f.size.padEnd(9)} layers=${String(f.layers.length).padEnd(2)} lowest=${f.lowest.toFixed(2)}:1 (${f.lowestLayer}, ${f.lowestSize}px, needs ${f.lowestNeed}:1) body-lowest=${f.lowestBody ? f.lowestBody.min.toFixed(2) + ':1 (needs 4.5:1)' : 'none'} AA=${f.pass ? 'pass' : 'FAIL'} safe=${f.safeOk ? 'ok' : 'OUT'} png=${f.png} webp=${f.webp} export=render:${f.exportMatchesRender}`);
  const bad = report.formats.flatMap((f) => f.layers.filter((l) => !l.pass || !l.inSafe).map((l) => `${f.id}/${l.layer} "${l.text}" min=${l.min} need=${l.need} safe=${l.inSafe} worst=${JSON.stringify(l.worstPixel)} box=${l.box}`));
  if (bad.length) { console.log('PROBLEMS:\n' + bad.join('\n')); process.exitCode = 1; }
})();
