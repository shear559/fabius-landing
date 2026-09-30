import fs from 'node:fs/promises';
import path from 'node:path';
import{fileURLToPath}from'node:url';
import{execFileSync}from'node:child_process';
import{createHash}from'node:crypto';
import{createRequire}from'node:module';
const require=createRequire(import.meta.url),playwright=require(process.env.PLAYWRIGHT||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await playwright.chromium.launch({channel:'chrome',headless:true,args:['--force-color-profile=srgb']});
const page=await browser.newPage({deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const formats=[['billboard',1920,1080],['social',1080,1350],['story',1080,1920],['square',1080,1080],['card',1200,630]];
const exports=[];
for(const[id,w,h]of formats){
  await page.setViewportSize({width:w,height:h});
  await page.goto('file://'+path.join(root,'source/art.html')+'?format='+id);
  await page.evaluate(()=>window.__ready);
  const png=path.join(root,'exports',`lattice-refined-${id}-${w}x${h}.png`);
  const webp=png.replace('.png','.webp');
  await page.screenshot({path:png});
  execFileSync('cwebp',['-quiet','-q','92','-alpha_q','100',png,'-o',webp]);
  const bounds=await page.locator('.art-type').boundingBox();
  if(!bounds||bounds.x<0||bounds.y<0||bounds.x+bounds.width>w||bounds.y+bounds.height>h)throw Error(`Type escapes ${id}`);
  for(const file of[png,webp]){
    const bytes=await fs.readFile(file);
    const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=width,height','-of','json',file]));
    if(probe.streams[0].width!==w||probe.streams[0].height!==h)throw Error(`Wrong dimensions: ${file}`);
    exports.push({file:path.relative(root,file),width:w,height:h,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  console.log(`PASS ${id}: ${w}x${h}, PNG + WebP, headline inside canvas`);
}
await browser.close();
await fs.writeFile(path.join(root,'source/export-receipt.json'),JSON.stringify({exports,browserErrors:errors,renderer:'Chrome screenshot of HTML/CSS product UI; one persistent browser; five authored layouts'},null,2));
if(errors.length)throw Error(errors.join('\n'));
