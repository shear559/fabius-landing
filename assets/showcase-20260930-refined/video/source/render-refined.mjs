import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const scratch=process.env.LATTICE_RENDER_DIR||path.join(root,'source/.render-work');
const stills=process.argv.includes('--stills');
const width=1920,height=1080,fps=25,duration=26;
await fs.mkdir(scratch,{recursive:true});
await fs.mkdir(path.join(root,'thumbs'),{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--force-color-profile=srgb','--disable-lcd-text']});
const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('file://'+path.join(root,'source/scenes/film.html'));
await page.evaluate(()=>window.__ready);
if(stills){
  for(const t of [0,2,6.5,10.8,15.6,20.6,25]){await page.evaluate(t=>window.__seek(t),t);await page.screenshot({path:path.join(scratch,`film-${t}.png`)});console.log(`composition ${t}s`);}
  await browser.close();if(errors.length)throw Error(errors.join('\n'));process.exit(0);
}
const target=path.join(root,'film-refined.mp4');
const encoder=spawn('ffmpeg',['-hide_banner','-loglevel','warning','-y','-f','image2pipe','-framerate',String(fps),'-c:v','png','-i','-','-vf','scale=out_color_matrix=bt709:out_range=tv,format=yuv420p','-c:v','libx264','-preset','medium','-crf','18','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-bsf:v','h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1','-movflags','+faststart','-an',target],{stdio:['pipe','inherit','inherit']});
const encoded=new Promise((resolve,reject)=>encoder.on('close',code=>code?reject(Error(`ffmpeg ${code}`)):resolve()));
const hashes=[];const start=Date.now();
for(let frame=0;frame<duration*fps;frame++){
  await page.evaluate(t=>window.__seek(t),frame/fps);
  const buffer=await page.screenshot({type:'png',caret:'hide'});
  if(buffer.length<40000)throw Error(`Suspiciously small frame ${frame}: ${buffer.length} bytes`);
  hashes.push(createHash('sha256').update(buffer).digest('hex'));
  if(!encoder.stdin.write(buffer))await new Promise(r=>encoder.stdin.once('drain',r));
  if(frame%50===0)console.log(`frame ${frame}/${duration*fps} (${((Date.now()-start)/1000).toFixed(1)}s elapsed)`);
}
encoder.stdin.end();await encoded;
const scenes=[['beginning',0,3.3,2],['capture',3.3,8,6.5],['connect',8,13,10.8],['insight',13,18,15.6],['brief',18,23,20.6],['lattice',23,26,25]];
for(const[id,a,b,t]of scenes){await page.evaluate(t=>window.__seek(t),t);await page.screenshot({path:path.join(scratch,`${id}.png`)});execFileSync('cwebp',['-quiet','-q','90',path.join(scratch,`${id}.png`),'-o',path.join(root,'thumbs',`${id}.webp`)]);}
execFileSync('cwebp',['-quiet','-q','92',path.join(scratch,'lattice.png'),'-o',path.join(root,'poster-refined.webp')]);
await browser.close();
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=codec_name,width,height,r_frame_rate,nb_read_frames,pix_fmt:format=duration,size','-of','json',target]));
await fs.writeFile(path.join(root,'source/render-receipt.json'),JSON.stringify({width,height,fps,duration,frames:hashes.length,elapsedSeconds:(Date.now()-start)/1000,probe,browserErrors:errors,renderer:'One persistent Chrome browser and page; deterministic __seek(t); PNG pipe to H.264; silent.'},null,2));
await fs.writeFile(path.join(root,'source/frames-refined.sha256'),hashes.map((hash,i)=>`${hash}  frame-${String(i).padStart(4,'0')}`).join('\n')+'\n');
console.log(JSON.stringify(probe));if(errors.length)throw Error(errors.join('\n'));
