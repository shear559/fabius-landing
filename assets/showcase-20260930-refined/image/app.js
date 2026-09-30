(() => {
  'use strict';
  const $=id=>document.getElementById(id),surface=$('artwork'),picture=$('art-image'),zoomInput=$('zoom');
  const details={
    full:{name:'Full composition',title:'Life, in intricate detail.',description:'An imagined ecology of diatoms, radiolarians and drifting plankton. Delicate structures hold warm light against the depth of the ocean.',x:.5,y:.5,zoom:1},
    silica:{name:'01 / Silica lace',title:'A shell made of light.',description:'A radiolarian-inspired form, imagined as a delicate lattice of translucent struts. Cool edges reveal the pattern; a warm center gives it depth.',x:.72,y:.2,zoom:2.6},
    light:{name:'02 / Living light',title:'Warmth within the glass.',description:'The central form brings intricate membranes and a glowing amber core into focus. It is the visual anchor in a sea of fine, repeating structures.',x:.49,y:.47,zoom:2.6},
    colony:{name:'03 / In company',title:'A rhythm of small worlds.',description:'Ribbon-like colonies drift between the focal structures. Repeated cells create a diagonal rhythm and carry the eye beyond the frame.',x:.15,y:.68,zoom:2.6}
  };
  let state={detail:'full',zoom:1,x:.5,y:.5},drag=null;
  function render(){
    const w=surface.clientWidth,h=surface.clientHeight,z=state.zoom;
    state.x=Math.min(1-1/(2*z),Math.max(1/(2*z),state.x));state.y=Math.min(1-1/(2*z),Math.max(1/(2*z),state.y));
    picture.style.setProperty('--zoom',z);picture.style.setProperty('--pan-x',(0.5-state.x)*w*z+'px');picture.style.setProperty('--pan-y',(0.5-state.y)*h*z+'px');
    surface.classList.toggle('is-zoomed',z>1);surface.tabIndex=z>1?0:-1;surface.setAttribute('aria-label',z>1?'Enlarged artwork. Use arrow keys or drag to explore.':'Complete artwork');
    zoomInput.value=z;$('zoom-value').textContent=z.toFixed(1)+'×';
    const d=details[state.detail];$('view-name').textContent=d.name;$('frame-label').textContent=z===1?'THE COMPLETE COMPOSITION':d.name.toUpperCase()+' / DETAIL';$('detail-heading').textContent=d.title;$('detail-description').textContent=d.description;
    document.querySelectorAll('[data-detail]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.detail===state.detail)));
  }
  function select(name){const d=details[name];state={detail:name,zoom:d.zoom,x:d.x,y:d.y};render();}
  document.querySelectorAll('[data-detail]').forEach(el=>el.addEventListener('click',()=>select(el.dataset.detail)));
  zoomInput.addEventListener('input',()=>{state.zoom=Number(zoomInput.value);if(state.zoom===1)state={detail:'full',zoom:1,x:.5,y:.5};render();});
  $('reset-view').addEventListener('click',()=>select('full'));
  surface.addEventListener('pointerdown',e=>{if(state.zoom<=1||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,cx:state.x,cy:state.y};surface.setPointerCapture(e.pointerId);surface.classList.add('is-dragging');});
  surface.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;state.x=drag.cx-(e.clientX-drag.x)/(surface.clientWidth*state.zoom);state.y=drag.cy-(e.clientY-drag.y)/(surface.clientHeight*state.zoom);render();});
  const release=()=>{drag=null;surface.classList.remove('is-dragging');};surface.addEventListener('pointerup',release);surface.addEventListener('pointercancel',release);surface.addEventListener('lostpointercapture',release);
  surface.addEventListener('keydown',e=>{if(state.zoom<=1)return;const directions={ArrowLeft:[-.04,0],ArrowRight:[.04,0],ArrowUp:[0,-.04],ArrowDown:[0,.04]};if(directions[e.key]){e.preventDefault();state.x+=directions[e.key][0];state.y+=directions[e.key][1];render();}});
  new ResizeObserver(render).observe(surface);render();
})();
