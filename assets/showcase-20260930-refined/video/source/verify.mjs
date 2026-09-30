import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium,webkit}=require(process.env.PLAYWRIGHT||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const scratch=process.env.AFTERLIGHT_VERIFY_DIR||path.join(os.tmpdir(),'afterlight-verify');
fs.mkdirSync(scratch,{recursive:true});
const webkitOnly=process.argv.includes('--webkit-only');
const previous=webkitOnly?JSON.parse(fs.readFileSync(path.join(root,'source/verification.json'))):null;
const receipt={checkedAt:new Date().toISOString(),checks:previous?.checks||[],ui:previous?.ui.filter(x=>x.browser!=='WebKit')||[],...(previous?{reusedCoreChecksAt:previous.checkedAt}:{})};
function pass(name,detail){receipt.checks.push({name,pass:true,...detail});console.log('PASS '+name);}
if(!webkitOnly){
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'film-data.js'),'utf8'),context);const F=context.window.FILM;
assert.equal(F.duration,20);assert.equal(F.scenes.length,5);F.scenes.forEach((s,i)=>{assert.equal(s.start,i*4);assert.equal(s.end,(i+1)*4);assert(fs.existsSync(path.join(root,s.thumb)));});
const tour=JSON.parse(fs.readFileSync(path.join(root,'TOUR.json')));assert(Array.isArray(tour)&&tour.length===5);assert.equal(fs.readFileSync(path.join(root,'preview.html'),'utf8').replace('<script defer src="../demo-control.js"></script>',''),fs.readFileSync(path.join(root,'index.html'),'utf8'));
pass('five contiguous chapters, tour schema and portable/index parity');
const film=path.join(root,'afterlight-v1.mp4');
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_entries','stream=codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,pix_fmt,color_space:format=duration,size','-of','json',film]));
assert.equal(probe.streams.length,1);const stream=probe.streams[0];assert.equal(stream.codec_name,'h264');assert.equal(stream.width,1920);assert.equal(stream.height,1080);assert.equal(stream.r_frame_rate,'25/1');assert.equal(Number(stream.nb_read_frames),500);assert.equal(Number(probe.format.duration),20);assert.equal(stream.pix_fmt,'yuv420p');
execFileSync('ffmpeg',['-v','error','-i',film,'-f','null','-']);pass('complete H.264 decode and exact 500-frame 1080p/25fps metadata',{probe});
let prior;const changes=[];
for(const t of[2,6,10,14,18]){const data=execFileSync('ffmpeg',['-v','error','-ss',String(t),'-i',film,'-frames:v','1','-vf','scale=96:54','-f','rawvideo','-pix_fmt','rgb24','-']);assert.equal(data.length,96*54*3);const range=Math.max(...data)-Math.min(...data);assert(range>80,`Frame at ${t} needs visible tonal range`);if(prior){const difference=data.reduce((s,n,i)=>s+Math.abs(n-prior[i]),0)/data.length;assert(difference>2,`Frames around ${t} must progress visibly`);changes.push({time:t,meanAbsoluteDifference:difference});}prior=data;execFileSync('ffmpeg',['-v','error','-y','-ss',String(t),'-i',film,'-frames:v','1',path.join(scratch,`decoded-${t}.png`)]);}
pass('five decoded moments have content and visible progression',{changes});
}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp4':'video/mp4','.woff2':'font/woff2','.webp':'image/webp','.vtt':'text/vtt','.zip':'application/zip'};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}const size=fs.statSync(file).size;const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Access-Control-Allow-Origin':'*','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; media-src 'self'; connect-src 'self'"};const range=/bytes=(\d+)-(\d*)/.exec(req.headers.range||'');if(range){const start=Number(range[1]),end=Math.min(size-1,range[2]?Number(range[2]):size-1);res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);}else{res.writeHead(200,{...headers,'Content-Length':size});fs.createReadStream(file).pipe(res);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let chrome,wk;
try{
  if(!webkitOnly){
  chrome=await chromium.launch({channel:'chrome',headless:true,args:['--force-color-profile=srgb','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const art=await chrome.newPage({viewport:{width:1920,height:1080}});const artErrors=[];art.on('pageerror',e=>artErrors.push(e.message));await art.goto(origin+'/source/afterlight/scene.html');await art.evaluate(()=>window.__ready);
  const lower=await art.evaluate(()=>window.__seek(-3));assert.equal(lower.time,0);const upper=await art.evaluate(()=>window.__seek(25));assert.equal(upper.time,20);assert(await art.evaluate(()=>{try{window.__seek(Infinity);return false;}catch{return true;}}));
  await art.evaluate(()=>window.__seek(6.5));const a=createHash('sha256').update(await art.screenshot()).digest('hex');const state=await art.evaluate(()=>window.__seek(14));await art.evaluate(()=>window.__seek(6.5));const b=createHash('sha256').update(await art.screenshot()).digest('hex');assert.equal(a,b);assert.equal(state.geometry.rings,16);assert(state.bloom>.8);assert.deepEqual(artErrors,[]);await art.close();pass('deterministic repeat-seek pixels, finite-time guard, boundaries and changing geometry',{repeatPixelHash:a});
  }
  async function ui(browser,name,width,mobile=false){const ctx=await browser.newContext({viewport:{width,height:width===390?844:1000},deviceScaleFactor:mobile?2:1,isMobile:mobile,reducedMotion:'reduce',serviceWorkers:'block'});const page=await ctx.newPage(),errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)bad.push({url:r.url(),status:r.status()});});await page.goto(origin+'/index.html');await page.waitForFunction(()=>document.getElementById('film').readyState>=1);assert.equal(await page.locator('#film').evaluate(v=>v.paused),true);assert(await page.locator('#motion-note').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(scratch,`player-${name}-${width}.png`),fullPage:true});
    await page.locator('#play').click();await page.waitForFunction(()=>document.getElementById('film').currentTime>.2);await page.locator('#play').click();const thumbnail=await page.locator('.chapter img').first().boundingBox();assert(Math.abs(thumbnail.width/thumbnail.height-16/9)<.03);let pixels=[];for(const start of[0,4,8,12,16]){await page.locator(`.chapter[data-start="${start}"]`).click();await page.waitForFunction(()=>{const v=document.getElementById('film');return !v.seeking&&v.readyState>=2;});const t=await page.locator('#film').evaluate(v=>v.currentTime);assert(Math.abs(t-(start+.05))<.1);assert.equal(await page.locator('.chapter[aria-current="true"]').count(),1);pixels.push(await page.locator('#film').evaluate(v=>{const c=document.createElement('canvas');c.width=32;c.height=18;const x=c.getContext('2d');x.drawImage(v,0,0,32,18);return Array.from(x.getImageData(0,0,32,18).data).reduce((s,n,i)=>s+n*(i+1),0);}));}assert.equal(new Set(pixels).size,5);
    await page.locator('#seek').focus();await page.locator('#seek').press('Home');await page.locator('#seek').press('ArrowRight');await page.waitForFunction(()=>{const v=document.getElementById('film');return !v.seeking&&v.currentTime>0&&v.currentTime<.1;});await page.locator('#play').click();await page.waitForFunction(()=>document.getElementById('film').currentTime>.3);await page.locator('#play').click();assert(await page.locator('#film').evaluate(v=>v.paused));await page.locator('#cc').click();assert.equal(await page.locator('#caption').evaluate(el=>getComputedStyle(el).display),'none');await page.locator('#cc').click();assert.notEqual(await page.locator('#caption').evaluate(el=>getComputedStyle(el).display),'none');await page.locator('#restart').click();await page.waitForFunction(()=>document.getElementById('film').currentTime===0);assert(await page.locator('#film').evaluate(v=>v.paused));
    await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#play').click();await page.waitForFunction(()=>!document.getElementById('film').paused);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.getElementById('film').paused);assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);receipt.ui.push({browser:name,width,pass:true,consoleErrors:errors,failedResponses:bad,chapterFrameFingerprints:pixels});await ctx.close();console.log(`PASS ${name} ${width}px playback, seeking, reduced motion, captions, layout and network`);}
  if(chrome){await ui(chrome,'Chrome',390,true);await ui(chrome,'Chrome',1440);}
  try{wk=await webkit.launch({headless:true});}catch(e){receipt.ui.push({browser:'WebKit',width:390,pass:false,unavailable:true,reason:e.message.split('\n')[0]});console.log('UNAVAILABLE WebKit: '+e.message.split('\n')[0]);}
  if(wk)await ui(wk,'WebKit',390,true);
  receipt.pass=receipt.checks.every(x=>x.pass)&&receipt.ui.every(x=>x.pass||x.unavailable);
}finally{await chrome?.close();await wk?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(root,'source/verification.json'),JSON.stringify(receipt,null,2)+'\n');}
