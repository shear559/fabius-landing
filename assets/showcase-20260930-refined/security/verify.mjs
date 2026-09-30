import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { evaluate, counterfactual, DEFAULT_CONTEXT, ROLES, RESOURCES, ACTIONS } = createRequire(import.meta.url)('./policy.js');
const base = { ...DEFAULT_CONTEXT };
let fixedCases = 0;
const check = (name, changes, action, allowed, code) => {
  const result = evaluate({ ...base, ...changes }, action);
  assert.equal(result.allowed, allowed, name);
  assert.equal(result.code, code, name);
  assert.ok(result.reason.length > 0 && result.trace.length > 0, name);
  fixedCases++;
};
check('Editor edits own team document', {}, 'edit', true, 'WRITE_GRANTED');
check('Revoking ownership removes edit', { owner: false }, 'edit', false, 'OWNER_REQUIRED');
check('Cross-team owner cannot edit', { sameTeam: false }, 'edit', false, 'TEAM_MISMATCH');
check('Removing session removes edit', { authenticated: false }, 'edit', false, 'SESSION_REQUIRED');
check('Viewer may read team document', { role: 'Viewer', owner: false }, 'read', true, 'READ_GRANTED');
check('Viewer cannot edit even their own document', { role: 'Viewer' }, 'edit', false, 'READ_ONLY');
check('Guest denied restricted read', { role: 'Guest', resource: 'Restricted', authenticated: false }, 'read', false, 'SESSION_REQUIRED');
check('Authenticated guest still cannot read team', { role: 'Guest' }, 'read', false, 'GUEST_SCOPE');
check('Guest can read public without session or team', { role: 'Guest', resource: 'Public', authenticated: false, sameTeam: false }, 'read', true, 'PUBLIC_READ');
check('Public editing still requires team', { role: 'Admin', resource: 'Public', sameTeam: false }, 'edit', false, 'TEAM_MISMATCH');
check('Restricted read requires ownership', { resource: 'Restricted', owner: false }, 'read', false, 'OWNER_REQUIRED');
check('Restricted owner can read', { resource: 'Restricted' }, 'read', true, 'READ_GRANTED');
check('Admin reads restricted within team', { resource: 'Restricted', role: 'Admin', owner: false }, 'read', true, 'READ_GRANTED');
check('Admin cannot bypass team', { role: 'Admin', sameTeam: false, mfa: true }, 'delete', false, 'TEAM_MISMATCH');
check('Admin delete denies without MFA', { role: 'Admin' }, 'delete', false, 'MFA_REQUIRED');
check('Admin delete grants with MFA', { role: 'Admin', mfa: true }, 'delete', true, 'DELETE_GRANTED');
check('MFA cannot elevate Editor to delete', { mfa: true }, 'delete', false, 'ADMIN_REQUIRED');
check('Editor shares own team document', {}, 'share', true, 'WRITE_GRANTED');
check('Admin cannot share restricted document', { role: 'Admin', resource: 'Restricted', mfa: true }, 'share', false, 'RESTRICTED_SHARING');
check('Restricted document owner cannot share', { resource: 'Restricted' }, 'share', false, 'RESTRICTED_SHARING');

const invalid = [null, undefined, [], {}, 1, 'Admin', { ...base, role: 'Root' }, { ...base, resource: 'Unknown' }, { ...base, mfa: 'true' }, { ...base, authenticated: 1 }, { ...base, extra: true }, Object.create(base), { ...base, [Symbol('extra')]: true }, { ...base, get role() { throw new Error('Accessors must not run'); } }, new Proxy({}, { ownKeys() { throw new Error('Unreadable context'); } })];
for (const context of invalid) {
  const result = evaluate(context, 'read');
  assert.equal(result.code, 'INVALID_INPUT');
  assert.ok(result.trace.some(step => step.status === 'deny'), 'Malformed input must have a denial trace');
}
for (const key of Object.keys(base)) {
  const context = { ...base };
  delete context[key];
  assert.equal(evaluate(context, 'read').allowed, false, `Missing ${key} must fail closed`);
}
for (const action of ['unknown', '', 'READ', null, undefined, 1]) assert.equal(evaluate(base, action).code, 'INVALID_INPUT');
let exhaustive = 0;
for (const role of ROLES) for (const resource of RESOURCES) for (const authenticated of [false, true]) for (const mfa of [false, true]) for (const sameTeam of [false, true]) for (const owner of [false, true]) for (const action of ACTIONS) {
  const context = { ...base, role, resource, authenticated, mfa, sameTeam, owner };
  const before = JSON.stringify(context);
  const result = evaluate(context, action);
  assert.equal(JSON.stringify(context), before, 'Evaluator mutates input');
  assert.deepEqual(result, evaluate(context, action), 'Evaluator is not deterministic');
  if (result.allowed && !(resource === 'Public' && action === 'read')) {
    assert.equal(authenticated, true);
    assert.notEqual(role, 'Guest');
    assert.equal(sameTeam, true);
  }
  if (result.allowed && action === 'delete') assert.ok(role === 'Admin' && mfa);
  if (resource === 'Restricted' && action === 'share') assert.equal(result.allowed, false);
  if (role === 'Viewer' && action !== 'read') assert.equal(result.allowed, false);
  if (result.allowed && role === 'Editor' && action !== 'read') assert.equal(owner, true);
  if (!result.allowed) assert.ok(result.trace.some(step => step.status === 'deny'));
  exhaustive++;
}
console.log(`PASS: ${fixedCases} fixed policy cases, ${invalid.length + Object.keys(base).length + 6} invalid-input cases, ${exhaustive} exhaustive decisions. No mutation; deterministic results; deny transitions verified.`);

const held = {...base, role:'Admin', resource:'Restricted', mfa:false, device:'Unmanaged', legalHold:true};
const denied = evaluate(held,'delete');
assert.equal(denied.candidateGrant,'DELETE_GRANTED');
assert.deepEqual(denied.denies.map(d=>d.code),['LEGAL_HOLD','DEVICE_REQUIRED','MFA_REQUIRED']);
assert.equal(denied.allowed,false);
const repair = counterfactual(held,'delete');
assert.equal(repair.cardinality,3);
assert.deepEqual(new Set(repair.changes.map(c=>c.key)),new Set(['mfa','device','legalHold']));
for(let mask=0;mask<8;mask++){
 const modified={...held};repair.changes.forEach((c,i)=>{if(mask&(1<<i))modified[c.key]=c.value;});
 assert.equal(evaluate(modified,'delete').allowed,mask===7,'Every proper subset of the repair must remain denied');
}
assert.equal(counterfactual({...base,role:'Admin',resource:'Restricted'},'share'),null);
assert.equal(counterfactual({...base,role:'Guest',resource:'Restricted'},'read'),null);
assert.equal(evaluate({...base,role:'Admin',resource:'Public',revoked:true},'read').code,'ACCESS_REVOKED');
assert.equal(evaluate({...base,role:'Admin',actorTenant:'Boreal',mfa:true},'delete').code,'TENANT_MISMATCH');
assert.equal(evaluate({...base,role:'Guest',resource:'Public',authenticated:false,actorTenant:'Boreal'},'read').allowed,false);
assert.equal(evaluate({...base,role:'Viewer',resource:'Team',device:'Unmanaged'},'read').allowed,true);
assert.equal(evaluate({...base,role:'Admin',resource:'Restricted',device:'Unmanaged'},'read').code,'DEVICE_REQUIRED');
assert.equal(evaluate({...base,role:'Admin',mfa:true,legalHold:true},'edit').allowed,true,'Hold blocks deletion only');
for(const bad of [{device:'Unknown'},{actorTenant:'Unknown'},{resourceTenant:0},{revoked:'false'},{legalHold:null}])assert.equal(evaluate({...base,...bad},'read').code,'INVALID_INPUT');
let abac=0;
const names=['authenticated','mfa','sameTeam','owner','revoked','legalHold'];
for(const role of ROLES)for(const resource of RESOURCES)for(const action of ACTIONS)for(const actorTenant of ['Atlas','Boreal'])for(const resourceTenant of ['Atlas','Boreal'])for(const device of ['Managed','Unmanaged'])for(let mask=0;mask<64;mask++){
 const c={role,resource,actorTenant,resourceTenant,device,...Object.fromEntries(names.map((n,i)=>[n,Boolean(mask&(1<<i))]))};
 const r=evaluate(c,action),publicRead=resource==='Public'&&action==='read';
 if(r.allowed){assert.equal(c.revoked,false);assert.equal(actorTenant,resourceTenant);assert.equal(r.denies.length,0);assert.ok(r.candidateGrant);if(!publicRead)assert.ok(c.authenticated&&c.sameTeam&&role!=='Guest');if(resource==='Restricted'||action!=='read')assert.equal(device,'Managed');if(action==='delete')assert.ok(role==='Admin'&&c.mfa&&!c.legalHold);}
 if(r.denies.length)assert.equal(r.allowed,false);
 if(c.revoked||actorTenant!==resourceTenant||(c.legalHold&&action==='delete'))assert.equal(r.allowed,false);
 abac++;
}
console.log(`PASS ${abac} multi-tenant ABAC decisions; explicit-deny precedence; managed-device scope; public tenant isolation; three-fact minimal repair and all proper subsets; immutable counterfactual scope.`);

let accessorReads=0;
const accessorContext={...base};Object.defineProperty(accessorContext,'role',{enumerable:true,get(){accessorReads++;return 'Admin';}});
assert.equal(evaluate(accessorContext,'delete').code,'INVALID_INPUT');assert.equal(accessorReads,0,'Untrusted getters must not execute');
const allBoundaries=evaluate({...held,revoked:true,actorTenant:'Boreal',authenticated:false,sameTeam:false},'delete');
assert.deepEqual(allBoundaries.denies.map(d=>d.code),['ACCESS_REVOKED','TENANT_MISMATCH','LEGAL_HOLD','SESSION_REQUIRED','TEAM_MISMATCH','DEVICE_REQUIRED','MFA_REQUIRED']);
assert.equal(allBoundaries.code,'ACCESS_REVOKED');assert.equal(allBoundaries.candidateGrant,'DELETE_GRANTED');
const beforeRepair=JSON.stringify(held);assert.deepEqual(counterfactual(held,'delete'),repair);assert.equal(JSON.stringify(held),beforeRepair);
console.log('PASS no getter execution, seven simultaneous denies in explicit precedence order, deterministic non-mutating counterfactual.');
