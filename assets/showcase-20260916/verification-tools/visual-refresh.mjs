import pw from 'playwright';
import fs from 'node:fs/promises';

const base=process.env.BASE_URL||'http://127.0.0.1:8806';
const out=process.env.QA_OUT||'./visual-refresh-results';
await fs.mkdir(out,{recursive:true});
const results=[];
const check=(name,pass,detail)=>{results.push({name,pass:!!pass,detail});if(!pass)console.log('FAIL',name,detail)};
const times=[-2,-1.75,-1.5,-1.25,-1,-.75,-.5,-.25,0,.9,1.8,2.9,4];
for(const engine of ['chromium','webkit']){
 const b=await pw[engine].launch();
 for(const width of [390,1440]){
  const id=engine+'-'+width,p=await b.newPage({viewport:{width,height:1100},isMobile:width===390,deviceScaleFactor:width===390?2:1});
  const errors=[],bad=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  p.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()])});
  await p.goto(base+'/assets/showcase-20260916/math/preview.html');await p.evaluate(()=>document.fonts.ready);
  for(const t of times){
   const data=await p.evaluate(t=>{
    const q=s=>document.querySelector(s),slider=q('#parameter');slider.step='any';slider.value=t;slider.dispatchEvent(new Event('input'));
    const x=Number(q('#optimum').getAttribute('cx')),y=Number(q('#optimum').getAttribute('cy'));
    // Recover scale and origin from the actual rendered feasible polygon, not chart metadata.
    const vertices=[...q('#vertices').children].map(e=>[+e.getAttribute('cx'),+e.getAttribute('cy')]);
    const [ox,oy]=vertices[0],sx=(vertices[1][0]-ox)/.5,sy=oy-vertices[4][1];
    const X=(x-ox)/sx,Y=(oy-y)/sy,Z=1-X-Y;
    const g=(x,y)=>x*x+2*y*y+3*(1-x-y)**2+x*y-y*(1-x-y)+(2-2*t)*x+5*y+1-x-y;
    const slacks={x:X,y:Y,z:Z,cap:.6-X,slant:2*Y+Z-.5};
    const expected=Object.entries(slacks).filter(([,v])=>Math.abs(v)<1e-8).map(([k])=>k).sort();
    const actual=q('#active-edge').dataset.constraints.split(' ').filter(Boolean).sort();
    let contourError=0;const fills=[];
    for(const e of q('#contours').children){
     const nums=e.getAttribute('d').match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi).map(Number);
     for(let i=0;i<nums.length;i+=2)contourError=Math.max(contourError,Math.abs(g((nums[i]-ox)/sx,(oy-nums[i+1])/sy)-Number(e.dataset.level)));
     fills.push(getComputedStyle(e).fill);
    }
    const m=q('#geometry').getScreenCTM();
    return {scaleEqual:Math.abs(sx*Math.hypot(m.a,m.b)-sy*Math.hypot(m.c,m.d))<1e-7,expected,actual,contourError,fillCount:new Set(fills.filter(f=>f!=='none')).size,valid:q('.certificate').dataset.valid,slacks,valueError:Math.abs(g(X,Y)-Number(q('#minimum-value').textContent))};
   },t);
   check(id+'/math-t='+t,data.scaleEqual&&JSON.stringify(data.actual)===JSON.stringify(data.expected)&&data.contourError<1e-9&&data.fillCount===9&&data.valid==='true'&&Object.values(data.slacks).every(v=>v>=-1e-8)&&data.valueError<.000051,data);
  }
  await p.evaluate(()=>{const s=document.querySelector('#parameter');s.value=.75;s.dispatchEvent(new Event('input'))});
  await p.waitForTimeout(1800);await p.locator('.geometry').screenshot({path:out+'/'+id+'-math.png'});
  check(id+'/math-fit',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  for(const task of ['website','app']){
   await p.goto(base+'/assets/showcase-20260916/'+task+'/preview.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(1800);
   check(id+'/'+task+'/fit',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(task==='website'){
    check(id+'/icons',await p.locator('.ui-icon').count()>25);
    check(id+'/website-grain',await p.locator('.feature-stage').evaluate(e=>getComputedStyle(e).backgroundImage.includes('grain.png')));
   }else{
    check(id+'/app-blue',await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()==='#2756c9'));
    check(id+'/preview-storage',await p.evaluate(()=>!document.body.innerText.includes('Not saved: browser storage is unavailable')));
   }
   await p.screenshot({path:out+'/'+id+'-'+task+'.png'});
  }
  await p.goto(base);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(1800);
  check(id+'/static-logo-glow',await p.locator('.brand-mark').first().evaluate(e=>getComputedStyle(e).filter.includes('drop-shadow')&&getComputedStyle(e).animationName==='none'));
  await p.locator('.field-mark').screenshot({path:out+'/'+id+'-emblem.png'});
  await p.screenshot({path:out+'/'+id+'-landing.png'});
  check(id+'/console-clean',errors.length===0,errors);check(id+'/network-clean',bad.length===0,bad);
  console.log(id+' complete');await p.close();
 }
 await b.close();
}
const summary={date:new Date().toISOString(),base,scope:'Visual refresh: Chromium and WebKit, mobile 390 and desktop 1440. Actual SVG contour residuals, equal screen units, all binding constraints at transitions, rendered color bands, layout, icons, fonts, preview storage, static emblem glow and console/network. Engine emulation, not physical-device testing.',passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};
await fs.writeFile(out+'/results.json',JSON.stringify(summary,null,2));console.log({passed:summary.passed,failed:summary.failed});process.exitCode=summary.failed?1:0;
