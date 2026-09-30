import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath}from'node:url';
import{createRequire}from'node:module';
import{spawn,execFileSync}from'node:child_process';
import{createHash}from'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const scratch=process.env.AFTERLIGHT_RENDER_DIR||path.join(os.tmpdir(),'afterlight-render');
const fps=25,duration=20,width=1920,height=1080;
const samples=[0,3,6.5,10.5,14,18.5,19.96];
await fs.mkdir(scratch,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--force-color-profile=srgb','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('file://'+path.join(root,'source/afterlight/scene.html'));
await page.evaluate(()=>window.__ready);
if(process.argv.includes('--stills')){for(const t of samples){const start=Date.now();const state=await page.evaluate(t=>window.__seek(t),t);await page.screenshot({path:path.join(scratch,`afterlight-${t}.png`)});console.log(JSON.stringify({t,ms:Date.now()-start,...state}));}await browser.close();if(errors.length)throw Error(errors.join('\n'));process.exit(0);}
const target=path.join(root,'afterlight-v1.mp4');
const encoder=spawn('ffmpeg',['-hide_banner','-loglevel','warning','-y','-f','image2pipe','-framerate',String(fps),'-c:v','png','-i','-','-vf','scale=out_color_matrix=bt709:out_range=tv,format=yuv420p','-c:v','libx264','-preset','medium','-crf','18','-x264-params','aq-mode=3:aq-strength=1.1','-bsf:v','h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1','-movflags','+faststart','-an',target],{stdio:['pipe','inherit','inherit']});
const encoded=new Promise((r,j)=>encoder.on('close',code=>code?j(Error('ffmpeg '+code)):r()));
const hashes=[],states=[];const start=Date.now();
for(let f=0;f<duration*fps;f++){const state=await page.evaluate(t=>window.__seek(t),f/fps);const buffer=await page.screenshot({type:'png',caret:'hide'});if(buffer.length<40000)throw Error(`Suspicious frame ${f}: ${buffer.length} bytes`);hashes.push(createHash('sha256').update(buffer).digest('hex'));if(f%100===0)states.push(state);if(!encoder.stdin.write(buffer))await new Promise(r=>encoder.stdin.once('drain',r));if(f%25===0)console.log(`frame ${f}/${duration*fps} · ${((Date.now()-start)/1000).toFixed(1)}s elapsed`);}
encoder.stdin.end();await encoded;
for(const[id,t]of [['form',2],['orbit',6.5],['tide',10.5],['release',14],['afterlight',18.5]]){await page.evaluate(t=>window.__seek(t),t);const png=path.join(scratch,`afterlight-${id}.png`);await page.screenshot({path:png});execFileSync('cwebp',['-quiet','-q','90',png,'-o',path.join(root,'thumbs',`afterlight-v1-${id}.webp`)]);}
execFileSync('cwebp',['-quiet','-q','94',path.join(scratch,'afterlight-release.png'),'-o',path.join(root,'poster-afterlight-v1.webp')]);
const fontLoaded=await page.evaluate(()=>document.fonts.check('400 20px Rubik'));
const browserVersion=browser.version();await browser.close();
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=codec_name,width,height,r_frame_rate,nb_read_frames,pix_fmt,color_range,color_space,color_transfer,color_primaries:format=duration,size','-of','json',target]));
await fs.writeFile(path.join(root,'source/afterlight-frame-hashes.sha256'),hashes.map((h,i)=>`${h}  frame-${String(i).padStart(4,'0')}`).join('\n')+'\n');
await fs.writeFile(path.join(root,'source/afterlight-render-receipt.json'),JSON.stringify({title:'Afterlight',duration,fps,width,height,frames:hashes.length,elapsedSeconds:(Date.now()-start)/1000,browserVersion,fontLoaded,browserErrors:errors,states,probe,method:'Original deterministic WebGL geometry, normals and lighting. One persistent browser/page; PNG frame stream into H.264. Silent.'},null,2));
console.log(JSON.stringify(probe));if(errors.length)throw Error(errors.join('\n'));
