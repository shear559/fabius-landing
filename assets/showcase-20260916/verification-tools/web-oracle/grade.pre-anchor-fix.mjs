#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import playwright from '[user]/node_modules/playwright/index.js';

const ORACLE_DIR = path.dirname(fileURLToPath(import.meta.url));
const KEY = 'fieldnote-board:v1';
const B = {schemaVersion:1,tasks:[
 {id:'oracle-a',title:'Sample literature review',project:'Atlas',status:'todo',priority:'high',dueDate:'2028-02-29',tags:['methods','Research']},
 {id:'oracle-b',title:'Dataset audit',project:'Boreal',status:'doing',priority:'medium',dueDate:'',tags:['cleanup']},
 {id:'oracle-c',title:'Draft methods note',project:'Atlas',status:'done',priority:'low',dueDate:'2028-12-31',tags:['Writing']},
 {id:'oracle-d',title:'Field observations',project:'Boreal',status:'todo',priority:'low',dueDate:'',tags:['Research']},
 {id:'oracle-e',title:'Review source links',project:'Atlas',status:'doing',priority:'high',dueDate:'2028-03-01',tags:['Sources']},
 {id:'oracle-f',title:'Archive completed work',project:'Boreal',status:'done',priority:'medium',dueDate:'',tags:['archive']}
]};
const clone = x => JSON.parse(JSON.stringify(x));
export function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object'){const result={};for(const key of Object.keys(value).sort()){const item=value[key];result[key]=key==='tasks'&&Array.isArray(item)?item.map(canonical).sort((a,b)=>String(a.id).localeCompare(String(b.id))):canonical(item);}return result;}return value;}
const eq = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
const s = id => `[data-testid="${id}"]`;
const card = id => `${s('task-card')}[data-task-id="${id}"]`;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export function validBoard(b) {
 if(!b || b.schemaVersion!==1 || !Array.isArray(b.tasks)) return false;
 const seen=new Set();
 return b.tasks.every(t=>{
  if(!t || typeof t!=='object') return false;
  const str=(v,n)=>typeof v==='string' && v.length>0 && v.length<=n && v.trim()===v;
  if(!str(t.id,80)||seen.has(t.id)||!str(t.title,120)||!str(t.project,80)) return false;
  seen.add(t.id);
  if(!['todo','doing','done'].includes(t.status)||!['low','medium','high'].includes(t.priority)) return false;
  if(typeof t.dueDate!=='string' || (t.dueDate!=='' && (!/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) || Number.isNaN(Date.parse(t.dueDate)) || new Date(t.dueDate).toISOString().slice(0,10)!==t.dueDate))) return false;
  return Array.isArray(t.tags)&&t.tags.length<=8&&t.tags.every(v=>str(v,24));
 });
}
export async function serve(directory) {
 const root=await fs.realpath(directory);
 const prefix='/nested/benchmark/';
 const server=http.createServer(async(req,res)=>{
  try {
   const url=new URL(req.url,'http://localhost');
   if(!url.pathname.startsWith(prefix)){res.writeHead(404);res.end('Not found');return;}
   const relative=decodeURIComponent(url.pathname.slice(prefix.length));
   let target=path.resolve(root,relative||'index.html');
   if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
   if((await fs.stat(target)).isDirectory()) target=path.join(target,'index.html');
   const real=await fs.realpath(target);
   if(real!==root&&!real.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
   const data=await fs.readFile(real);
   res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webp':'image/webp'})[path.extname(real)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {url:`http://127.0.0.1:${server.address().port}${prefix}`,close:()=>new Promise(r=>server.close(r))};
}
const storage = page=>page.evaluate(key=>localStorage.getItem(key),KEY);
const board = async page=>JSON.parse(await storage(page));
const ids = async page=>(await page.locator(s('task-card')).evaluateAll(els=>els.filter(el=>{const c=getComputedStyle(el);return c.display!=='none'&&c.visibility!=='hidden'&&el.getBoundingClientRect().height>0;}).map(el=>el.dataset.taskId))).sort();
const bodyText = page=>page.locator('body').innerText();
async function visible(page,selector){return page.locator(selector).first().isVisible().catch(()=>false);}
async function state(page){return {stored:await storage(page),cards:await ids(page)};}
function observe(ctx,key,actual,pass,expected){ctx.observations.push({key,pass:Boolean(pass),actual,...(expected===undefined?{}:{expected})});}
async function notice(page,re){const text=await page.evaluate(()=>{const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const parts=[];let n;while(n=walker.nextNode()){const p=n.parentElement;if(!p||p.closest('[data-testid=task-card],[data-testid=task-form],script,style')||p.getClientRects().length===0||getComputedStyle(p).visibility==='hidden')continue;parts.push(n.textContent);}return parts.join(' ').replace(/\s+/g,' ');});return {present:re.test(text),excerpt:text.match(new RegExp(`.{0,100}(?:${re.source}).{0,160}`,'i'))?.[0]||''};}
async function screenshot(ctx,label){const name=`${ctx.environment}-${ctx.id}-${label}.png`;await ctx.page.screenshot({path:path.join(ctx.output,name),fullPage:true,animations:'disabled',timeout:15000});ctx.screenshots.push(name);}
async function openForm(page,id){await page.locator(id?`${card(id)} [data-action="edit"]`:s('create-task')).click();await page.locator(s('task-form')).waitFor({state:'visible'});}
async function fillForm(page,values){const form=page.locator(s('task-form'));for(const [key,value] of Object.entries(values)){const input=form.locator(`[name="${key}"]`);if(['status','priority'].includes(key))await input.selectOption(value);else await input.fill(value);}}
async function saveForm(page){await page.locator(s('save-task')).click();await sleep(150);}
async function buttonByName(page,re,{exclude}={}) {const candidates=page.getByRole('button',{name:re}).or(page.getByRole('link',{name:re}));for(let i=0;i<await candidates.count();i++){const c=candidates.nth(i);if(await c.isVisible()){const text=await c.innerText().catch(()=> '');if(!exclude||!exclude.test(text))return c;}}return null;}
async function importFile(ctx,value,{accept=true,raw=false,name='board.json'}={}){
 const before=await storage(ctx.page),beforeDialogs=ctx.dialogs.length;
 ctx.dialogAction=accept?'accept':'dismiss';
 await ctx.page.locator(s('import-file')).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(raw?value:JSON.stringify(value))});
 await sleep(180);
 let custom=false;
 if(ctx.dialogs.length===beforeDialogs && await storage(ctx.page)===before){
  const dialog=ctx.page.getByRole('dialog');
  const scope=await dialog.count()&&await dialog.last().isVisible()?dialog.last():ctx.page;
  const action=await buttonByName(scope,accept?/^(?:yes\b|replace\b|confirm\b|import\b|continue\b)/i:/^(?:no\b|cancel\b|keep\b)/i,{exclude:/export/i});
  if(action){custom=true;await action.click();await sleep(150);}
 }
 ctx.dialogAction='accept';
 return {confirmed:ctx.dialogs.length>beforeDialogs||custom,dialogCount:ctx.dialogs.length-beforeDialogs,custom,before,after:await storage(ctx.page)};
}
async function download(page,action){const event=page.waitForEvent('download',{timeout:4000});await action();const d=await event;const stream=await d.createReadStream();const chunks=[];for await(const c of stream)chunks.push(c);return {filename:d.suggestedFilename(),bytes:Buffer.concat(chunks)};}
async function errorState(page){
 const native=await page.locator('input,select,textarea').evaluateAll(els=>els.filter(el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden'&&el.willValidate&&!el.validity.valid).map(el=>({name:el.name,message:el.validationMessage}))); 
 const text=await notice(page,/invalid|required|too long|error|unable|failed|must be|cannot|not saved|duplicate|unsupported|too large|exceeds?|at most|maximum.{0,40}(?:length|characters|MiB|MB|size|120|80)|(?:date|JSON).{0,30}(?:invalid|error|malformed)|malformed/i);
 return {hasFeedback:native.length>0||text.present,native,notice:text.excerpt};
}
async function motion(page){return page.evaluate(()=>document.getAnimations().map(a=>({playState:a.playState,duration:a.effect?.getTiming().duration,iterations:a.effect?.getTiming().iterations})).filter(a=>a.playState==='running'&&(a.iterations===Infinity||a.duration>100)));}
async function rendering(page){return page.evaluate(()=>{
 const text=el=>el.getAttribute('aria-label')||((el.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id)?.textContent||'').join(' '))||(el.labels&&Array.from(el.labels).map(x=>x.textContent).join(' '))||el.getAttribute('title')||el.textContent||el.getAttribute('alt')||'';
 const seen=el=>{const c=getComputedStyle(el),r=el.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.height>0;};
 const controls=Array.from(document.querySelectorAll('button,a[href],input:not([type="hidden"]),select,textarea')).filter(seen);
 return {width:innerWidth,scrollWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),contentLength:document.body.innerText.trim().length,unnamed:controls.filter(el=>!text(el).trim()).map(el=>({tag:el.tagName,testid:el.dataset.testid,name:el.name,html:el.outerHTML.slice(0,250)})),brokenImages:Array.from(document.images).filter(el=>seen(el)&&(!el.complete||el.naturalWidth===0)).map(el=>el.getAttribute('src')),visibleControls:controls.length};
 });}
async function links(page){return page.locator('a[href]').evaluateAll(els=>els.map(el=>({text:el.textContent.trim(),href:el.getAttribute('href'),visible:el.getBoundingClientRect().height>0})).filter(x=>x.visible).map(x=>({...x,targetExists:!x.href.startsWith('#')?null:!!document.getElementById(x.href.slice(1))})));}
const landingChecks={
 L01:async c=>{
  const text=await bodyText(c.page),ln=await links(c.page);
  observe(c,'productAndFiction',{product:/Lattice/i.test(text),fiction:/fictional|demonstration/i.test(text)},/Lattice/i.test(text)&&/fictional|demonstration/i.test(text));
  const facts={local:/local|device/i.test(text),markdown:/markdown/i.test(text),sources:/source/i.test(text),templates:/template/i.test(text),search:/search/i.test(text)};observe(c,'facts',facts,Object.values(facts).every(Boolean));
  observe(c,'workflowSection',await visible(c.page,'#workflow'),await visible(c.page,'#workflow'));
  const cta=c.page.getByRole('link',{name:'Explore the workflow',exact:true}).first();observe(c,'primaryCTA',await cta.getAttribute('href'),await cta.getAttribute('href')==='#workflow');await cta.click();observe(c,'ctaNavigation',new URL(c.page.url()).hash,new URL(c.page.url()).hash==='#workflow');
  observe(c,'navigationTargets',ln,ln.some(x=>x.href.startsWith('#')&&x.targetExists)&&ln.filter(x=>x.href.startsWith('#')).every(x=>x.targetExists));
  observe(c,'requiredCounts',{faqs:await c.page.locator('details').count(),plans:await c.page.locator(`${s('price-solo')},${s('price-studio')}`).count()},await c.page.locator('details').count()===4&&await c.page.locator(`${s('price-solo')},${s('price-studio')}`).count()===2);
  observe(c,'externalResourceRequests',c.network.filter(x=>x.external),!c.network.some(x=>x.external));
  c.manualReview.push('Check three-step workflow, useful distinct feature content, coherent visual hierarchy, and unsupported social-proof claims from screenshots/content.');
  await c.page.goto(c.url);await screenshot(c,'initial');
 },
 L02:async c=>{
  if(c.width>600){const ln=await links(c.page);observe(c,'desktopNavigation',ln,ln.filter(x=>x.targetExists).length>=2);return;}
  const toggle=c.page.locator(s('menu-toggle')),nav=c.page.locator(s('mobile-nav'));await toggle.click();observe(c,'opened',{expanded:await toggle.getAttribute('aria-expanded'),visible:await nav.isVisible()},await toggle.getAttribute('aria-expanded')==='true'&&await nav.isVisible());
  await c.page.keyboard.press('Escape');observe(c,'escapeClosed',{expanded:await toggle.getAttribute('aria-expanded'),visible:await nav.isVisible(),focused:await toggle.evaluate(el=>el===document.activeElement)},await toggle.getAttribute('aria-expanded')==='false'&&!await nav.isVisible()&&await toggle.evaluate(el=>el===document.activeElement));
  await toggle.click();const link=nav.locator('a[href^="#"]').first(),href=await link.getAttribute('href');await link.click();observe(c,'linkCloses',{href,expanded:await toggle.getAttribute('aria-expanded'),visible:await nav.isVisible(),hash:new URL(c.page.url()).hash},await toggle.getAttribute('aria-expanded')==='false'&&!await nav.isVisible()&&new URL(c.page.url()).hash===href);
 },
 L03:async c=>{
  const contents=[];for(const name of ['capture','connect','export']){const tab=c.page.locator(s(`feature-${name}`));await tab.click();const snapshot=await Promise.all(['capture','connect','export'].map(async n=>({name:n,role:await c.page.locator(s(`feature-${n}`)).getAttribute('role'),selected:await c.page.locator(s(`feature-${n}`)).getAttribute('aria-selected'),panelRole:await c.page.locator(s(`panel-${n}`)).getAttribute('role'),visible:await c.page.locator(s(`panel-${n}`)).isVisible()})));observe(c,`tab-${name}`,snapshot,snapshot.every(x=>x.role==='tab'&&x.panelRole==='tabpanel'&&x.selected===String(x.name===name)&&x.visible===(x.name===name)));contents.push(await c.page.locator(s(`panel-${name}`)).innerText());}
  observe(c,'distinctPanelContent',contents,contents.every(t=>t.trim().length>20)&&new Set(contents).size===3);
  await c.page.locator(s('feature-capture')).focus();await c.page.keyboard.press('ArrowRight');const connected=c.page.locator(s('feature-connect'));if(await connected.getAttribute('aria-selected')!=='true')await c.page.keyboard.press('Enter');observe(c,'arrowKeyboard',{focused:await connected.evaluate(el=>el===document.activeElement),selected:await connected.getAttribute('aria-selected')},await connected.evaluate(el=>el===document.activeElement)&&await connected.getAttribute('aria-selected')==='true');
 },
 L04:async c=>{
  for(const [period,prices] of [['monthly',[12,29]],['yearly',[108,264]],['monthly',[12,29]]]){
   await c.page.locator(s(`billing-${period}`)).click();
   const amounts=[];for(const id of ['solo','studio'])amounts.push(await c.page.locator(s(`price-${id}`)).innerText());
   const text=await bodyText(c.page);const actual=amounts.map(t=>Number(t.replace(/[^0-9.]/g,'')));
   observe(c,`billing-${period}-${c.observations.length}`,{amounts,actual,periodLabel:period==='monthly'?/per month|\/\s*mo(?:nth)?\b|monthly|month/i.test(text):/per year|\/\s*yr\b|annually|year/i.test(text)},eq(actual,prices)&&(period==='monthly'?/per month|\/\s*mo(?:nth)?\b|monthly|month/i.test(text):/per year|\/\s*yr\b|annually|year/i.test(text)),prices);
  }
 },
 L05:async c=>{
  const answers=[];for(let i=0;i<4;i++){const summary=c.page.locator(s(`faq-${i}`));observe(c,`nativeFAQ-${i}`,await summary.evaluate(el=>({tag:el.tagName,parent:el.parentElement.tagName})),await summary.evaluate(el=>el.tagName==='SUMMARY'&&el.parentElement.tagName==='DETAILS'));await summary.focus();await c.page.keyboard.press('Enter');const open=await summary.evaluate(el=>el.parentElement.open);observe(c,`faqOpen-${i}`,open,open);answers.push(await summary.evaluate(el=>el.parentElement.innerText));}
  const joined=answers.join('\n');const facts={local:/local|device/i.test(joined),markdown:/markdown/i.test(joined),backup:/backup/i.test(joined)&&/export/i.test(joined),cancellation:/cancel/i.test(joined)&&/export/i.test(joined)};observe(c,'FAQFacts',{answers,facts},Object.values(facts).every(Boolean));
 },
 L06:async c=>{
  const text=await bodyText(c.page),ln=await links(c.page),prices=await c.page.locator(`${s('price-solo')},${s('price-studio')}`).allTextContents();
  observe(c,'noJSContent',{length:text.length,product:/Lattice/i.test(text),workflow:await visible(c.page,'#workflow')},text.length>500&&/Lattice/i.test(text)&&await visible(c.page,'#workflow'));
  observe(c,'noJSPrices',prices,prices.length===2&&prices.every(t=>/\d/.test(t))&&await visible(c.page,s('price-solo'))&&await visible(c.page,s('price-studio')));
  observe(c,'noJSNavigation',ln,ln.some(x=>x.targetExists));
 },
 L07:async c=>{const resourceFailures=c.network.filter(x=>(x.status>=400||x.external)&&!x.url.endsWith('/favicon.ico'));observe(c,'loadedLocalResources',resourceFailures,resourceFailures.length===0);const r=await rendering(c.page);observe(c,'rendering',r,r.scrollWidth<=r.width+1&&r.contentLength>500&&r.brokenImages.length===0&&r.unnamed.length===0);const active=await motion(c.page);observe(c,'reducedMotion',active,active.length===0);await screenshot(c,'reduced-motion');}
};
const appChecks={
 A01:async c=>{const b=await board(c.page),rendered=await ids(c.page),text=await bodyText(c.page);observe(c,'seedBoard',{valid:validBoard(b),count:b?.tasks?.length,projects:[...new Set(b?.tasks?.map(t=>t.project))],statuses:[...new Set(b?.tasks?.map(t=>t.status))]},validBoard(b)&&b.tasks.length>=6&&new Set(b.tasks.map(t=>t.project)).size>=2&&new Set(b.tasks.map(t=>t.status)).size===3);observe(c,'seedRendered',{ids:rendered},eq(rendered,b.tasks.map(t=>t.id).sort()));observe(c,'localFictionFraming',text.match(/.{0,60}(?:fictional|local-only|demo(?:nstration)?).{0,100}/ig),/fictional|local.only|demo(?:nstration)?/i.test(text));await screenshot(c,'initial');},
 A02:async c=>{
  const original=clone(B);await openForm(c.page);await fillForm(c.page,{title:'  Untangle the methods  ',project:'  Atlas  ',status:'doing',priority:'high',dueDate:'2028-02-29',tags:' methods, METHODS, review, Review '});await saveForm(c.page);
  let b=await board(c.page),created=b.tasks.find(t=>!original.tasks.some(o=>o.id===t.id));
  observe(c,'created',{created,valid:validBoard(b),count:b.tasks.length},validBoard(b)&&b.tasks.length===7&&created?.title==='Untangle the methods'&&created?.project==='Atlas'&&created?.status==='doing'&&created?.priority==='high'&&created?.dueDate==='2028-02-29'&&created?.tags.length===2&&new Set(created?.tags.map(t=>t.toLowerCase())).size===2&&original.tasks.every(t=>eq(t,b.tasks.find(x=>x.id===t.id))));
  if(!created)return;
  await c.page.reload();observe(c,'createPersists',await board(c.page),eq(await board(c.page),b));
  await openForm(c.page,created.id);const prefilled=await c.page.locator(`${s('task-form')} [name="title"]`).inputValue();observe(c,'editPrefilled',prefilled,prefilled===created.title);
  await fillForm(c.page,{title:'Revised methods handoff',project:'Boreal',status:'done',priority:'low',dueDate:'2028-03-03',tags:'final, methods'});await saveForm(c.page);b=await board(c.page);const edited=b.tasks.find(t=>t.id===created.id);
  observe(c,'editedOnlyTarget',b,edited?.title==='Revised methods handoff'&&edited?.project==='Boreal'&&edited?.status==='done'&&edited?.priority==='low'&&edited?.dueDate==='2028-03-03'&&eq(edited?.tags,['final','methods'])&&b.tasks.length===7&&original.tasks.every(t=>eq(t,b.tasks.find(x=>x.id===t.id))));
  await c.page.reload();observe(c,'editPersists',await board(c.page),eq(await board(c.page),b));await screenshot(c,'edited');
 },
 A03:async c=>{const target=B.tasks[0],select=c.page.locator(`${card(target.id)} [data-action="status"]`);observe(c,'nativeSelect',await select.evaluate(el=>el.tagName),await select.evaluate(el=>el.tagName==='SELECT'));await select.selectOption('done');await sleep(120);const b=await board(c.page),expected=clone(B);expected.tasks[0].status='done';observe(c,'onlyStatusChanged',b,eq(b,expected));await c.page.reload();observe(c,'statusPersists',{board:await board(c.page),select:await c.page.locator(`${card(target.id)} [data-action="status"]`).inputValue()},eq(await board(c.page),expected)&&await c.page.locator(`${card(target.id)} [data-action="status"]`).inputValue()==='done');},
 A04:async c=>{const target=B.tasks[1];await c.page.locator(`${card(target.id)} [data-action="delete"]`).click();await sleep(120);const after=await board(c.page);observe(c,'deleted',{board:after,visible:await visible(c.page,card(target.id)),undo:await visible(c.page,s('undo-delete'))},after.tasks.length===5&&!after.tasks.some(t=>t.id===target.id)&&!await visible(c.page,card(target.id))&&await visible(c.page,s('undo-delete')));await c.page.locator(s('undo-delete')).click();const restored=await board(c.page);observe(c,'exactRecordRestored',restored,restored.tasks.length===6&&B.tasks.every(t=>eq(t,restored.tasks.find(x=>x.id===t.id))));await c.page.reload();observe(c,'undoPersists',await board(c.page),eq(await board(c.page),restored));},
 A05:async c=>{
  for(const [query,expected] of [['LITERATURE',['oracle-a']],['bOrEaL',['oracle-b','oracle-d','oracle-f']],['rEsEaRcH',['oracle-a','oracle-d']]]){await c.page.locator(s('search')).fill(query);await sleep(150);observe(c,`search-${query}`,await ids(c.page),eq(await ids(c.page),expected));}
  await c.page.locator(s('search')).fill('');await c.page.locator(s('filter-project')).selectOption('Atlas');await c.page.locator(s('filter-status')).selectOption('doing');await c.page.locator(s('filter-priority')).selectOption('high');await c.page.locator(s('search')).fill('sources');await sleep(150);observe(c,'filterIntersection',await ids(c.page),eq(await ids(c.page),['oracle-e']));
  const t=await bodyText(c.page);observe(c,'visibleCount',t.match(/.{0,50}(?:\b1\b|\b6\b).{0,80}/g),/\b1\b/.test(t)&&/\b6\b/.test(t));await screenshot(c,'filtered');
  await c.page.locator(s('search')).fill('no-such-research-item');await sleep(150);const n=await notice(c.page,/no (?:tasks|results|matches|matching)|nothing (?:matches|found)|try (?:another|adjusting)|0 (?:tasks|results|matching)/i);observe(c,'noResults',{ids:await ids(c.page),notice:n},(await ids(c.page)).length===0&&n.present);
 },
 A06:async c=>{
  for(const [label,values] of [['blank-title',{title:'   ',project:'Atlas'}],['long-title',{title:'T'.repeat(121),project:'Atlas'}],['long-project',{title:'Valid title',project:'P'.repeat(81)}]]){
   await c.page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:KEY,value:JSON.stringify(B)});await c.page.reload();await openForm(c.page);await fillForm(c.page,values);const title=await c.page.locator(`${s('task-form')} [name="title"]`).inputValue(),project=await c.page.locator(`${s('task-form')} [name="project"]`).inputValue();const constrained=(label==='long-title'&&title.length<=120)||(label==='long-project'&&project.length<=80);await saveForm(c.page);const e=await errorState(c.page),after=await board(c.page);observe(c,label,{constrained,feedback:e,storedCount:after.tasks.length},constrained?validBoard(after):eq(after,B)&&e.hasFeedback);
  }
  await c.page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:KEY,value:JSON.stringify(B)});await c.page.reload();await openForm(c.page);await fillForm(c.page,{title:'Impossible date',project:'Atlas'});const date=c.page.locator(`${s('task-form')} [name="dueDate"]`);const dateResult=await date.evaluate(el=>{el.value='2028-02-30';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return {type:el.type,value:el.value,valid:el.validity.valid};});
  if(dateResult.type==='date'&&dateResult.value==='')observe(c,'invalidCalendarDate',dateResult,true,'Native date input refuses impossible calendar date');else{await saveForm(c.page);observe(c,'invalidCalendarDate',{dateResult,board:await board(c.page),error:await errorState(c.page)},eq(await board(c.page),B)&&(await errorState(c.page)).hasFeedback);}
  await c.page.reload();await openForm(c.page);const modal=await c.page.locator(s('task-form')).evaluate(el=>!!el.closest('dialog,[role="dialog"],[aria-modal="true"]'));if(modal){await c.page.keyboard.press('Escape');observe(c,'modalEscape',{visible:await visible(c.page,s('task-form')),focused:await c.page.locator(s('create-task')).evaluate(el=>el===document.activeElement)},!await visible(c.page,s('task-form'))&&await c.page.locator(s('create-task')).evaluate(el=>el===document.activeElement));}else observe(c,'modalEscape',{modal:false},true,'Conditional: non-modal forms need not close');
 },
 A07:async c=>{
  await c.page.locator(s('search')).fill('literature');const exported=await download(c.page,()=>c.page.locator(s('export')).click());const exportedBoard=JSON.parse(exported.bytes.toString('utf8'));observe(c,'fullExport',{filename:exported.filename,count:exportedBoard.tasks.length,valid:validBoard(exportedBoard)},eq(exportedBoard,B));
  const replacement={schemaVersion:1,tasks:[{...clone(B.tasks[0]),id:'roundtrip-z',title:'Restored research board'}]};
  const cancelled=await importFile(c,replacement,{accept:false});observe(c,'importCancellation',cancelled,cancelled.confirmed&&cancelled.after===cancelled.before);
  const confirmed=await importFile(c,replacement);observe(c,'confirmedReplace',confirmed,confirmed.confirmed&&eq(await board(c.page),replacement));await c.page.reload();observe(c,'importPersists',await board(c.page),eq(await board(c.page),replacement));
  const roundtrip=await importFile(c,exportedBoard);observe(c,'exportRoundtrip',roundtrip,roundtrip.confirmed&&eq(await board(c.page),B));
 },
 A08:async c=>{
  const invalidEnum=clone(B);invalidEnum.tasks[5].status='archived';
  for(const [label,value,raw] of [['malformed','{"schemaVersion":1,"tasks":[',true],['unsupported-schema',{...clone(B),schemaVersion:2},false],['unsupported-enum',invalidEnum,false]]){const r=await importFile(c,value,{raw});const e=await errorState(c.page);observe(c,label,{unchanged:r.after===r.before,error:e},r.after===r.before&&eq(await board(c.page),B)&&e.hasFeedback);}
  await screenshot(c,'import-error');
 },
 A09:async c=>{
  const duplicate=clone(B);duplicate.tasks[5].id=duplicate.tasks[0].id;
  const invalidDate=clone(B);invalidDate.tasks[5].dueDate='2027-02-29';
  const long=clone(B);long.tasks[5].title='T'.repeat(121);
  for(const [label,value] of [['duplicate-ids',duplicate],['non-calendar-date',invalidDate],['overlong-text',long]]){const r=await importFile(c,value);const e=await errorState(c.page);observe(c,label,{unchanged:r.after===r.before,error:e},r.after===r.before&&eq(await board(c.page),B)&&e.hasFeedback);}
 },
 A10:async c=>{const oversized=JSON.stringify(B)+' '.repeat(1024*1024);const r=await importFile(c,oversized,{raw:true});const e=await errorState(c.page);observe(c,'oversized',{bytes:Buffer.byteLength(oversized),unchanged:r.after===r.before,error:e},r.after===r.before&&eq(await board(c.page),B)&&e.hasFeedback);},
 A11:async c=>{
  const title='<img src=x onerror="window.__fieldnoteXSS=1">';const replacement={schemaVersion:1,tasks:[{...clone(B.tasks[0]),id:'xss-text',title,project:'<svg onload="window.__fieldnoteXSS=2">',tags:['<b>literal</b>']}]};
  const r=await importFile(c,replacement);await sleep(200);const actual=await c.page.evaluate(()=>({executed:window.__fieldnoteXSS||0,injected:document.querySelectorAll('[data-testid="task-card"] img[onerror],[data-testid="task-card"] svg[onload]').length,text:document.body.innerText}));observe(c,'hostileText',{confirmed:r.confirmed,executed:actual.executed,injected:actual.injected,literalVisible:actual.text.includes(title),stored:await board(c.page)},r.confirmed&&eq(await board(c.page),replacement)&&actual.executed===0&&actual.injected===0&&actual.text.includes(title));
 },
 A12:async c=>{
  const corrupt='{"schemaVersion":1,"tasks":[BROKEN\n\u00e9';const before=await storage(c.page);const n=await notice(c.page,/corrupt|recover|invalid|unreadable|damaged|could not (?:read|load)|unable to (?:read|load)/i);observe(c,'corruptPreserved',{sameBytes:before===corrupt,notice:n},before===corrupt&&n.present);
  const backup=await buttonByName(c.page,/original|corrupt|raw|recovery|damaged/i,{exclude:/reset/i})||await buttonByName(c.page,/download|backup/i,{exclude:/reset/i})||await buttonByName(c.page,/export/i,{exclude:/reset/i});observe(c,'recoveryDownloadControl',!!backup,!!backup);if(backup){const d=await download(c.page,()=>backup.click());observe(c,'originalBytesDownloaded',{filename:d.filename,bytes:d.bytes.length,sha256:hash(d.bytes)},d.bytes.equals(Buffer.from(corrupt)));}
  const reset=await buttonByName(c.page,/reset|start (?:fresh|over)|clear (?:data|board|storage)/i);observe(c,'resetControl',!!reset,!!reset);if(reset){const beforeDialogs=c.dialogs.length;c.dialogAction='dismiss';await reset.click();await sleep(150);let custom=false;if(c.dialogs.length===beforeDialogs){const cancel=await buttonByName(c.page,/^cancel\b|^keep\b|^no\b/i);if(cancel){custom=true;await cancel.click();}}observe(c,'resetRequiresConfirmation',{dialogCount:c.dialogs.length-beforeDialogs,custom,stored:await storage(c.page)},(c.dialogs.length>beforeDialogs||custom)&&await storage(c.page)===corrupt);c.dialogAction='accept';const acceptedBefore=c.dialogs.length;await reset.click();await sleep(150);if(c.dialogs.length===acceptedBefore){const confirm=await buttonByName(c.page,/^confirm\b|^yes\b|^reset\b|^start (?:fresh|over)/i);if(confirm)await confirm.click();}await sleep(150);let resetBoard=null;try{resetBoard=await board(c.page);}catch{}observe(c,'confirmedResetWorks',{stored:await storage(c.page),valid:validBoard(resetBoard)},validBoard(resetBoard));}
 },
 A13:async c=>{
  const persistedBefore=await storage(c.page);
  await c.page.evaluate(()=>{window.__originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='fieldnote-board:v1')throw new DOMException('Oracle simulated quota exhaustion','QuotaExceededError');return window.__originalSetItem.call(this,key,value);};});
  await openForm(c.page);await fillForm(c.page,{title:'Recover this unsaved change',project:'Atlas',status:'todo',priority:'medium',dueDate:'',tags:'unsaved'});await saveForm(c.page);const n=await notice(c.page,/not saved|unsaved|could not save|cannot save|unable to save|storage.{0,80}(?:full|fail|unavailable|error)|quota|save.{0,40}(?:fail|error)/i);const recoverable=await c.page.evaluate(()=>document.body.innerText.includes('Recover this unsaved change')||Array.from(document.querySelectorAll('input,textarea')).some(el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden'&&el.value==='Recover this unsaved change'));observe(c,'writeFailure',{storedUnchanged:await storage(c.page)===persistedBefore,notice:n,recoverable},await storage(c.page)===persistedBefore&&n.present&&recoverable);await screenshot(c,'unsaved');
 },
 A14:async c=>{
  await openForm(c.page,B.tasks[0].id);await fillForm(c.page,{title:'Stale tab overwrite attempt'});
  const second=await c.context.newPage();await second.goto(c.url);const newer=clone(B);newer.tasks[0].title='Newer work from another tab';newer.tasks.push({...clone(B.tasks[1]),id:'second-tab-new',title:'Preserve newly added work'});await second.evaluate(({key,value})=>localStorage.setItem(key,value),{key:KEY,value:JSON.stringify(newer)});await sleep(220);
  const n=await notice(c.page,/another tab|other tab|changed (?:elsewhere|outside)|conflict|reload|newer|updated (?:elsewhere|outside)/i);observe(c,'crossTabNotice',n,n.present);
  const save=c.page.locator(s('save-task'));if(await save.isVisible()&&await save.isEnabled()){await save.click();await sleep(150);}const after=await board(c.page);observe(c,'newerWorkPreserved',{board:after},eq(after,newer));if(!eq(after,newer))c.manualReview.push('If implementation documents safe conflict reconciliation, inspect this observed board before classifying the stale-write check.');await second.close();
 },
 A15:async c=>{const resourceFailures=c.network.filter(x=>(x.status>=400||x.external)&&!x.url.endsWith('/favicon.ico'));observe(c,'loadedLocalResources',resourceFailures,resourceFailures.length===0);const r=await rendering(c.page);observe(c,'rendering',r,r.scrollWidth<=r.width+1&&r.contentLength>150&&r.brokenImages.length===0&&r.unnamed.length===0);await screenshot(c,'initial');await openForm(c.page);const f=await rendering(c.page);observe(c,'formRendering',f,f.scrollWidth<=f.width+1&&f.unnamed.length===0);await screenshot(c,'form');},
 A16:async c=>{if(c.noJS){const n=await notice(c.page,/JavaScript|scripting/i);observe(c,'noJSNotice',n,n.present&&(await bodyText(c.page)).trim().length>20);}else{const active=await motion(c.page);observe(c,'reducedMotion',active,active.length===0);}}
};

export async function grade({kind,directory,baseUrl,runId,output,browsers=['chromium','webkit'],widths=[360,1440],only=[]}) {
 if(!['landing','app'].includes(kind))throw new Error('--kind must be landing or app');
 if(!/^[a-zA-Z0-9_-]+$/.test(runId||''))throw new Error('Neutral --run-id must contain only letters, digits, underscore or hyphen');
 await fs.mkdir(output,{recursive:true});
 const rubricBytes=await fs.readFile(path.join(ORACLE_DIR,'rubric.json'));
 const report={schemaVersion:1,runId,kind,startedAt:new Date().toISOString(),rubricSha256:hash(rubricBytes),runnerSha256:hash(await fs.readFile(fileURLToPath(import.meta.url))),environment:{node:process.version,platform:process.platform,arch:process.arch},results:[],infrastructureErrors:[]};
 const server=directory?await serve(directory):null,url=baseUrl||server?.url;
 if(!url)throw new Error('Provide directory or baseUrl');
 const origin=new URL(url).origin;
 try{
 for(const browserName of browsers){let browser;
  try{browser=await playwright[browserName].launch({headless:true});}catch(e){report.infrastructureErrors.push({browser:browserName,stage:'launch',error:String(e)});continue;}
  try{for(const width of widths){
   const entries=Object.entries(kind==='landing'?landingChecks:appChecks).filter(([id])=>!only.length||only.includes(id));
   for(const [id,check] of entries){
    const variants=id==='A16'?['no-js','reduced-motion']:['default'];
    for(const variant of variants){
     const noJS=id==='L06'||variant==='no-js',reduced=id==='L07'||variant==='reduced-motion';
     const environment=`${browserName}-${width}${variant==='default'?'':`-${variant}`}`;
     let context,page,stage='context';
     const c={id,environment,browser:browserName,width,url,output,noJS,observations:[],screenshots:[],manualReview:[],console:[],network:[],dialogs:[],dialogAction:'accept'};
     const started=Date.now();
     try{
      context=await browser.newContext({viewport:{width,height:width===360?844:1000},deviceScaleFactor:1,isMobile:width===360,javaScriptEnabled:!noJS,reducedMotion:reduced?'reduce':'no-preference',serviceWorkers:'block',acceptDownloads:true});c.context=context;
      if(kind==='app'&&!noJS){const stored=id==='A01'?null:id==='A12'?' {unused} ':JSON.stringify(B);if(id==='A12'){await context.addInitScript(({key,value})=>{if(!sessionStorage.getItem('__oracleInitialized')){localStorage.setItem(key,value);sessionStorage.setItem('__oracleInitialized','1');}},{key:KEY,value:'{"schemaVersion":1,"tasks":[BROKEN\n\u00e9'});}else if(stored!==null){await context.addInitScript(({key,value})=>{if(!sessionStorage.getItem('__oracleInitialized')){localStorage.setItem(key,value);sessionStorage.setItem('__oracleInitialized','1');}},{key:KEY,value:stored});}}
      await context.route('**/*',async route=>{const request=route.request(),requestUrl=request.url();if(/^https?:/.test(requestUrl)&&new URL(requestUrl).origin!==origin){c.network.push({url:requestUrl,method:request.method(),resourceType:request.resourceType(),external:true,blocked:true});await route.abort('blockedbyclient');}else await route.continue();});
      page=await context.newPage();c.page=page;page.setDefaultTimeout(2500);page.setDefaultNavigationTimeout(15000);
      page.on('console',m=>{if(['error','warning'].includes(m.type()))c.console.push({type:m.type(),text:m.text()});});page.on('pageerror',e=>c.console.push({type:'pageerror',text:e.message}));page.on('response',r=>{if(r.status()>=400)c.network.push({url:r.url(),status:r.status(),external:new URL(r.url()).origin!==origin});});page.on('requestfailed',r=>c.network.push({url:r.url(),failure:r.failure()?.errorText}));page.on('dialog',async d=>{c.dialogs.push({type:d.type(),message:d.message(),action:c.dialogAction});try{await(c.dialogAction==='dismiss'?d.dismiss():d.accept());}catch{}});
      stage='navigation';await page.goto(url,{waitUntil:'networkidle'});await sleep(100);
      stage='scenario';await check(c);
      const fatal=c.console.filter(x=>x.type==='pageerror');
      if(fatal.length)observe(c,'uncaughtRuntimeErrors',fatal,false);
      c.status=c.observations.length&&c.observations.every(o=>o.pass)?'pass':'fail';
     }catch(e){const infrastructure=stage==='context'||['EACCES','ENOSPC','EMFILE','EPIPE'].includes(e.code)||(stage==='navigation'&&/ERR_CONNECTION_REFUSED|ECONNREFUSED/.test(e.message));c.status=infrastructure?'infrastructure-error':'fail';c.error={name:e.name,message:e.message,stage,stack:e.stack?.split('\n').slice(0,5).join('\n')};if(infrastructure)report.infrastructureErrors.push({browser:browserName,width,id,stage,error:e.message});if(page)await screenshot(c,'failure').catch(err=>c.screenshotError=String(err));}
     finally{if(context)await context.close();}
     delete c.context;delete c.page;delete c.dialogAction;delete c.output;delete c.url;
     c.durationMs=Date.now()-started;report.results.push(c);
     await fs.writeFile(path.join(output,'results.partial.json'),JSON.stringify(report,null,2)+'\n');
     process.stdout.write(`${runId} ${environment} ${id} ${c.status}\n`);
    }
   }
  }}finally{await browser.close();}
 }
 }finally{if(server)await server.close();}
 report.finishedAt=new Date().toISOString();report.summary={passed:report.results.filter(r=>r.status==='pass').length,failed:report.results.filter(r=>r.status==='fail').length,scenarioExecutions:report.results.length,infrastructureErrors:report.infrastructureErrors.length,byCheck:Object.fromEntries([...new Set(report.results.map(r=>r.id))].map(id=>[id,{passed:report.results.filter(r=>r.id===id&&r.status==='pass').length,executed:report.results.filter(r=>r.id===id).length}]))};
 await fs.writeFile(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');await fs.rm(path.join(output,'results.partial.json'),{force:true});return report;
}
async function main(){const args=Object.fromEntries(process.argv.slice(2).map((v,i,a)=>v.startsWith('--')?[v.slice(2),a[i+1]]:null).filter(Boolean));const report=await grade({kind:args.kind,directory:args.directory,baseUrl:args['base-url'],runId:args['run-id'],output:args.output||path.join(ORACLE_DIR,'results',args['run-id']),browsers:args.browsers?.split(',')||['chromium','webkit'],widths:args.widths?.split(',').map(Number)||[360,1440],only:args.only?.split(',')||[]});process.stdout.write(JSON.stringify(report.summary,null,2)+'\n');process.exitCode=report.infrastructureErrors.length?2:report.summary.failed?1:0;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e);process.exitCode=2;});
