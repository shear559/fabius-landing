import {grade,serve} from './grade.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));const server=await serve(path.join(root,'fixtures/landing'));const results=[];
try{for(const defect of ['control','missing-anchor']){const r=await grade({kind:'landing',baseUrl:server.url+`?defect=${defect}`,runId:`anchor-${defect}`,output:path.join(root,'anchor-regression',defect),browsers:['chromium','webkit'],widths:[360,1440],only:['L01']});const matched=defect==='control'?r.summary.failed===0:r.results.every(x=>x.observations.some(o=>o.key==='navigationTargets'&&!o.pass));results.push({defect,matched,summary:r.summary});}}finally{await server.close();}
await fs.writeFile(path.join(root,'anchor-regression','summary.json'),JSON.stringify(results,null,2)+'\n');assert.ok(results.every(x=>x.matched));console.log(JSON.stringify(results,null,2));
