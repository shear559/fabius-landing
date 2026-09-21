// Renders formats/*.svg with headless Chromium to exports/*.png, then cwebp to exports/*.webp.
// Usage: node product/tools/render.js
'use strict';
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT);
const ROOT = path.resolve(__dirname, '..');
const FORMATS = require('./formats.json');

(async () => {
  const browser = await chromium.launch();
  for (const F of FORMATS) {
    const page = await browser.newPage({ viewport: { width: F.w, height: F.h }, deviceScaleFactor: 1 });
    await page.goto('file://' + path.join(ROOT, 'formats', `${F.id}.svg`));
    const fontOk = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('500 40px Rubik'); });
    const png = path.join(ROOT, 'exports', `lattice-${F.id}-${F.w}x${F.h}.png`);
    await page.screenshot({ path: png });
    const webp = png.replace(/\.png$/, '.webp');
    execFileSync('cwebp', ['-quiet', '-q', '92', png, '-o', webp]);
    console.log(`${F.id.padEnd(9)} ${F.w}x${F.h} font=${fontOk} png=${fs.statSync(png).size}B webp=${fs.statSync(webp).size}B`);
    await page.close();
  }
  // master preview for notes/evidence
  const page = await browser.newPage({ viewport: { width: 2400, height: 2400 }, deviceScaleFactor: 0.5 });
  await page.goto('file://' + path.join(ROOT, 'master.svg'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.resolve(ROOT, '..', 'out', 'master-preview.png') });
  await browser.close();
})();
