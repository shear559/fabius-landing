import {grade,serve} from './grade.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));const server=await serve(path.join(root,'fixtures/app'));const results=[];
const cases=[['inline-feedback','A06',true],['silent-inline','A06',false],['local-framing','A01',true],['missing-framing','A01',false],['control','A13',true],['silent-write','A13',false]];
try{for(const [defect,id,shouldPass] of cases){const reduced=id==='A13';const r=await grade({kind:'app',baseUrl:server.url+`?defect=${defect}`,runId:`inline-${defect}`,output:path.join(root,'inline-regression',defect),browsers:reduced?['chromium']:['chromium','webkit'],widths:reduced?[360]:[360,1440],only:[id]});const key=id==='A01'?'localFictionFraming':id==='A13'?'writeFailure':'long-title';const matched=shouldPass?r.summary.failed===0:r.results.every(x=>x.observations.some(o=>o.key===key&&!o.pass));results.push({defect,id,shouldPass,matched,summary:r.summary});}}finally{await server.close();}
await fs.writeFile(path.join(root,'inline-regression','summary.json'),JSON.stringify(results,null,2)+'\n');assert.ok(results.every(x=>x.matched));console.log(JSON.stringify(results,null,2));
