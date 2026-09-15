import {grade,serve} from './grade.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));const server=await serve(path.join(root,'fixtures/app'));const results=[];
const cases=[['import-phrasing','A08',true],['silent-import','A08',false],['control','A08',true],['control','A06',true],['focus-loss','A06',false]];
try{for(const [defect,id,shouldPass] of cases){const focus=id==='A06';const r=await grade({kind:'app',baseUrl:server.url+`?defect=${defect}`,runId:`wording-${defect}-${id}`,output:path.join(root,'wording-regression',`${defect}-${id}`),browsers:['chromium','webkit'],widths:focus?[360]:[360,1440],only:[id]});const key=focus?'modalEscape':'malformed';const matched=shouldPass?r.summary.failed===0:r.results.every(x=>x.observations.some(o=>o.key===key&&!o.pass));results.push({defect,id,shouldPass,matched,summary:r.summary});}}finally{await server.close();}
await fs.writeFile(path.join(root,'wording-regression','summary.json'),JSON.stringify(results,null,2)+'\n');assert.ok(results.every(x=>x.matched));console.log(JSON.stringify(results,null,2));
