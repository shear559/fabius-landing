// The six solution and multiplier formulas are preserved from the exact proof.
export const vertices=[[0,0],[.5,0],[.6,.1],[.6,.4],[0,1]];
export const joins=[-1.5,-1,-.5,0,1.8];
export const regimes=[
 {label:'Left edge',title:'The optimum holds its position.',sample:-1.75,interval:'−2 ≤ t ≤ −3/2',description:'The incentive on x is too weak to leave x = 0. The allocation stays at (0, ¼, ¾).'},
 {label:'Interior',title:'Now the optimum moves freely.',sample:-1.25,interval:'−3/2 ≤ t ≤ −1',description:'No inequality is binding. Increasing the incentive on x moves the optimum through the feasible interior.'},
 {label:'Bottom edge',title:'The floor changes its course.',sample:-.75,interval:'−1 ≤ t ≤ −1/2',description:'The optimum has reached y = 0. It continues along the bottom edge as x increases.'},
 {label:'Corner',title:'More incentive. The same point.',sample:-.25,interval:'−1/2 ≤ t ≤ 0',description:'Two constraints hold the optimum at (½, 0, ½). Its position stays fixed while its objective value changes.'},
 {label:'Slanted edge',title:'A constraint guides the next move.',sample:.9,interval:'0 ≤ t ≤ 9/5',description:'The optimum follows 2y + z = ½. Both x and y increase while z decreases.'},
 {label:'Final corner',title:'The cap brings movement to a stop.',sample:2.9,interval:'9/5 ≤ t ≤ 4',description:'The optimum reaches x = ⅗ and stays at (3/5, 1/10, 3/10). The incentive continues to lower its objective value.'}
];
export const constraints=[
 {id:'x',name:'x ≥ 0',boundary:'x = 0',ends:[[0,1],[0,0]]},
 {id:'y',name:'y ≥ 0',boundary:'y = 0',ends:[[0,0],[.5,0]]},
 {id:'z',name:'z ≥ 0',boundary:'z = 0',ends:[[.6,.4],[0,1]]},
 {id:'cap',name:'x ≤ 3/5',boundary:'x = 3/5',ends:[[.6,.1],[.6,.4]]},
 {id:'slant',name:'2y + z ≥ 1/2',boundary:'2y + z = 1/2',ends:[[.5,0],[.6,.1]]}
];
export function objective(t,x,y,z=1-x-y){return x*x+2*y*y+3*z*z+x*y-y*z+(2-2*t)*x+5*y+z;}
export function reduced(t,x,y){return 4*x*x+8*x*y+6*y*y-(5+2*t)*x-3*y+4;}
export function feasible(x,y,eps=1e-12){const z=1-x-y;return x>=-eps&&y>=-eps&&z>=-eps&&x<=.6+eps&&2*y+z>=.5-eps;}
export function solve(t){
 if(typeof t!=='number'||!Number.isFinite(t)||t< -2||t>4)throw new RangeError('t must be a finite number in [−2, 4]');
 let x,y,z,r,nu,l=[0,0,0,0,0];
 if(t<=-1.5){x=0;y=.25;z=.75;r=0;nu=-21/4;l[0]=-3-2*t;}
 else if(t<=-1){x=9/8+3*t/4;y=-.5-t/2;z=3/8-t/4;r=1;nu=t-15/4;}
 else if(t<=-.5){x=5/8+t/4;y=0;z=3/8-t/4;r=2;nu=3*t/2-13/4;l[1]=2+2*t;}
 else if(t<=0){x=.5;y=0;z=.5;r=3;nu=2*t-3;l[1]=-2*t;l[4]=1+2*t;}
 else if(t<=1.8){x=.5+t/18;y=t/18;z=.5-t/9;r=4;nu=11*t/6-3;l[4]=1+10*t/9;}
 else{x=.6;y=.1;z=.3;r=5;nu=.3;l[3]=2*t-18/5;l[4]=3;}
 const slack=[x,y,z,.6-x,2*y+z-.5];
 const stationarity=[2*x+y+2-2*t+nu-l[0]+l[3],x+4*y-z+5+nu-l[1]-2*l[4],6*z-y+1+nu-l[2]-l[4]];
 const residuals={equality:Math.abs(x+y+z-1),stationarity:Math.max(...stationarity.map(Math.abs)),complementarity:Math.max(...slack.map((v,i)=>Math.abs(v*l[i])))};
 return{t,x,y,z,r,nu,l,slack,binding:slack.map(v=>Math.abs(v)<1e-9),value:objective(t,x,y,z),derivative:-2*x,residuals,certified:feasible(x,y)&&l.every(v=>v>=-1e-9)&&Object.values(residuals).every(v=>v<1e-9)};
}
