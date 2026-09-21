/* Preview-only walkthrough bridge for the September 21 demonstrations. Never part of a downloadable build. */
(()=>{'use strict';let parentOrigin;try{parentOrigin=new URL(document.referrer).origin;}catch{return;}
// Scroll this document only: scrollIntoView() would also scroll the host page around the frame.
const reveal=el=>{document.scrollingElement.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+scrollY-24),behavior:'instant'});};
window.addEventListener('message',e=>{if(e.source!==window.parent||e.origin!==parentOrigin)return;const d=e.data;
if(d?.type==='fabius-showcase-stop'){document.querySelectorAll('video,audio').forEach(m=>m.pause());return;}
if(d?.type!=='fabius-showcase-step')return;const step=d.step;if(!Number.isInteger(step)||step<0||step>9)return;
const el=document.querySelector('[data-tour-step="'+step+'"]');if(!el)return;
const media=[...document.querySelectorAll('video')],before=media.map(m=>[m.currentTime,m.paused]);
// a toggle that the step means to switch on stays on when the step repeats
if(el.dataset.tourAction==='click'&&el.getAttribute('aria-pressed')!=='true')el.click();
// if the click seeks or starts a film, show the film rather than the control
const moved=media.find((m,i)=>m.currentTime!==before[i][0]||m.paused!==before[i][1]);
reveal(moved||el);
// a film the tour has moved away from stops playing
media.forEach(m=>{const r=m.getBoundingClientRect();if(!m.paused&&(r.bottom<=0||r.top>=innerHeight))m.pause();});});
window.addEventListener('keydown',e=>{if(e.key!=='Escape'||window.parent===window)return;const inDialog=e.composedPath().some(n=>n instanceof Element&&(n.tagName==='DIALOG'||n.getAttribute('role')==='dialog'));if(!inDialog&&!e.defaultPrevented)window.parent.postMessage({type:'fabius-preview-escape'},parentOrigin);});
})();
