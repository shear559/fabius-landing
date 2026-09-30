(() => {
  const formats=[{id:'billboard',name:'Widescreen',w:1920,h:1080},{id:'social',name:'Portrait',w:1080,h:1350},{id:'story',name:'Story',w:1080,h:1920},{id:'square',name:'Square',w:1080,h:1080},{id:'card',name:'Link card',w:1200,h:630}];
  const mount=(element,format='billboard')=>{
    const f=formats.find(f=>f.id===format)||formats[0],p=window.LatticeProduct;
    element.className='artboard';element.dataset.format=f.id;element.style.width=f.w+'px';element.style.height=f.h+'px';
    element.innerHTML=`<div class="art-atmosphere" data-layer="atmosphere"></div><div class="art-contours" data-layer="atmosphere"><i></i><i></i><i></i></div><div class="art-brand" data-layer="type">${p.mark}<b>lattice</b></div><div class="art-type" data-layer="type"><span>A NOTEBOOK FOR THE CURIOUS</span><h1>Small notes.<br><em>Living ideas.</em></h1><p>Give your ideas somewhere to go.</p><div class="art-sequence"><span>Capture</span><i>→</i><span>Connect</span><i>→</i><span>Develop</span></div></div><div class="product-composition" data-layer="notebook"><div class="notebook">${p.notebook}</div></div><div class="source-card art-source" data-layer="fragments">${p.sourceCard}</div><div class="insight-card art-insight" data-layer="fragments">${p.insight}</div><div class="art-foot" data-layer="type"><span>IDEAS TAKE SHAPE HERE.</span><span>FICTIONAL PRODUCT / SYNTHETIC NOTEBOOK</span></div>`;
    return f;
  };
  window.LatticeArt={formats,mount};
})();
