import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { evaluate, ROLES, RESOURCES, ACTIONS } = createRequire(import.meta.url)('./policy.js');
const base = { role: 'Editor', resource: 'Team', authenticated: true, mfa: false, sameTeam: true, owner: true };
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
  const context = { role, resource, authenticated, mfa, sameTeam, owner };
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
