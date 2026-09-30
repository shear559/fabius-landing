// Run: PLAYWRIGHT_MODULE=/path/to/playwright/index.js node browser.mjs <origin> <output-dir>
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const { default: pw } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.argv[2] || 'http://127.0.0.1:8814';
const output = path.resolve(process.argv[3] || 'browser-results');
await mkdir(output, { recursive: true });
const report = { origin, date: new Date().toISOString(), runs: [], limitations: 'Automated Chromium and WebKit on macOS; no physical phone. Synthetic fixtures, no live security audit, cloud deployment or model calls.' };
async function exact(locator, expected) { assert.equal((await locator.textContent()).trim(), expected); }
async function settle(page, selector, value) { await page.locator(selector).filter({hasText:value}).waitFor({state:"attached"}); }
for (const engine of (process.env.ENGINES || 'chromium,webkit').split(',')) {
 const browser = await pw[engine].launch({headless:true});
 try {
  for (const width of (process.env.WIDTHS || '390,1440').split(',').map(Number)) {
   // Fresh isolated contexts avoid stale workers. Playwright's block hook itself throws in opaque-origin frames.
   const context = await browser.newContext({viewport:{width,height:900}, deviceScaleFactor:width===390?2:1, isMobile:width===390, reducedMotion:'reduce'});
   const page = await context.newPage();
   const errors=[]; const failed=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
   page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
   const checkLayout=async label=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' overflow');};
   await page.goto(origin+'/assets/showcase-20260930/security/preview.html');
   await exact(page.locator('#result-heading'),'Allowed.');
   await page.locator('#scenario').selectOption('admin');
   await exact(page.locator('#result-heading'),'Denied.');
   await page.locator('#mfa').check();
   await exact(page.locator('#result-heading'),'Allowed.');
   await page.locator('#scenario').selectOption('guest');
   await exact(page.locator('#result-heading'),'Denied.');
   await page.locator('#reset').click();
   await checkLayout('security');
   await page.screenshot({path:path.join(output,`${engine}-${width}-security.png`)});
   await page.goto(origin+'/assets/showcase-20260930/architecture/preview.html');
   await page.locator('#run-job').click(); await page.locator('#next-event').click();
   await page.locator('#worker-toggle').click();
   await exact(page.locator('#job-status'),'Waiting'); await exact(page.locator('#queue-count'),'1');
   await page.locator('#worker-toggle').click(); await page.locator('#next-event').click(); await page.locator('#next-event').click();
   await page.locator('#replay-request').click();
   await exact(page.locator('#job-status'),'Completed'); await exact(page.locator('#output-count'),'1'); await exact(page.locator('#attempt-count'),'2');
   await exact(page.locator('#replay-count'),'1 replay');
   await checkLayout('architecture');
   await page.screenshot({path:path.join(output,`${engine}-${width}-architecture.png`)});
   await page.goto(origin+'/assets/showcase-20260930/swarm/preview.html');
   await page.locator('#fault-button').click(); await page.locator('#run-button').click();
   await settle(page,'#completed-count','1/4'); await page.locator('#run-button').click();
   await page.locator('[data-task="engineer"][data-status="failed"]').waitFor();
   assert.equal(await page.locator('[data-task="reviewer"]').getAttribute('data-status'),'blocked');
   await exact(page.locator('#completed-count'),'2/4'); await page.locator('#retry-button').click();
   await settle(page,'#completed-count','3/4'); await page.locator('#run-button').click();
   await settle(page,'#completed-count','4/4'); assert.match(await page.locator('#artifact-content').textContent(),/The launch handoff is ready/);
   await page.locator('#reset-button').click(); await page.locator('#run-button').click(); await page.locator('#reset-button').click();
   await page.waitForTimeout(1700); await exact(page.locator('#completed-count'),'0/4');
   assert.equal(await page.locator('#retry-button').evaluate(el=>getComputedStyle(el).display),'none');
   await checkLayout('swarm');
   await page.screenshot({path:path.join(output,`${engine}-${width}-swarm.png`)});
   await page.goto(origin+'/');
   const tabs=page.locator('[data-show-task]'); assert.equal(await tabs.count(),9);
   for(const name of ['website','app','math','video','image','biology','security','architecture','swarm']) {
    await page.locator(`[data-show-task="${name}"]`).click();
    await page.locator('[data-show-screen] iframe[data-ready="true"]').waitFor();
    const frame=page.frameLocator('[data-show-screen] iframe'); await frame.locator('h1').first().waitFor();
    assert.equal(await page.locator(`[data-show-task="${name}"]`).getAttribute('aria-selected'),'true');
    if(['security','architecture','swarm'].includes(name)){
     await page.locator('[data-show-play]').click();
     const count=name==='security'?5:6;
     for(let i=1;i<count;i++){if(name==='swarm')await page.waitForTimeout(1750);await page.locator('[data-show-play]').click();}
     if(name==='security')await exact(frame.locator('#result-heading'),'Allowed.');
     if(name==='architecture')await exact(frame.locator('#output-count'),'1');
     if(name==='swarm')await settle(frame,'#completed-count','4/4');
    }
   }
   await page.locator('[data-show-expand]').click();
   await page.locator('[data-show-zoom][open]').waitFor();
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('[data-show-zoom]').evaluate(el=>el.open),false);
   assert.equal(await page.locator('[data-show-expand]').evaluate(el=>el===document.activeElement),true);
   await page.locator('[data-show-task="swarm"]').focus(); await page.keyboard.press('Home');
   assert.equal(await page.locator('[data-show-task="website"]').getAttribute('aria-selected'),'true');
   await page.keyboard.press('End'); assert.equal(await page.locator('[data-show-task="swarm"]').getAttribute('aria-selected'),'true');
   await checkLayout('gallery');
   await page.locator('#trials').screenshot({path:path.join(output,`${engine}-${width}-gallery.png`)});
   await page.goto(origin+'/'); await page.screenshot({path:path.join(output,`${engine}-${width}-hero.png`)});
   assert.deepEqual(errors,[],`${engine} console errors`); assert.deepEqual(failed,[],`${engine} HTTP errors`);
   report.runs.push({engine,width,mobile:width===390,deviceScaleFactor:width===390?2:1,passed:true,checks:['policy allow/deny/MFA','queue interruption/recovery/replay','agent failure/dependency/retry/handoff','reset cancels pending completions','nine gallery tabs','three complete tours','dialog escape and focus','keyboard tab navigation','no horizontal overflow','no console or HTTP errors']});
   await context.close();
  }
 }finally{await browser.close();}
}
await writeFile(path.join(output,'browser-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
