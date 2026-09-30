import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const M=createRequire(import.meta.url)('./app.js');
const board=M.seedBoard();assert.equal(board.tasks.length,8);assert.equal(M.validateBoardShape(board).valid,true);
assert.deepEqual(board.tasks.reduce((a,t)=>(a[t.status]++,a),{todo:0,doing:0,done:0}),{todo:3,doing:3,done:2});
for(const task of board.tasks){assert.ok(task.description.length>50);assert.ok(task.deliverable.length>10);assert.deepEqual(M.normalizeImportedTask(task),task);}
const legacy={...board.tasks[0]};delete legacy.description;delete legacy.deliverable;assert.equal(M.validateBoardShape({schemaVersion:1,tasks:[legacy]}).valid,true);assert.equal(M.normalizeImportedTask(legacy).description,'');
for(const changes of [{description:2},{description:'a'.repeat(1601)},{deliverable:[]},{deliverable:'a'.repeat(161)},{dueDate:'2026-02-30'},{status:'broken'},{tags:[' bad '] }])assert.equal(M.validateBoardShape({schemaVersion:1,tasks:[{...board.tasks[0],...changes}]}).valid,false);
assert.equal(M.validateBoardShape({schemaVersion:1,tasks:[board.tasks[0],board.tasks[0]]}).valid,false);
assert.equal(M.isValidDateString('2028-02-29'),true);assert.equal(M.isValidDateString('2026-02-29'),false);
assert.deepEqual(M.parseTagsInput(' Field, field, Analysis, ,analysis '),['Field','Analysis']);
const raw={title:'New task',project:'Site Survey',status:'todo',priority:'medium',dueDate:'',tags:'field, FIELD',description:'Document the context.',deliverable:'Observation sheet'};assert.equal(M.validateFormValues(raw).errors.length,0);assert.ok(M.validateFormValues({...raw,title:''}).errors.length>0);assert.ok(M.validateFormValues({...raw,description:'x'.repeat(1601)}).errors.length>0);
for(const file of ['index.html','preview.html']){const html=readFileSync(new URL(file,import.meta.url),'utf8');assert.ok(!/<script(?![^>]*src=)[^>]*>/i.test(html));assert.ok(html.includes('name="description"'));assert.ok(html.includes('name="deliverable"'));}
console.log('PASS: 8 populated task fixtures; backward-compatible import normalization; descriptions/deliverables; malformed imports; duplicate IDs; real dates; tag deduplication; form validation; both HTML twins.');
