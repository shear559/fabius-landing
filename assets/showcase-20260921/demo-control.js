/* Preview-only walkthrough bridge for the September 21 demonstrations. Never part of a downloadable build. */
(()=>{'use strict';let parentOrigin;try{parentOrigin=new URL(document.referrer).origin;}catch{return;}
window.addEventListener('message',e=>{if(e.source!==window.parent||e.origin!==parentOrigin||e.data?.type!=='fabius-showcase-step')return;const step=e.data.step;if(!Number.isInteger(step)||step<0||step>9)return;const el=document.querySelector('[data-tour-step="'+step+'"]');if(!el)return;if(el.dataset.tourAction==='click')el.click();el.scrollIntoView({behavior:'auto',block:'start'});});
window.addEventListener('keydown',e=>{if(e.key!=='Escape'||window.parent===window)return;const inDialog=e.composedPath().some(n=>n instanceof Element&&(n.tagName==='DIALOG'||n.getAttribute('role')==='dialog'));if(!inDialog&&!e.defaultPrevented)window.parent.postMessage({type:'fabius-preview-escape'},parentOrigin);});
})();
