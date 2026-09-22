/* Preview-only walkthrough bridge for the September 21 demonstrations. Never part of a downloadable build. */
(()=>{'use strict';let parentOrigin;try{parentOrigin=new URL(document.referrer).origin;}catch{return;}
// Scroll this document only: scrollIntoView() would also scroll the host page around the frame.
const reveal=el=>{document.scrollingElement.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+scrollY-24),behavior:'instant'});};
// Each step's click happens once per page load, so a repeated step never flips a toggle back.
const clicked=new Set();
window.addEventListener('message',e=>{if(e.source!==window.parent||e.origin!==parentOrigin)return;const d=e.data;
if(d?.type==='fabius-showcase-stop'){document.querySelectorAll('video,audio').forEach(m=>m.pause());return;}
if(d?.type!=='fabius-showcase-step')return;const step=d.step;if(!Number.isInteger(step)||step<0||step>9)return;
const el=document.querySelector('[data-tour-step="'+step+'"]');if(!el)return;
const media=[...document.querySelectorAll('video')];let moved=null;
if(el.dataset.tourAction==='click'&&!clicked.has(step)&&el.getAttribute('aria-pressed')!=='true'){clicked.add(step);
const before=media.map(m=>[m.currentTime,m.paused]);
// Click a label's control directly: activating a label focuses its input, and in Chromium focus scrolls the host page.
(el.control||el).click();
// A playing film's currentTime drifts between two reads in WebKit, so only a real seek or a play/pause change counts.
moved=media.find((m,i)=>Math.abs(m.currentTime-before[i][0])>0.5||m.paused!==before[i][1])||null;}
reveal(moved||el);
// A film the tour has moved away from stops playing.
media.forEach(m=>{const r=m.getBoundingClientRect();if(!m.paused&&(r.bottom<=0||r.top>=innerHeight))m.pause();});});
window.addEventListener('keydown',e=>{if(e.key!=='Escape'||window.parent===window)return;const inDialog=e.composedPath().some(n=>n instanceof Element&&(n.tagName==='DIALOG'||n.getAttribute('role')==='dialog'));if(!inDialog&&!e.defaultPrevented)window.parent.postMessage({type:'fabius-preview-escape'},parentOrigin);});
})();
