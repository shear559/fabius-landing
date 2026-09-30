(() => {
  const P=window.LatticeProduct;
  const $=id=>document.getElementById(id);
  $('film-brand').innerHTML=P.mark+'<span>lattice</span>';
  $('notebook').innerHTML=P.notebook;
  $('source-card').innerHTML=P.sourceCard;
  $('insight-card').innerHTML=P.insight;
  const clamp=v=>Math.max(0,Math.min(1,v));
  const ease=p=>p*p*(3-2*p);
  const at=(t,a,b)=>ease(clamp((t-a)/(b-a)));
  const mix=(a,b,p)=>a+(b-a)*p;
  const pose=(t,keys)=>{
    let a=keys[0],b=keys[keys.length-1];
    for(let i=0;i<keys.length-1;i++){if(t>=keys[i][0]&&t<=keys[i+1][0]){a=keys[i];b=keys[i+1];break;}}
    if(t<=keys[0][0])return keys[0].slice(1);
    if(t>=keys[keys.length-1][0])return keys[keys.length-1].slice(1);
    const p=at(t,a[0],b[0]);return a.slice(1).map((v,i)=>mix(v,b[i+1],p));
  };
  const move=(el,p)=>{const[x,y,s,r,ry]=p;el.style.transform=`translate(${x.toFixed(3)}px,${y.toFixed(3)}px) scale(${s.toFixed(5)}) rotate(${r.toFixed(4)}deg) rotateY(${(ry||0).toFixed(4)}deg)`;};
  const setOpacity=(selector,value)=>{document.querySelector(selector).style.opacity=value.toFixed(4);};
  const beats=[{a:3.3,b:8,title:'Capture the detail.',detail:'An observation, with its source attached.',n:'01'},{a:8,b:13,title:'Make the connection.',detail:'Shade. Soil. Shared space. Keep the relationship in view.',n:'02'},{a:13,b:18,title:'Follow what emerges.',detail:'Bring the source beside the idea.',n:'03'},{a:18,b:23,title:'Give the idea a form.',detail:'A field brief, with its sources still in reach.',n:'04'}];
  window.__seek=t=>{
    t=Math.max(0,Math.min(26,Number(t)||0));
    const opening=1-at(t,2.5,4.2), closing=at(t,22.3,24);
    $('opening').style.opacity=opening.toFixed(4);$('opening').style.transform=`translateY(${-35*at(t,2.5,4.2)}px)`;
    $('closing').style.opacity=closing.toFixed(4);$('closing').style.transform=`translateY(${24*(1-closing)}px)`;
    move($('notebook'),pose(t,[[0,620,40,.78,-7,-12],[2.2,600,30,.8,-6,-10],[4.8,-32,-83,.92,0,0],[7,-22,-76,.94,0,0],[9,-55,-77,.96,0,0],[12,-61,-80,.98,0,0],[14,-280,-58,.88,-2,-6],[17,-290,-64,.9,-2,-6],[19,-35,-76,.95,0,0],[22,-20,-84,.97,0,0],[24,680,4,.74,-5,-12],[26,655,0,.76,-5,-12]]));
    move($('source-card'),pose(t,[[0,0,0,1.04,5,0],[2.5,-16,-15,1.07,3,0],[5,-485,0,.72,0,0],[7,-487,0,.72,0,0],[9,-487,0,.72,0,0]]));
    $('source-card').style.opacity=(1-at(t,4.3,5.4)).toFixed(4);
    move($('insight-card'),pose(t,[[0,80,28,.86,-7,0],[3,65,6,.9,-5,0],[5.2,70,-10,.85,-3,0],[11.8,95,50,.86,3,0],[14,-120,-180,1.23,1,0],[17,-135,-185,1.26,1,0],[19,-90,-120,.8,0,0],[24,60,150,.83,3,0],[26,40,140,.85,3,0]]));
    const insightVis=(1-at(t,2.8,4.3))+(at(t,12.1,13.7)*(1-at(t,17.2,18.8)))+at(t,23.3,24.9);
    $('insight-card').style.opacity=Math.min(1,insightVis).toFixed(4);
    const graph=at(t,7.2,8.5)*(1-at(t,17.2,18.6));
    const brief=at(t,17.2,18.6);
    setOpacity('.view-capture',(1-at(t,7.2,8.5)));
    setOpacity('.view-connect',graph);setOpacity('.view-brief',brief);
    document.querySelectorAll('.connection-lines path').forEach((p,i)=>{p.style.strokeDashoffset=(1-at(t,8+i*.35,9.2+i*.35)).toFixed(4);});
    document.querySelectorAll('.graph-note').forEach((el,i)=>{const p=at(t,7.8+i*.2,9+i*.2);el.style.opacity=p.toFixed(4);el.style.transform=`translateY(${20*(1-p)}px)`;});
    setOpacity('.capture-text',at(t,3.6,4.6));setOpacity('.view-capture blockquote',at(t,4.7,5.7));setOpacity('.view-capture .source-row',at(t,5.3,6.3));
    const tag=at(t,5.5,6.4)*(1-at(t,7.1,7.7));$('source-tag').style.opacity=tag.toFixed(4);$('source-tag').style.transform=`translateY(${18*(1-tag)}px)`;
    $('view-name').textContent=t<7.8?'Notebook':t<17.8?'Connections':'Field brief';
    const beat=beats.find(b=>t>=b.a&&t<b.b);$('beat-copy').style.opacity=beat?(at(t,beat.a,beat.a+.6)*(1-at(t,beat.b-.5,beat.b))).toFixed(4):'0';
    if(beat){$('beat-number').textContent=beat.n;$('beat-title').textContent=beat.title;$('beat-detail').textContent=beat.detail;}
    $('chapter-label').textContent=t<3.3?'A thought becomes a field brief.':t<23?beat?.title||'Urban ecology notebook':'Capture. Connect. Develop.';
    document.querySelector('.atmosphere').style.transform=`translate(${mix(0,-100,at(t,3,20))}px,0) rotate(${mix(-10,15,t/26)}deg)`;
    window.__time=t;
    return t;
  };
  window.__ready=Promise.all([document.fonts.load('500 112px Rubik'),document.fonts.load('400 20px Rubik')]).then(()=>document.fonts.ready).then(()=>{window.__seek(Number(new URLSearchParams(location.search).get('t'))||0);});
})();
