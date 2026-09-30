import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const M=createRequire(import.meta.url)('./model.js');
const notes=M.createNotebook();
assert.equal(notes.length,5);
for(const n of notes)for(const id of n.links){assert.ok(notes.some(t=>t.id===id));assert.ok(notes.find(t=>t.id===id).links.includes(n.id));}
assert.deepEqual(M.searchNotes(notes,' SHADE ').map(n=>n.id),['n1','n3','n5']);
assert.equal(M.searchNotes(notes,'zzzzzz').length,0);
const before=JSON.stringify(notes),added=M.addNote(notes,'A new field note','Keep observations distinct from interpretations.');
assert.equal(JSON.stringify(notes),before);assert.equal(added.length,6);
assert.throws(()=>M.addNote(notes,'','Body'));
assert.throws(()=>M.addNote(notes,'Title','x'.repeat(2401)));
const connected=M.connectNotes(added,'n6','n2');assert.ok(connected[5].links.includes('n2'));assert.ok(connected[1].links.includes('n6'));
assert.deepEqual(M.connectNotes(connected,'n6','n2'),connected);
assert.throws(()=>M.connectNotes(connected,'n6','n6'));assert.throws(()=>M.connectNotes(connected,'bad','n1'));
const draft=M.makeDraft(connected);assert.match(draft,/\[N06\]|\[N6\]/);assert.match(draft,/Synthetic research example/);
assert.match(M.exportNotebook(connected,'MY EDITED BRIEF'),/MY EDITED BRIEF/);
for(const file of ['index.html','preview.html']){const html=readFileSync(new URL(file,import.meta.url),'utf8');assert.ok(!/<script(?![^>]*src=)[^>]*>/i.test(html));assert.ok(!/\sonclick=/i.test(html));}
console.log('PASS: reciprocal source links, search, capture validation, immutable note updates, idempotent connections, draft sources, edited-draft export and external-script HTML checks.');
