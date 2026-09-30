(()=>{'use strict';const q=s=>document.querySelector(s),NS='http://www.w3.org/2000/svg';function svg(tag,attrs){const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;}
const names=['Holding the left edge.','Free to find its course.','Following the floor.','A pause at the corner.','Along the boundary.','The final resting point.'];
const descriptions=['The incentive on x is still too weak to leave x = 0. The best balance holds y at ¼.','No inequality is active. The optimum moves through the interior as the incentive on x increases.','The path has reached y = 0. It moves right along the bottom edge while remaining feasible.','Both y = 0 and the slanted constraint are active. The optimum stays at (½, 0, ½).','The optimum leaves the corner and follows 2y + z = ½, trading y and z as x increases.','The bound x = ⅗ meets the slanted edge. The optimum remains here for the rest of the interval.'];
const intervals=['−2 ≤ t ≤ −3/2','−3/2 ≤ t ≤ −1','−1 ≤ t ≤ −1/2','−1/2 ≤ t ≤ 0','0 ≤ t ≤ 9/5','9/5 ≤ t ≤ 4'];const points=[-1.75,-1.25,-.75,-.25,.9,2.9];const labels=['Left edge','Interior','Bottom edge','Corner','Slanted edge','Final corner'];
function solve(t){let x,y,z,r,nu,l=[0,0,0,0,0];if(t<=-1.5){x=0;y=.25;z=.75;r=0;nu=-21/4;l[0]=-3-2*t;}else if(t<=-1){x=9/8+3*t/4;y=-.5-t/2;z=3/8-t/4;r=1;nu=t-15/4;}else if(t<=-.5){x=5/8+t/4;y=0;z=3/8-t/4;r=2;nu=3*t/2-13/4;l[1]=2+2*t;}else if(t<=0){x=.5;y=0;z=.5;r=3;nu=2*t-3;l[1]=-2*t;l[4]=1+2*t;}else if(t<=1.8){x=.5+t/18;y=t/18;z=.5-t/9;r=4;nu=11*t/6-3;l[4]=1+10*t/9;}else{x=.6;y=.1;z=.3;r=5;nu=.3;l[3]=2*t-18/5;l[4]=3;}return{x,y,z,r,nu,l,value:x*x+2*y*y+3*z*z+x*y-y*z+(2-2*t)*x+5*y+z};}
// One unit is 350 SVG units on BOTH axes. Geometry is generated from constraints.
const SCALE=350,OX=64,OY=432,px=x=>OX+SCALE*x,py=y=>OY-SCALE*y;
const fmt=n=>(Math.abs(n)<.0000001?0:n).toFixed(4);
const vertices=[[0,0],[.5,0],[.6,.1],[.6,.4],[0,1]];
const pathOf=pts=>pts.map(([x,y],i)=>(i?'L':'M')+px(x)+','+py(y)).join('');
const polygon=pathOf(vertices)+'Z';
q('#clip-polygon').setAttribute('d',polygon);q('#feasible-polygon').setAttribute('d',polygon);
q('#geometry').dataset.scaleX=SCALE;q('#geometry').dataset.scaleY=SCALE;
const edges=[
 {id:'x',name:'x = 0',ends:[[0,1],[0,0]],slack:s=>s.x},
 {id:'y',name:'y = 0',ends:[[0,0],[.5,0]],slack:s=>s.y},
 {id:'z',name:'z = 0',ends:[[.6,.4],[0,1]],slack:s=>s.z},
 {id:'cap',name:'x = 3/5',ends:[[.6,.1],[.6,.4]],slack:s=>.6-s.x},
 {id:'slant',name:'2y + z = 1/2',ends:[[.5,0],[.6,.1]],slack:s=>2*s.y+s.z-.5}
];
edges.forEach(e=>q('#boundary-edges').append(svg('path',{d:pathOf(e.ends),class:'boundary-edge','data-constraint':e.id})));
q('#optimizer-path').setAttribute('d',pathOf([[0,.25],[.375,0],[.5,0],[.6,.1]]));
vertices.forEach(([x,y])=>q('#vertices').append(svg('circle',{cx:px(x),cy:py(y),r:3.5,'data-x':x,'data-y':y})));
for(let i=0;i<=10;i++){
 const v=i/10;
 q('#grid').append(svg('line',{x1:px(v),x2:px(v),y1:py(1),y2:py(0),class:i===0?'axis-line':'grid-line'}));
 q('#grid').append(svg('line',{x1:px(0),x2:px(1),y1:py(v),y2:py(v),class:i===0?'axis-line':'grid-line'}));
}
function label(text,x,y,cls,anchor='middle'){const n=svg('text',{x,y,class:cls,'text-anchor':anchor});n.textContent=text;q('#axis-labels').append(n);}
for(const [v,l] of [[0,'0'],[.25,'¼'],[.5,'½'],[.75,'¾'],[1,'1']]){label(l,px(v),458,'axis-tick');if(v)label(l,47,py(v)+5,'axis-tick','end');}
label('x',447,438,'axis-name');label('y',64,51,'axis-name');
const bandStops=[0,.025,.07,.15,.28,.45,.65,.82,1];
const bandColors=['#198da5','#41abc2','#70c5d2','#9cd9dc','#b9dded','#c4d9f4','#d2d8f7','#e0ddf9','#eeebfa'];
// Complete square: g = g(c) + 4(dx + dy)^2 + 2dy^2.
// These filled ellipses are exact objective sublevel sets, clipped to the pentagon.
function paintContours(t,s){
 const cx=9/8+3*t/4,cy=-.5-t/2;
 const g=(x,y)=>4*x*x+8*x*y+6*y*y-(5+2*t)*x-3*y+4;
 const centerValue=g(cx,cy),maxValue=Math.max(...vertices.map(([x,y])=>g(x,y)));
 const span=maxValue-s.value;
 q('#objective-span').textContent=span.toFixed(2)+' · highest';
 q('#contours').replaceChildren();
 for(let k=bandStops.length-1;k>=0;k--){
  const level=s.value+span*bandStops[k],r=Math.max(0,level-centerValue);let d='';
  for(let i=0;i<=180;i++){const a=i/180*2*Math.PI,dy=Math.sqrt(r/2)*Math.sin(a),dx=Math.sqrt(r)/2*Math.cos(a)-dy;d+=(i?'L':'M')+px(cx+dx)+','+py(cy+dy);}
  q('#contours').append(svg('path',{d:d+'Z',class:'contour',fill:bandColors[k],'data-level':level}));
 }
}
const vx=t=>8+(t+2)/6*294,vy=v=>96-(v+2.2)/6*84;const joins=[-1.5,-1,-.5,0,1.8];const valueGrid=svg('g',{});joins.forEach(t=>valueGrid.append(svg('line',{x1:vx(t),x2:vx(t),y1:8,y2:98,class:'value-join'})));q('#value-chart').prepend(valueGrid);let path='';for(let i=0;i<=240;i++){let t=-2+i/40;path+=(i?'L':'M')+vx(t)+','+vy(solve(t).value);}q('#value-line').setAttribute('d',path);q('#value-area').setAttribute('d',path+'L302,98L8,98Z');
const rx=t=>46+(t+2)/6*688,ry=v=>198-v*182;
for(const v of [0,.25,.5,.75,1]){q('#response-grid').append(svg('line',{x1:46,x2:734,y1:ry(v),y2:ry(v),class:'grid-line'}));const n=svg('text',{x:32,y:ry(v)+5,'text-anchor':'end'});n.textContent=v;q('#response-grid').append(n);}
for(const t of [-2,0,2,4]){const n=svg('text',{x:rx(t),y:228,'text-anchor':'middle'});n.textContent=t;q('#response-grid').append(n);}
joins.forEach(t=>q('#response-grid').append(svg('line',{x1:rx(t),x2:rx(t),y1:16,y2:198,class:'value-join'})));
for(const k of ['x','y','z']){let d='';[-2,...joins,4].forEach((t,i)=>{d+=(i?'L':'M')+rx(t)+','+ry(solve(t)[k]);});q('#response-paths').append(svg('path',{d,class:'series-'+k}));q('#response-points').append(svg('circle',{id:'response-'+k,r:5,class:'series-'+k}));}
const formulas=[['0','1/4','3/4','x = 0'],['9/8 + 3t/4','−1/2 − t/2','3/8 − t/4','None'],['5/8 + t/4','0','3/8 − t/4','y = 0'],['1/2','0','1/2','y = 0; 2y + z = 1/2'],['1/2 + t/18','t/18','1/2 − t/9','2y + z = 1/2'],['3/5','1/10','3/10','x = 3/5; 2y + z = 1/2']];
formulas.forEach((f,i)=>{const tr=document.createElement('tr'),td=document.createElement('td'),b=document.createElement('button');b.type='button';b.textContent=intervals[i];b.onclick=()=>{stop();slider.value=points[i];paint();};td.append(b);tr.append(td);f.forEach(v=>{const c=document.createElement('td');c.textContent=v;tr.append(c);});q('#regime-record').append(tr);});
function detail(t,s,h,station){
 const input=q('#parameter-entry');if(document.activeElement!==input)input.value=String(t);
 q('#live-finding').textContent='At t = '+t.toFixed(3)+', '+descriptions[s.r];
 for(const k of ['x','y','z']){q('#allocation-'+k).style.width=(s[k]*100)+'%';q('#response-'+k).setAttribute('cx',rx(t));q('#response-'+k).setAttribute('cy',ry(s[k]));}
 q('#response-cursor').setAttribute('x1',rx(t));q('#response-cursor').setAttribute('x2',rx(t));q('#sensitivity').textContent=fmt(-2*s.x);
 const constraints=['x ≥ 0','y ≥ 0','z ≥ 0','x ≤ 3/5','2y + z ≥ 1/2'];q('#constraint-table').replaceChildren();constraints.forEach((name,i)=>{const tr=document.createElement('tr'),binding=Math.abs(h[i])<1e-9;tr.dataset.binding=binding;[name,fmt(-h[i]),fmt(s.l[i]),binding?'Binding':'Slack'].forEach(v=>{const c=document.createElement('td');c.textContent=v;tr.append(c);});q('#constraint-table').append(tr);});
 const residual=v=>v===0?'0':v.toExponential(2);
 q('#residual-equality').textContent=residual(Math.abs(s.x+s.y+s.z-1));q('#residual-stationarity').textContent=residual(Math.max(...station.map(Math.abs)));q('#residual-complementarity').textContent=residual(Math.max(...h.map((v,i)=>Math.abs(v*s.l[i]))));
 q('#regime-record').querySelectorAll('tr').forEach((row,i)=>{row.dataset.active=s.r===i;row.querySelector('button').setAttribute('aria-pressed',String(s.r===i));});
}
let timer=null;const slider=q('#parameter'),play=q('#play'),reduce=matchMedia('(prefers-reduced-motion: reduce)');function stop(){clearInterval(timer);timer=null;play.textContent=reduce.matches?'Next':'Play sweep';play.setAttribute('aria-pressed','false');}
const buttons=points.map((t,i)=>{const b=document.createElement('button');b.type='button';b.innerHTML='<span>0'+(i+1)+'</span>'+labels[i];b.title=intervals[i];b.onclick=()=>{stop();slider.value=t;paint();};q('#regime-tabs').append(b);return b;});
function paint(){const t=Number(slider.value),s=solve(t);q('#parameter-value').textContent=t.toFixed(2);slider.setAttribute('aria-valuetext','t equals '+t.toFixed(3)+', '+labels[s.r]);q('#regime-title').textContent=names[s.r];q('#regime-description').textContent=descriptions[s.r];if([-1.5,-1,-.5,0,1.8].some(v=>Math.abs(t-v)<1e-9))q('#regime-description').textContent='At a transition: adjacent formulas meet at the same optimum. The highlighted boundaries include every binding inequality, even when its multiplier is zero.';q('#regime-count').textContent='0'+(s.r+1)+' / 06';for(const k of ['x','y','z'])q('#'+k+'-value').textContent=fmt(s[k]);q('#minimum-value').textContent=fmt(s.value);buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(s.r===i)));for(const id of ['#optimum','#optimum-halo']){q(id).setAttribute('cx',px(s.x));q(id).setAttribute('cy',py(s.y));}q('#point-label').setAttribute('transform','translate('+(s.x>.3?px(s.x)-174:px(s.x)+22)+','+(py(s.y)-86)+')');q('#point-coordinates').textContent='('+s.x.toFixed(3)+', '+s.y.toFixed(3)+')';// Binding constraints are determined from slack, including zero-multiplier joins.
const active=edges.filter(e=>Math.abs(e.slack(s))<1e-9);
q('#active-edge').setAttribute('d',active.map(e=>pathOf(e.ends)).join(''));
q('#active-edge').dataset.constraints=active.map(e=>e.id).join(' ');
q('#active-summary').textContent=active.length?'Binding now: '+active.map(e=>e.name).join(' · '):'Interior optimum: no inequality is binding.';
paintContours(t,s);
q('#value-cursor').setAttribute('x1',vx(t));q('#value-cursor').setAttribute('x2',vx(t));q('#value-dot').setAttribute('cx',vx(t));q('#value-dot').setAttribute('cy',vy(s.value));const mult=q('#multipliers');mult.replaceChildren();['ν','λx','λy','λz','λcap','λslant'].forEach((name,i)=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=fmt([s.nu,...s.l][i]);mult.append(dt,dd);});
const h=[-s.x,-s.y,-s.z,s.x-.6,.5-2*s.y-s.z],station=[2*s.x+s.y+2-2*t+s.nu-s.l[0]+s.l[3],s.x+4*s.y-s.z+5+s.nu-s.l[1]-2*s.l[4],6*s.z-s.y+1+s.nu-s.l[2]-s.l[4]];const ok=Math.abs(s.x+s.y+s.z-1)<1e-9&&h.every(v=>v<1e-9)&&s.l.every(v=>v>=-1e-9)&&station.every(v=>Math.abs(v)<1e-9)&&h.every((v,i)=>Math.abs(v*s.l[i])<1e-9);q('#certificate-summary').textContent=ok?'Feasible · stationary · complementary':'Certificate residual exceeds tolerance';q('.certificate').dataset.valid=String(ok);detail(t,s,h,station);}
q('#parameter-entry').onchange=e=>{stop();if(e.target.value!==''&&Number.isFinite(Number(e.target.value))){slider.value=Math.max(-2,Math.min(4,Number(e.target.value)));}e.target.value=slider.value;paint();};
slider.oninput=()=>{stop();paint();};play.onclick=()=>{if(timer){stop();return;}if(reduce.matches){slider.value=points[(solve(Number(slider.value)).r+1)%6];paint();return;}if(Number(slider.value)>=4)slider.value=-2;play.textContent='Pause sweep';play.setAttribute('aria-pressed','true');timer=setInterval(()=>{slider.value=Math.min(4,Number(slider.value)+.015);paint();if(Number(slider.value)>=4)stop();},40);};reduce.addEventListener('change',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});stop();paint();})();
