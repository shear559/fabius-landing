import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import{fileURLToPath}from'node:url';
import{execFileSync}from'node:child_process';
import{solve,reduced,vertices,feasible,joins,regimes}from'./model.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
// Independent geometric oracle: minimize the quadratic on every segment,
// then compare with its unconstrained stationary point, when feasible.
function oracle(t){const candidates=[];for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length],d=[b[0]-a[0],b[1]-a[1]],grad=[8*a[0]+8*a[1]-5-2*t,8*a[0]+12*a[1]-3],den=8*d[0]**2+16*d[0]*d[1]+12*d[1]**2;const u=Math.max(0,Math.min(1,-(d[0]*grad[0]+d[1]*grad[1])/den));candidates.push([a[0]+u*d[0],a[1]+u*d[1]]);}const rhs=[5+2*t,3],stationary=[(12*rhs[0]-8*rhs[1])/32,(-8*rhs[0]+8*rhs[1])/32];if(feasible(...stationary))candidates.push(stationary);return candidates.reduce((a,b)=>reduced(t,...a)<reduced(t,...b)?a:b);}
let maxCoordinateError=0,maxValueError=0,maxResidual=0;
for(let i=0;i<=6000;i++){const t=-2+i/1000,s=solve(t),o=oracle(t);assert(s.certified);assert(s.slack.every(x=>x>=-1e-12));assert(s.l.every(x=>x>=-1e-12));maxCoordinateError=Math.max(maxCoordinateError,Math.abs(s.x-o[0]),Math.abs(s.y-o[1]));maxValueError=Math.max(maxValueError,Math.abs(s.value-reduced(t,...o)));maxResidual=Math.max(maxResidual,...Object.values(s.residuals));}
assert(maxCoordinateError<1e-10);assert(maxValueError<1e-10);assert(maxResidual<1e-10);
for(const t of joins){const left=solve(t-1e-9),right=solve(t+1e-9);for(const key of['x','y','z','value','derivative'])assert(Math.abs(left[key]-right[key])<1e-8);assert(solve(t).binding.some(Boolean));}
for(const r of regimes){const t=r.sample,h=1e-5,numeric=(solve(t+h).value-solve(t-h).value)/(2*h);assert(Math.abs(numeric-solve(t).derivative)<1e-8);}
for(const t of[NaN,Infinity,-Infinity,-2.01,4.01,'1',true,null])assert.throws(()=>solve(t));
assert.equal(fs.readFileSync(path.join(root,'preview.html'),'utf8').replace('<script defer src="../demo-control.js"></script>',''),fs.readFileSync(path.join(root,'index.html'),'utf8'));
const tour=JSON.parse(fs.readFileSync(path.join(root,'TOUR.json')));assert(Array.isArray(tour)&&tour.length>=5&&tour.length<=6);
const python=JSON.parse(execFileSync('python3',['verify.py'],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}}));assert(python.passed);
const result={passed:true,sampledParameters:6001,oracle:'Independent full-edge minimization plus the feasible unconstrained stationary point',maxCoordinateError,maxValueError,maxResidual,joins:5,invalidInputs:8,python};
console.log(JSON.stringify(result,null,2));
