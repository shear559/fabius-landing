import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import{fileURLToPath}from'node:url';
import{createRequire}from'node:module';
const require=createRequire(import.meta.url),{chromium,webkit}=require(process.env.PLAYWRIGHT||'playwright');
const root=path.dirname(fileURLToPath(import.meta.url)),out=process.env.MATH_QA_DIR||path.join(os.tmpdir(),'fabius-focused-math-qa');fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.json':'application/json','.md':'text/plain'};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain','Access-Control-Allow-Origin':'*','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'none'"});fs.createReadStream(file).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,results=[];let chrome,wk;
try{
 chrome=await chromium.launch({channel:'chrome',headless:true});wk=await webkit.launch({headless:true});
 for(const[browser,name,width]of[[chrome,'Chrome',390],[wk,'WebKit',390],[chrome,'Chrome',1440],[wk,'WebKit',1440]]){
  const context=await browser.newContext({viewport:{width,height:width===390?820:1000},deviceScaleFactor:width===390?2:1,isMobile:width===390,reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[],bad=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)bad.push({url:r.url(),status:r.status()});});await page.goto(origin+'/index.html');await page.waitForFunction(()=>window.__mathState);await page.evaluate(()=>document.fonts.ready);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));for(const selector of['#parameter','#parameter-entry','#regime-select']){const box=await page.locator(selector).boundingBox();assert(box.height>=44,selector+' target height is '+box.height);}
  const geometry=await page.locator('#geometry').boundingBox();assert(geometry.y<500);assert(await page.locator('#geometry').evaluate(el=>Math.abs(el.getScreenCTM().a-el.getScreenCTM().d)<1e-10));
  await page.screenshot({path:path.join(out,`${name}-${width}-first.png`)});await page.screenshot({path:path.join(out,`${name}-${width}-full.png`),fullPage:true});
  for(let regime=0;regime<6;regime++){await page.locator('#regime-select').selectOption(String(regime));const state=await page.evaluate(()=>window.__mathState());assert.equal(state.r,regime);assert(state.certified);for(const key of['x','y','z'])assert(Math.abs(Number(await page.locator('#'+key+'-value').textContent())-state[key])<=.00051);assert.equal(await page.locator('.slack-row[data-binding="true"]').count(),state.binding.filter(Boolean).length);assert(Math.abs(Number(await page.locator('#optimum').getAttribute('cx'))-(62+400*state.x))<1e-8);}
  for(const t of[-1.5,-1,-.5,0,1.8]){await page.locator('#parameter').evaluate((input,value)=>{input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));},t);const s=await page.evaluate(()=>window.__mathState());assert.equal(s.t,t);assert(s.binding.some(Boolean));assert.equal(await page.locator('.slack-row[data-binding="true"]').count(),s.binding.filter(Boolean).length);}
  await page.locator('#parameter-entry').fill('99');await page.locator('#parameter-entry').press('Tab');assert.equal(await page.evaluate(()=>window.__mathState().t),4);
  await page.locator('#parameter-entry').fill('');await page.locator('#parameter-entry').press('Tab');assert.equal(await page.locator('#parameter-entry').inputValue(),'4');
  await page.locator('#regime-select').selectOption('1');await page.locator('#geometry').focus();await page.locator('#geometry').press('ArrowRight');assert(await page.locator('#probe-readout').textContent().then(x=>x.includes('above the minimum')));assert.notEqual(await page.locator('#probe-point').evaluate(el=>getComputedStyle(el).display),'none');
  await page.locator('#certificate-state').click();await page.locator('#certificate-state').click();assert(await page.locator('#residuals').isVisible());assert.equal(await page.locator('#multipliers dd').count(),6);
  await page.locator('#regime-select').selectOption('5');await page.screenshot({path:path.join(out,`${name}-${width}-final.png`),fullPage:true});
  await page.goto(origin+'/proof.html');await page.waitForSelector('.katex');assert(await page.locator('.katex').count()>20);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  results.push({browser:name,width,passed:true,regimes:6,joins:5,consoleErrors:errors,failedResponses:bad});console.log('PASS '+name+' '+width+'px: controls, six regimes, joins, geometry, probe, certificate, proof, overflow, console/network');await context.close();
 }
}finally{await chrome?.close();await wk?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2)+'\n');}
