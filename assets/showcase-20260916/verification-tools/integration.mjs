import pw from 'playwright';
import fs from 'node:fs/promises';
const base=process.env.BASE_URL||'http://127.0.0.1:8806',out=process.env.QA_OUT||'./integration-results';await fs.mkdir(out,{recursive:true});
const results=[],started=new Date().toISOString();const check=(name,pass,detail)=>{results.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});if(!pass)console.log('FAIL',name,JSON.stringify(detail));};
for(const engine of ['chromium','webkit']){
 const browser=await pw[engine].launch();
 for(const width of [390,1440]){
 const label=engine+'-'+width,ctx=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:width===390?2:1,isMobile:width===390}),p=await ctx.newPage();p.setDefaultTimeout(12000);const errors=[],bad=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('response',r=>{if(r.status()>=400)bad.push([r.status(),new URL(r.url()).pathname])});
 try{
 await p.goto(base);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(1800);
 check(label+'/Rubik',await p.evaluate(()=>document.fonts.check('500 32px Rubik')&&getComputedStyle(document.body).fontFamily.includes('Rubik')));
 check(label+'/hero-visible',await p.locator('h1').isVisible());
 await p.screenshot({path:out+'/'+label+'-hero.png'});
 const faq=await p.evaluate(()=>{const j=[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent)).find(j=>j['@type']==='FAQPage').mainEntity;return {count:j.length,parity:[...document.querySelectorAll('.faq-item')].every((e,i)=>e.querySelector('.faq-a').textContent.trim()===j[i].acceptedAnswer.text)}});check(label+'/FAQ-parity',faq.parity&&faq.count===13,faq);
 if(width===390){await p.locator('.nav-toggle').click();check(label+'/mobile-menu-open',await p.locator('.mobile-menu').isVisible());await p.keyboard.press('Escape');check(label+'/mobile-menu-close',!await p.locator('.mobile-menu').isVisible());}
 for(const task of ['website','app','math']){
 await p.locator('[data-show-task='+task+']').click();await p.locator('[data-show-screen] iframe[data-ready=true]').waitFor();
 check(label+'/'+task+'/panel-visible',await p.locator('#show-panel').isVisible());
 check(label+'/'+task+'/sandbox',await p.locator('[data-show-screen] iframe').getAttribute('sandbox')==='allow-scripts allow-forms allow-modals allow-downloads');
 await p.evaluate(()=>window.scrollTo(0,document.querySelector('#trials').offsetTop-80));await p.waitForTimeout(300);
 await p.screenshot({path:out+'/'+label+'-'+task+'-gallery.png'});
 for(const device of ['desktop','phone']){await p.locator('[data-show-device='+device+']').click();check(label+'/'+task+'/'+device,await p.locator('[data-show-display]').getAttribute('data-device')===device);}
 await p.locator('[data-show-version=before]').click();await p.locator('[data-show-screen] iframe[data-ready=true]').waitFor();check(label+'/'+task+'/original',await p.locator('[data-show-play]').isDisabled());
 await p.locator('[data-show-version=after]').click();await p.locator('[data-show-screen] iframe[data-ready=true]').waitFor();
 await p.locator('[data-show-expand]').click();check(label+'/'+task+'/expand',await p.locator('[data-show-zoom]').isVisible());await p.locator('[data-show-close]').click();check(label+'/'+task+'/close-focus',await p.locator('[data-show-expand]').evaluate(e=>e===document.activeElement));
 }
 await p.locator('[data-show-task=website]').focus();await p.keyboard.press('ArrowRight');check(label+'/gallery-keyboard',await p.locator('[data-show-task=app]').getAttribute('aria-selected')==='true');check(label+'/gallery-tab-isolation',await p.locator('#show-panel').isVisible());
 for(const harness of ['claude','codex','grok','any']){await p.locator('#tab-'+harness).click();check(label+'/install-'+harness,await p.locator('#panel-'+harness).isVisible());}
 check(label+'/no-horizontal-overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 check(label+'/console-clean',errors.length===0,errors);check(label+'/network-clean',bad.length===0,bad);
 }catch(e){check(label+'/execution',false,e.message)}
 await ctx.close();console.log(label+' done');
 }
 // No-JS and reduced-motion are interaction contracts, separate from visual quality.
 const n=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:false});await n.goto(base);check(engine+'/nojs-fallback',await n.locator('.show-fallback').isVisible());check(engine+'/nojs-no-empty-stage',!await n.locator('#show-panel').isVisible());await n.close();
 const r=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await r.goto(base);await r.locator('[data-show-screen] iframe[data-ready=true]').waitFor();check(engine+'/reduced-next-step',(await r.locator('[data-show-play]').innerText())==='Next step');await r.locator('[data-show-play]').click();check(engine+'/reduced-no-timer',await r.locator('[data-show-play]').getAttribute('aria-pressed')==='false');await r.close();
 await browser.close();
}
// Chromium permits automation inspection in opaque-origin frames; WebKit rendering is inspected from captures.
const b=await pw.chromium.launch(),p=await b.newPage();p.setDefaultTimeout(12000);await p.goto(base);await p.locator('[data-show-task=app]').click();await p.locator('[data-show-screen] iframe[data-ready=true]').waitFor();
const frame=await p.locator('[data-show-screen] iframe').contentFrame();
for(const step of [1,2,3]){await p.locator('[data-show-screen] iframe').evaluate((e,step)=>e.contentWindow.postMessage({type:'fabius-showcase-step',step},'*'),step);await p.waitForTimeout(100);}
check('embedded-app/tour-saved-task',(await frame.locator('[data-testid=task-card]').count())===1 && (await frame.locator('[data-testid=task-card]').first().innerText()).includes('Connect field notes'));
await p.locator('[data-show-expand]').click();let zoom=p.frameLocator('[data-show-zoom] iframe');await zoom.locator('[data-testid=create-task]').click();await zoom.locator('[data-testid=task-form]').waitFor();await zoom.locator('[name=title]').press('Escape');check('embedded-app/nested-escape',await p.locator('[data-show-zoom]').isVisible());await zoom.locator('[data-testid=create-task]').press('Escape');await p.locator('[data-show-zoom]').waitFor({state:'hidden'});check('embedded-app/outer-escape',true);
await p.locator('[data-show-task=website]').click();await p.locator('[data-show-screen] iframe[data-ready=true]').waitFor();await p.locator('[data-show-screen] iframe').evaluate(e=>e.contentWindow.postMessage({type:'fabius-showcase-step',step:3},'*'));await p.waitForTimeout(150);check('embedded-website/tour-pricing',await p.frameLocator('[data-show-screen] iframe').locator('[data-testid=billing-yearly]').getAttribute('aria-pressed')==='true');
await p.goto(base+'/assets/showcase-20260916/math/preview.html');
const numeric=JSON.parse(await fs.readFile(new URL('../evidence/math-numerical.json',import.meta.url),'utf8'));let tested=0;
for(const row of numeric.results.filter((_,i)=>i%10===0||_.families.includes('exact_breakpoint')||_.families.includes('domain_endpoint'))){
 // Range controls quantize to .005; compare at the actual value accepted by the control.
 const state=await p.evaluate(t=>{const el=document.querySelector('#parameter');el.step='any';el.value=t;el.dispatchEvent(new Event('input'));return {xyz:['x','y','z'].map(k=>Number(document.querySelector('#'+k+'-value').textContent)),value:Number(document.querySelector('#minimum-value').textContent),valid:document.querySelector('.certificate').dataset.valid,t:Number(el.value)}},row.t);
 check('math-browser/probe-'+tested,state.valid==='true'&&Math.abs(state.value-row.output.value)<.000051&&state.xyz.every((v,i)=>Math.abs(v-row.output[['x','y','z'][i]])<.000051));tested++;
}
for(const path of ['math/proof.html','original-math.html']){await p.goto(base+'/assets/showcase-20260916/'+path);await p.waitForTimeout(250);check('proof/'+path+'/typeset',await p.locator('.katex').count()>20);check('proof/'+path+'/no-error',await p.locator('[data-render-error]').count()===0);}
await b.close();
const summary={startedAt:started,finishedAt:new Date().toISOString(),base,scope:'Local production-header mirror. Chromium and WebKit 390/1440, gallery interactions, fonts, FAQ, installation, no-JS, reduced motion, embedded walkthroughs and solver-backed browser probes. Not a production or physical-device test.',passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};await fs.writeFile(out+'/results.json',JSON.stringify(summary,null,2));console.log(JSON.stringify({passed:summary.passed,failed:summary.failed}));process.exitCode=summary.failed?1:0;
