const frame=document.querySelector('#screen');
const output=document.querySelector('#results');
const errors=[];
const source=await (await fetch('/index.html')).text();
const loaded=new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
frame.style.width='375px';
frame.srcdoc=source;
await loaded;
const win=frame.contentWindow,doc=frame.contentDocument;
win.addEventListener('error',event=>errors.push(event.message));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await wait(1200);
output.textContent='Preview ready. Select a width and section.';
const show=async()=>{frame.style.width=document.querySelector('#width').value+'px';await wait(100);doc.getElementById(document.querySelector('#section').value)?.scrollIntoView({behavior:'instant',block:'start'});};
document.querySelector('#show').addEventListener('click',show);
document.querySelector('#width').addEventListener('change',show);
document.querySelector('#run').addEventListener('click',async()=>{
 const results=[];
 const check=(name,passed,detail='')=>results.push({name,passed,detail});
 for(const width of [320,375,768,1350,1920]) {
  frame.style.width=width+'px'; await wait(200);
  const overflow=doc.documentElement.scrollWidth>width;
  check('No page overflow at '+width,!overflow,`${doc.documentElement.scrollWidth}/${width}`);
  for(const selector of ['.hero-title','.cap-outcomes','.route-tabs','.route-panel','.route-disclosure','.launch-inner']) {
   const box=doc.querySelector(selector).getBoundingClientRect();
   check(selector+' fits at '+width,box.left>=-1&&box.right<=width+1,`${box.left.toFixed(1)}–${box.right.toFixed(1)}`);
  }
 }
 frame.style.width='375px'; await wait(100);
 const research=doc.querySelector('#route-tab-research');research.click();await wait(100);
 check('Research route updates content',research.getAttribute('aria-selected')==='true'&&doc.querySelector('#route-request').textContent.includes('research question')&&doc.querySelector('#route-name-1').textContent==='scientia');
 research.dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
 check('Arrow key selects automation and moves focus',doc.activeElement.id==='route-tab-automate'&&doc.querySelector('#route-name-1').textContent==='machina');
 doc.activeElement.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Home',bubbles:true}));
 check('Home key restores first tab',doc.activeElement.id==='route-tab-build'&&doc.querySelector('#route-tab-build').getAttribute('aria-selected')==='true');
 doc.querySelector('#motionToggle').click();await wait(100);
 check('Global motion pauses',doc.body.dataset.motion==='paused'&&win.getComputedStyle(doc.querySelector('.orbital-spin')).animationPlayState==='paused'&&doc.querySelector('#mqPause').getAttribute('aria-pressed')==='true');
 doc.querySelector('#mqPause').click();await wait(100);
 check('Original pause button resumes global motion',doc.body.dataset.motion==='running'&&doc.querySelector('#motionToggle').getAttribute('aria-pressed')==='false');
 doc.querySelector('#navToggle').click();
 check('Mobile navigation opens',doc.querySelector('#navToggle').getAttribute('aria-expanded')==='true'&&!doc.querySelector('#mobileMenu').hidden);
 doc.querySelector('#mobileMenu a').click();
 check('Mobile navigation closes after selection',doc.querySelector('#navToggle').getAttribute('aria-expanded')==='false');
 doc.querySelector('#tab-codex').click();check('Existing install tabs work',doc.querySelector('#tab-codex').getAttribute('aria-selected')==='true'&&!doc.querySelector('#panel-codex').hidden);
 doc.querySelector('#tab-any').click();
 for(const id of ['math','swarm','memory','code']) {
  doc.querySelector('#show-tab-'+id).click();await wait(300);
  check('Existing demo tab '+id,doc.querySelector('#show-tab-'+id).getAttribute('aria-selected')==='true');
 }
 doc.querySelector('#show-tab-math').click();
 check('No broken images',![...doc.images].some(img=>img.complete&&img.naturalWidth===0));
 check('No runtime errors',errors.length===0,errors.join('; '));
 output.textContent=JSON.stringify({passed:results.every(r=>r.passed),results},null,2);
 await show();
});
