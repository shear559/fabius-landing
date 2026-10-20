import {STORAGE_KEY, records, parseNote, noteRecord, retrieve, routes} from './experience-model.mjs';

const $ = s=>document.querySelector(s);
const $$ = s=>[...document.querySelectorAll(s)];
const element=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};

// This selector changes the explanatory diagram only. No model connection is made.
$$('[data-engine]').forEach(button=>button.addEventListener('click',()=>{
  $$('[data-engine]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  $('[data-engine-label]').textContent=button.dataset.engine;
  $('[data-engine-output]').textContent=button.dataset.engine+' + available tools';
}));

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const motionButton=$('[data-motion-toggle]');
let motionPaused=false;
function applyMotion(){
  const pause=motionPaused||reduced.matches;
  document.documentElement.classList.toggle('motion-paused',pause);
  motionButton.setAttribute('aria-pressed',String(pause));
  motionButton.textContent=reduced.matches?'Reduced motion':pause?'Resume motion':'Pause motion';
  motionButton.disabled=reduced.matches;
  $$('svg').forEach(svg=>{try{pause||document.hidden||svg.dataset.offscreen==='true'?svg.pauseAnimations():svg.unpauseAnimations();}catch{}});
}
motionButton.addEventListener('click',()=>{motionPaused=!motionPaused;applyMotion();});
reduced.addEventListener('change',applyMotion);applyMotion();
const lab=$('.engine-lab');
if('IntersectionObserver' in window)new IntersectionObserver(entries=>lab.classList.toggle('is-visible',entries[0].isIntersecting)).observe(lab);
else lab.classList.add('is-visible');
document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('page-hidden',document.hidden);applyMotion();});
if('IntersectionObserver' in window){
  const shapes=new IntersectionObserver(entries=>{entries.forEach(({target,isIntersecting})=>target.dataset.offscreen=String(!isIntersecting));applyMotion();});
  $$('.shape-object').forEach(svg=>shapes.observe(svg));
}

let route='launch',step=0;
function renderRoute(){
  const data=routes[route];
  $('[data-route-brief]').textContent=data.brief;
  const list=$('[data-route-steps]');list.replaceChildren();
  data.steps.forEach(([title,description],index)=>{
    const li=element('li',undefined,index===step?'is-current':index<step?'is-complete':'');
    li.append(element('span',String(index+1).padStart(2,'0'),'step-number'));
    const body=element('div');body.append(element('b',title),element('p',description));li.append(body);
    if(index===step)li.setAttribute('aria-current','step');list.append(li);
  });
  $('[data-route-count]').textContent=`${String(step+1).padStart(2,'0')} / 06`;
  $('[data-route-next]').textContent=step===5?'Replay route ↻':'Next step →';
  $('[data-route-live]').textContent=`Step ${step+1}: ${data.steps[step].join('. ')}`;
}
$$('[data-route]').forEach(b=>b.addEventListener('click',()=>{route=b.dataset.route;step=0;$$('[data-route]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderRoute();}));
$('[data-route-next]').addEventListener('click',()=>{step=(step+1)%6;renderRoute();});renderRoute();

let saved=null,storageAvailable=true;
function readStorage(){try{return parseNote(localStorage.getItem(STORAGE_KEY));}catch{storageAvailable=false;return null;}}
saved=readStorage();
function currentRecords(){return saved?[...records,noteRecord(saved)]:[...records];}
function renderRecords(){
  const list=$('[data-memory-records]');list.replaceChildren();
  currentRecords().forEach(record=>{
    const row=element('div',undefined,'memory-record'+(record.status==='superseded'?' is-superseded':''));
    row.dataset.record=record.id;row.append(element('span',record.status==='current'?'CURRENT':'HISTORY','record-state'),element('strong',record.title),element('code',record.source));list.append(row);
  });
  $('[data-memory-status]').textContent=storageAvailable?'LOCAL DEMO':'TEMPORARY SESSION';
}
function renderContext(){
  const matches=retrieve($('#memory-query').value,currentRecords());
  const region=$('[data-memory-context]');region.replaceChildren();
  $$('.memory-record').forEach(row=>row.classList.toggle('is-recalled',matches.some(r=>r.id===row.dataset.record)));
  if(!matches.length){region.append(element('p','No current decision matches. Try “brand”, “accounts”, “accessibility” or “saved”.','memory-empty'));return;}
  region.append(element('p',`${matches.length} current ${matches.length===1?'record':'records'} selected`,'context-count'));
  matches.forEach(record=>{const article=element('article');article.dataset.context=record.id;article.append(element('code',record.source),element('p',record.body));region.append(article);});
}
$('[data-memory-form]').addEventListener('submit',e=>{e.preventDefault();renderContext();});
$$('[data-memory-query]').forEach(button=>button.addEventListener('click',()=>{$('#memory-query').value=button.dataset.memoryQuery;renderContext();}));
$('[data-memory-save]').addEventListener('submit',e=>{
  e.preventDefault();const note=$('#memory-note').value.trim();if(!note||note.length>180)return;
  saved=note;try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,note}));storageAvailable=true;}catch{storageAvailable=false;}
  $('#memory-query').value='saved';renderRecords();renderContext();
  $('[data-memory-notice]').textContent=storageAvailable?'Decision saved in this browser. Start a new demo session or reload the page to retrieve it. Nothing was sent to a server or model. Reset removes this note.':'Browser storage is unavailable. Your note is kept only on this page and will disappear on reload; nothing was sent to a server or model.';
});
$('[data-memory-session]').addEventListener('click',()=>{
  // Discard page-only user state and reconstruct the note from storage.
  saved=null;saved=readStorage();$('#memory-note').value='';$('#memory-query').value=saved?'saved':'accounts offline';renderRecords();renderContext();
  $('[data-memory-session-note]').textContent=saved?'New demo session. Your saved decision was read back from this browser’s storage.':storageAvailable?'New demo session. No saved note was found; the fictional project’s current account decision is shown.':'New demo session. Storage is unavailable, so the temporary note was not retained.';
});
$('[data-memory-reset]').addEventListener('click',()=>{
  try{localStorage.removeItem(STORAGE_KEY);storageAvailable=true;}catch{storageAvailable=false;}
  saved=null;$('#memory-note').value='';$('#memory-query').value='brand design';renderRecords();renderContext();
  $('[data-memory-notice]').textContent=storageAvailable?'Demo reset. The saved note was removed from this browser. The remaining project records are fictional examples.':'The page state was reset. Browser storage could not be accessed; a previously saved note may remain in browser storage.';
  $('[data-memory-session-note]').textContent='Retrieve a decision, then start a new session to read it again from local storage.';
});
renderRecords();renderContext();
if(!storageAvailable)$('[data-memory-notice]').textContent='Browser storage is unavailable. This example works in temporary page memory; saved notes will not survive a reload.';
