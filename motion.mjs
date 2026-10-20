// Keep decorative contours in step with the original marquee's pause control.
const shapes=[...document.querySelectorAll('.shape-object')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const control=document.querySelector('#mqPause');
function sync(){
  const paused=reduced.matches||document.hidden||control?.getAttribute('aria-pressed')==='true';
  shapes.forEach(svg=>{
    if(paused||svg.dataset.offscreen==='true')svg.pauseAnimations();
    else svg.unpauseAnimations();
  });
}
if(control)new MutationObserver(sync).observe(control,{attributes:true,attributeFilter:['aria-pressed']});
reduced.addEventListener('change',sync);
document.addEventListener('visibilitychange',sync);
if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(({target,isIntersecting})=>target.dataset.offscreen=String(!isIntersecting));
    sync();
  });
  shapes.forEach(svg=>observer.observe(svg));
}
sync();
