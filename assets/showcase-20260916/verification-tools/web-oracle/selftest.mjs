import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {grade,serve,validBoard} from './grade.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const output=path.join(root,'selftest-results');await fs.mkdir(output,{recursive:true});
const cases=[
 ['landing','control',['L02','L03','L04'],true],
 ['landing','menu',['L02'],false],
 ['landing','tabs',['L03'],false],
 ['landing','billing',['L04'],false],
 ['app','control',['A02','A03','A04','A05','A06','A07','A08','A09','A10','A11','A12','A13','A14','A15','A16'],true],
 ['app','order',['A02','A03','A07'],true],
 ['app','atomic',['A08','A09'],false],
 ['app','oversize',['A10'],false],
 ['app','xss',['A11'],false],
 ['app','overwrite-corrupt',['A12'],false],
 ['app','silent-write',['A13'],false],
 ['app','stale',['A14'],false],
 ['app','no-confirm',['A07'],false]
];
const expectedFailedKeys={menu:'escapeClosed',tabs:'tab-capture',billing:'billing-yearly-1',atomic:'unsupported-schema',oversize:'oversized',xss:'hostileText','overwrite-corrupt':'corruptPreserved','silent-write':'writeFailure',stale:'newerWorkPreserved','no-confirm':'importCancellation'};
const results=[];
for(const [kind,defect,only,expectedPass] of cases){
 const server=await serve(path.join(root,'fixtures',kind));
 try{const r=await grade({kind,baseUrl:server.url+`?defect=${defect}`,runId:`selftest-${kind}-${defect}`,output:path.join(output,`${kind}-${defect}`),browsers:defect==='control'?['chromium','webkit']:['chromium'],widths:[360],only});
 const actualPass=r.summary.failed===0&&r.summary.infrastructureErrors===0;
 const expectedFailedKey=expectedFailedKeys[defect];const keyFailed=!!expectedFailedKey&&r.results.some(x=>x.observations.some(o=>o.key===expectedFailedKey&&!o.pass));
 results.push({kind,defect,expectedPass,actualPass,expectedFailedKey,keyFailed,matched:expectedPass?actualPass:!actualPass&&keyFailed&&!r.infrastructureErrors.length,summary:r.summary});
 }finally{await server.close();}
}
await fs.writeFile(path.join(output,'summary.json'),JSON.stringify({results,passed:results.filter(x=>x.matched).length,total:results.length},null,2)+'\n');
console.log(JSON.stringify(results.map(x=>({kind:x.kind,defect:x.defect,matched:x.matched,failed:x.summary.failed})),null,2));
assert.equal(results.filter(x=>!x.matched).length,0,'A positive or negative control did not behave as expected');
assert.equal(validBoard({schemaVersion:1,tasks:[{id:'id',title:'Title',project:'Project',status:'todo',priority:'high',dueDate:'2027-02-29',tags:[]}]}),false);
