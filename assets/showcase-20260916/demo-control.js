/* Preview-only, bounded walkthrough actions. Never loaded by the downloadable standalone product. */
(()=>{'use strict';let parentOrigin;try{parentOrigin=new URL(document.referrer).origin;}catch{return;}
// Scroll this document only: scrollIntoView() would also scroll the host page around the frame.
const q=s=>document.querySelector(s),scroll=s=>{const el=q(s);if(el)document.scrollingElement.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+scrollY-16),behavior:'instant'});};
window.addEventListener('message',e=>{if(e.source!==window.parent||e.origin!==parentOrigin||e.data?.type!=='fabius-showcase-step')return;const step=e.data.step;if(!Number.isInteger(step)||step<0||step>6)return;const path=location.pathname;
if(path.includes('/website/')){if(step===0)scroll('.hero');if(step===1){q('[data-testid=feature-capture]').click();scroll('#features');}if(step===2){q('[data-testid=feature-connect]').click();scroll('.feature-layout');}if(step===3){q('[data-testid=billing-yearly]').click();scroll('#pricing');}}
if(path.includes('/app/')){if(step===0)scroll('.project-intro');if(step===1){q('[data-testid=create-task]').click();const f=q('[data-testid=task-form]');f.elements.title.value='Connect field notes to the first draft';f.elements.project.value='Manuscript';f.elements.priority.value='high';f.elements.tags.value='research, writing';}if(step===2){q('[data-testid=save-task]').click();scroll('.board-heading');}if(step===3){q('#view-list-btn').click();q('[data-testid=search]').value='Connect field notes';q('[data-testid=search]').dispatchEvent(new Event('input',{bubbles:true}));scroll('.board-heading');}}
if(path.includes('/math/')){if(step===0)scroll('.intro');else{const slider=q('#parameter');slider.value=[-1.75,-1.25,-.75,-.25,.9,2.9][step-1];slider.dispatchEvent(new Event('input',{bubbles:true}));scroll('.lab');}}
});
window.addEventListener('keydown',e=>{if(e.key!=='Escape'||window.parent===window)return;const inDialog=e.composedPath().some(n=>n instanceof Element&&(n.tagName==='DIALOG'||n.getAttribute('role')==='dialog'));if(!inDialog&&!e.defaultPrevented)window.parent.postMessage({type:'fabius-preview-escape'},parentOrigin);});
})();
