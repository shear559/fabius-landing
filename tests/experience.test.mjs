import {test} from 'node:test';
import assert from 'node:assert/strict';
import {records,parseNote,noteRecord,retrieve} from '../experience-model.mjs';

test('retrieval excludes superseded decisions even for an exact old title',()=>{
  assert.deepEqual(retrieve('accounts offline').map(r=>r.id),['accounts']);
  assert.ok(retrieve('Require sign-in on arrival').every(r=>r.status==='current'));
  assert.equal(records.filter(r=>r.status==='superseded').length,1);
});
test('empty and unrelated queries return no invented context',()=>{
  for(const query of ['', '   ', 'zzzzunmatched', '!?'])assert.deepEqual(retrieve(query),[]);
});
test('saved decisions round-trip and can be recalled alongside fixture records',()=>{
  const note='Keep navigation compact on mobile.';
  const decoded=parseNote(JSON.stringify({version:1,note}));
  assert.equal(decoded,note);
  assert.equal(retrieve('saved',[...records,noteRecord(decoded)])[0].body,note);
  assert.equal(records.length,4);
});
test('corrupt, oversized and unsupported stored values are ignored',()=>{
  for(const raw of [null,'{broken','null','[]','{"version":2,"note":"hello"}','{"version":1,"note":12}',JSON.stringify({version:1,note:' '.repeat(20)}),JSON.stringify({version:1,note:'x'.repeat(181)})])assert.equal(parseNote(raw),null);
});
test('matching is case-insensitive, deduplicates terms and remains bounded',()=>{
  assert.deepEqual(retrieve('BRAND brand'),retrieve('brand'));
  assert.ok(retrieve('brand accounts keyboard saved',[...records,noteRecord('A saved note')]).length<=3);
});
