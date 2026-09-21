/* Measure the contrast of every on-screen line of the film at rest, on rendered pixels.
   For each line: capture the frame, capture it again with only that line's glyphs made transparent,
   and compare. Pixels the text fully covers (the glyph cores) give the text colour as rendered; the
   second capture gives the exact pixels behind them. The ratio is WCAG's (L1 + .05) / (L2 + .05). */
'use strict';
const { execFileSync } = require('child_process');

const lum = (r, g, b) => {
  const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const raw = png => execFileSync('ffmpeg', ['-v', 'error', '-i', '-', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { input: png, maxBuffer: 1 << 28 });
const pct = (arr, p) => { const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };

// Resting time of a scene: every line has finished its entrance and the exit has not begun.
const restTime = (T, sc, i) => {
  const last = i === T.scenes.length - 1;
  return +(last ? T.duration - 1 / T.fps : sc.end - (T.exit ?? 0.4) - 1 / T.fps).toFixed(4);
};

async function measure(page, T, decodeFrame) {
  const rows = [];
  for (const [i, sc] of T.scenes.entries()) {
    const t = restTime(T, sc, i);
    for (const [j, line] of sc.lines.entries()) {
      if (line.at + (T.lineIn ?? 0.8) > t + 1e-6) throw new Error(`${line.text} not at rest by ${t}`);
      const id = `${sc.id}-${j}`;
      const box = async hide => {
        await page.evaluate(t => window.__seek(t), t);
        return page.evaluate(([id, hide]) => {
          const el = document.querySelector(`[data-line="${id}"]`);
          const r = document.createRange(); r.selectNodeContents(el);
          const b = r.getBoundingClientRect();
          if (hide) el.style.color = 'transparent';
          const cs = getComputedStyle(el);
          return { x: Math.floor(b.left), y: Math.floor(b.top), w: Math.ceil(b.width) + 1, h: Math.ceil(b.height) + 1, size: parseFloat(cs.fontSize), weight: +cs.fontWeight, color: cs.color };
        }, [id, hide]);
      };
      const b = await box(false);
      const clip = { x: b.x, y: b.y, width: b.w, height: b.h };
      const A = raw(await page.screenshot({ clip, animations: 'disabled', caret: 'hide' }));
      await box(true);
      const B = raw(await page.screenshot({ clip, animations: 'disabled', caret: 'hide' }));
      const n = b.w * b.h, d = new Float64Array(n);
      for (let k = 0; k < n; k++) d[k] = Math.max(Math.abs(A[3 * k] - B[3 * k]), Math.abs(A[3 * k + 1] - B[3 * k + 1]), Math.abs(A[3 * k + 2] - B[3 * k + 2]));
      const cut = 0.85 * pct(d.filter(v => v > 0), 0.99);
      const core = []; for (let k = 0; k < n; k++) if (d[k] >= cut && d[k] > 8) core.push(k);
      const rs = core.map(k => ratio(lum(A[3 * k], A[3 * k + 1], A[3 * k + 2]), lum(B[3 * k], B[3 * k + 1], B[3 * k + 2])));
      let enc = null;
      if (decodeFrame) {
        const F = decodeFrame(Math.round(t * T.fps)), W = T.width;
        const e = core.map(k => { const x = b.x + (k % b.w), y = b.y + Math.floor(k / b.w), q = 3 * (y * W + x);
          return ratio(lum(F[q], F[q + 1], F[q + 2]), lum(B[3 * k], B[3 * k + 1], B[3 * k + 2])); });
        enc = { median: +pct(e, 0.5).toFixed(2), p5: +pct(e, 0.05).toFixed(2) };
      }
      const large = /title|brand/.test(line.role);
      const need = large ? 3 : 4.5;
      const p5 = +pct(rs, 0.05).toFixed(2);
      rows.push({ scene: sc.id, text: line.text, role: line.role, t, px: b.size, weight: b.weight, kind: large ? 'headline' : 'body',
        need, pixels: core.length, median: +pct(rs, 0.5).toFixed(2), p5, encoded: enc, pass: p5 >= need && (!enc || enc.p5 >= need) });
    }
  }
  return rows;
}

const table = rows => rows.map(r => `${r.pass ? 'PASS' : 'FAIL'}  ${String(r.median.toFixed(2)).padStart(5)}:1 (p5 ${r.p5.toFixed(2)}${r.encoded ? `, mp4 ${r.encoded.median.toFixed(2)}/${r.encoded.p5.toFixed(2)}` : ''})  need ${r.need}  ${r.px}px/${r.weight}  ${r.scene}: ${r.text}`).join('\n');
module.exports = { measure, table, restTime };
