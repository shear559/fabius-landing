(() => {
  'use strict';
  const canvas=document.getElementById('art');
  const gl=canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:true,depth:true});
  if(!gl)throw new Error('WebGL is required to render the original artwork.');
  const vertex=`
  precision highp float;
  attribute vec2 aUV;
  uniform mat4 uVP;
  uniform float uTime,uRing,uKind,uBloom,uWave;
  varying vec3 vP,vN;
  varying float vBand;
  vec3 turnX(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,p.y*c-p.z*s,p.y*s+p.z*c);}
  vec3 turnZ(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x*c-p.y*s,p.x*s+p.y*c,p.z);}
  vec3 surface(vec2 uv){
    float u=uv.x,v=uv.y;
    if(uKind>0.5){float radius=1.05-uBloom*.15;return radius*vec3(cos(u)*sin(v),cos(v),sin(u)*sin(v));}
    float r=1.27+uRing*.148;
    float w=.068+.012*sin(uRing*.43);
    float h=.031;
    float wave=uWave*(.14+uRing*.013)*sin(u*3.+uRing*.34+uTime*.27);
    vec3 p=vec3((r+cos(v)*w)*cos(u),sin(v)*h+wave,(r+cos(v)*w)*sin(u));
    p=turnX(p,.12*sin(uRing*.46)+uBloom*(uRing-7.)*.075);
    p=turnZ(p,.32+uBloom*.35*sin(uRing*.37)+.055*sin(uTime*.22));
    p.y+=(uRing-7.)*.016*(1.+uBloom*2.);
    return p;
  }
  void main(){vec3 p=surface(aUV);vec3 n=uKind>.5?normalize(p):normalize(cross(surface(aUV+vec2(.001,0.))-p,surface(aUV+vec2(0.,.001))-p));vP=p;vN=n;vBand=uRing;gl_Position=uVP*vec4(p,1.);}
  `;
  const fragment=`
  precision highp float;
  uniform vec3 uEye,uLight;
  uniform float uKind,uTime;
  varying vec3 vP,vN;
  varying float vBand;
  float shadow(vec3 p,vec3 d){vec3 q=p+d*.06;float b=dot(q,d),c=dot(q,q)-1.08;float h=b*b-c;return h>0.&&-b-sqrt(h)>0.? .15:1.;}
  void main(){
    vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;
    vec3 V=normalize(uEye-vP),L=normalize(uLight-vP),L2=normalize(vec3(-3.,4.,-4.)-vP);
    vec3 H=normalize(L+V),H2=normalize(L2+V);
    float nd=max(0.,dot(N,L)),nd2=max(0.,dot(N,L2));
    float fres=pow(1.-max(0.,dot(N,V)),4.);
    float spec=pow(max(0.,dot(N,H)),95.);
    float broad=pow(max(0.,dot(N,H)),16.);
    float fill=pow(max(0.,dot(N,H2)),68.);
    float shade=uKind>.5?1.:shadow(vP,L);
    vec3 warm=vec3(1.,.62,.28),white=vec3(.87,.9,.92);
    vec3 color;
    if(uKind>.5){
      float grain=sin(vP.x*44.+sin(vP.y*13.))*sin(vP.z*31.+vP.y*27.);
      color=vec3(.016,.021,.025)*(0.65+nd*.6+grain*.045);
      color+=warm*(spec*.52+broad*.05)*shade+white*fill*.085;
      color+=mix(vec3(.023,.033,.045),warm*.08,nd)*fres;
    }else{
      float brushed=.91+.09*sin(vP.x*170.+vP.z*137.+vBand*2.);
      vec3 metal=mix(vec3(.15,.17,.18),vec3(.26,.19,.11),.3+.25*sin(vBand*.27));
      color=metal*(.13+nd*.62*shade+nd2*.12);
      color+=warm*(spec*2.8+broad*.34)*shade*brushed;
      color+=white*fill*.52;
      color+=mix(vec3(.12,.14,.16),warm*.22,nd)*fres*.5;
    }
    color=1.-exp(-color*1.45);
    color=pow(color,vec3(1./2.2));
    float noise=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
    gl_FragColor=vec4(color+noise/255.,1.);
  }`;
  const bgVert='attribute vec2 aUV;varying vec2 uv;void main(){uv=aUV;gl_Position=vec4(aUV*2.-1.,.999,1.);}';
  const bgFrag=`precision highp float;varying vec2 uv;uniform float uTime;void main(){vec2 p=(uv-.5)*vec2(1.777,1.);float haze=exp(-length(p-vec2(.24,.06))*3.3);float glow=exp(-length(p-vec2(-.44,.21))*7.);float vignette=smoothstep(1.1,.28,length(p));vec3 c=vec3(.027,.035,.046)+vec3(.028,.021,.01)*haze+vec3(.026,.017,.007)*glow;c*=.6+.4*vignette;float n=fract(sin(dot(gl_FragCoord.xy,vec2(127.1,311.7)))*43758.5453)-.5;gl_FragColor=vec4(c+n/255.,1.);}`;
  function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  function program(v,f){const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,v));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
  const material=program(vertex,fragment),background=program(bgVert,bgFrag);
  function mesh(rows,cols,vMax){const data=[];for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const u=i/rows*Math.PI*2,un=(i+1)/rows*Math.PI*2,v=j/cols*vMax,vn=(j+1)/cols*vMax;data.push(u,v,un,v,u,vn,un,v,un,vn,u,vn);}const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return{buffer,count:data.length/2};}
  const ring=mesh(200,10,Math.PI*2),sphere=mesh(100,60,Math.PI);
  const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);
  function bind(p,m){gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);const a=gl.getAttribLocation(p,'aUV');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);}
  const uniform=(p,n)=>gl.getUniformLocation(p,n);
  const U=Object.fromEntries(['VP','Time','Ring','Kind','Bloom','Wave','Eye','Light'].map(k=>[k,uniform(material,'u'+k)]));
  const sub=(a,b)=>a.map((n,i)=>n-b[i]);
  const norm=a=>{const m=Math.hypot(...a);return a.map(n=>n/m);};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
  const multiply=(a,b)=>{const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;};
  function camera(eye,target,fov){const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);const f=1/Math.tan(fov*Math.PI/360),n=.1,far=100;const projection=new Float32Array([f/(1920/1080),0,0,0,0,f,0,0,0,0,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0]);return multiply(projection,view);}
  const clamp=v=>Math.max(0,Math.min(1,v)),ease=p=>p*p*(3-2*p);
  const interpolate=(t,keys)=>{if(t<=keys[0][0])return keys[0].slice(1);if(t>=keys.at(-1)[0])return keys.at(-1).slice(1);let a,b;for(let i=0;i<keys.length-1;i++)if(t>=keys[i][0]&&t<keys[i+1][0]){a=keys[i];b=keys[i+1];break;}const p=ease((t-a[0])/(b[0]-a[0]));return a.slice(1).map((n,i)=>n+(b[i+1]-n)*p);};
  const keys=[[0,5.7,3.8,8.2,0,0,0,42,.1,.05],[3.5,4.2,4.4,7.5,0,0,0,42,.12,.12],[7,1.0,1.7,5.0,.6,.1,.1,39,.18,.28],[11,-3.3,6.9,7.0,0,0,0,43,.4,.9],[15,-5.4,3.4,7.2,0,0,0,43,1,.55],[19.96,-.15,8.0,6.4,0,0,0,44,.1,.08]];
  const acts=[['I','FORM'],['II','ORBIT'],['III','TIDE'],['IV','RELEASE'],['V','AFTERLIGHT']];
  window.__seek=t=>{
    if(!Number.isFinite(t))throw Error('Time must be finite');t=Math.max(0,Math.min(20,t));
    const p=interpolate(t,keys),eye=p.slice(0,3),target=p.slice(3,6);
    gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.03,.035,.04,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);gl.useProgram(background);bind(background,{buffer:quad});gl.uniform1f(uniform(background,'uTime'),t);gl.drawArrays(gl.TRIANGLES,0,6);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.disable(gl.CULL_FACE);gl.useProgram(material);
    gl.uniformMatrix4fv(U.VP,false,camera(eye,target,p[6]));gl.uniform3fv(U.Eye,eye);gl.uniform3fv(U.Light,[-3.6+Math.sin(t*.2)*3,5.4,4.2+Math.cos(t*.17)*2]);
    gl.uniform1f(U.Time,t);gl.uniform1f(U.Bloom,p[7]);gl.uniform1f(U.Wave,p[8]);
    bind(material,ring);gl.uniform1f(U.Kind,0);for(let i=0;i<16;i++){gl.uniform1f(U.Ring,i);gl.drawArrays(gl.TRIANGLES,0,ring.count);}
    bind(material,sphere);gl.uniform1f(U.Kind,1);gl.uniform1f(U.Ring,0);gl.drawArrays(gl.TRIANGLES,0,sphere.count);
    gl.finish();const act=acts[Math.min(4,Math.floor(t/4))];document.getElementById('act-number').textContent=act[0];document.getElementById('act-name').textContent=act[1];
    return{time:t,act:act[1],eye,geometry:{rings:16,ringVertices:ring.count,sphereVertices:sphere.count},bloom:p[7],wave:p[8]};
  };
  window.__ready=document.fonts.load('400 20px Rubik').then(()=>document.fonts.ready).then(()=>window.__seek(Number(new URLSearchParams(location.search).get('t'))||0));
})();
