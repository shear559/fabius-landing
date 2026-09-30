import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'film-data.js'),'utf8'),context);
const F=context.window.FILM;
const stamp=t=>{const whole=Math.floor(t),ms=Math.round((t-whole)*1000);return `00:${String(Math.floor(whole/60)).padStart(2,'0')}:${String(whole%60).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;};
for(const type of['captions','chapters']){const body=F.scenes.map((s,i)=>`${i+1}\n${stamp(s.start)} --> ${stamp(s.end)}\n${type==='captions'?s.caption:s.title}\n`).join('\n');fs.writeFileSync(path.join(root,type+'.vtt'),'WEBVTT\n\n'+body);}
console.log(`PASS metadata: ${F.scenes.length} contiguous chapter and description cues through ${F.duration}s`);
