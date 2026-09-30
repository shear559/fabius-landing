(function (root) {
  'use strict';
  const ROLES = Object.freeze(['Viewer', 'Editor', 'Admin', 'Guest']);
  const RESOURCES = Object.freeze(['Public', 'Team', 'Restricted']);
  const ACTIONS = Object.freeze(['read', 'edit', 'share', 'delete']);
  const TENANTS = Object.freeze(['Atlas', 'Boreal']);
  const DEVICES = Object.freeze(['Managed', 'Unmanaged']);
  const DEFAULT_CONTEXT = Object.freeze({ role: 'Editor', resource: 'Team', authenticated: true, mfa: false, sameTeam: true, owner: true, actorTenant: 'Atlas', resourceTenant: 'Atlas', device: 'Managed', revoked: false, legalHold: false });
  const FIELDS = Object.freeze(Object.keys(DEFAULT_CONTEXT));
  const flags = FIELDS.filter(key => typeof DEFAULT_CONTEXT[key] === 'boolean');
  function validate(context, action) {
    try {
      if (context === null || typeof context !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(context))) return null;
      const descriptors = Object.getOwnPropertyDescriptors(context);
      if (Reflect.ownKeys(descriptors).length !== FIELDS.length || !FIELDS.every(key => Object.hasOwn(descriptors, key) && Object.hasOwn(descriptors[key], 'value'))) return null;
      const values = Object.fromEntries(FIELDS.map(key => [key, descriptors[key].value]));
      return ROLES.includes(values.role) && RESOURCES.includes(values.resource) && ACTIONS.includes(action) && flags.every(key => typeof values[key] === 'boolean') && TENANTS.includes(values.actorTenant) && TENANTS.includes(values.resourceTenant) && DEVICES.includes(values.device) ? values : null;
    } catch { return null; }
  }
  function freezeResult(result) { result.trace.forEach(Object.freeze); result.denies.forEach(Object.freeze); Object.freeze(result.trace); Object.freeze(result.denies); return Object.freeze(result); }
  function evaluate(context, action) {
    const value = validate(context, action);
    if (!value) return freezeResult({ allowed: false, code: 'INVALID_INPUT', reason: 'Unrecognized policy input.', candidateGrant: null, denies: [{ code: 'INVALID_INPUT', reason: 'Unrecognized policy input.' }], trace: [{ id: 'input', title: 'Known policy input', status: 'deny', detail: 'Unknown, missing, accessor-valued or unreadable facts fail closed.' }] });
    const { role, resource, authenticated, mfa, sameTeam, owner, actorTenant, resourceTenant, device, revoked, legalHold } = value;
    const publicRead = resource === 'Public' && action === 'read';
    const admin = role === 'Admin';
    let candidateGrant = null;
    let defaultCode = 'READ_ONLY', defaultReason = 'Viewer is a read-only role.';
    if (publicRead) candidateGrant = 'PUBLIC_READ';
    else if (action === 'read') { if (role !== 'Guest' && (resource !== 'Restricted' || owner || admin)) candidateGrant = 'READ_GRANTED'; else { defaultCode = 'OWNER_REQUIRED'; defaultReason = 'Only the owner or a team Admin may read this document.'; } }
    else if (action === 'delete') { if (admin) candidateGrant = 'DELETE_GRANTED'; else { defaultCode = 'ADMIN_REQUIRED'; defaultReason = 'Only an Admin may delete documents.'; } }
    else if (admin || (role === 'Editor' && owner)) candidateGrant = 'WRITE_GRANTED';
    else if (role === 'Editor') { defaultCode = 'OWNER_REQUIRED'; defaultReason = 'You must own this document.'; }
    const rules = [
      ['revocation', 'Session revocation', revoked, 'ACCESS_REVOKED', 'This identity is explicitly revoked.', 'The identity has no revocation flag.'],
      ['tenant', 'Tenant isolation', actorTenant !== resourceTenant, 'TENANT_MISMATCH', 'An actor cannot cross the document’s tenant boundary.', actorTenant + ' actor and ' + resourceTenant + ' resource share the same tenant.'],
      ['hold', 'Retention lock', legalHold && action === 'delete', 'LEGAL_HOLD', 'A legal hold prevents deletion, including by Admin.', legalHold ? 'The hold preserves deletion; this action is not deletion.' : 'No legal hold blocks deletion.'],
      ['classification', 'Restricted sharing', resource === 'Restricted' && action === 'share', 'RESTRICTED_SHARING', 'Restricted documents cannot be shared.', 'This action has no classification sharing veto.'],
      ['session', 'Authenticated session', !publicRead && !authenticated, 'SESSION_REQUIRED', 'Sign in to request this permission.', publicRead ? 'Published Public reads do not require a session within the tenant.' : 'An authenticated identity is present.'],
      ['guest', 'Guest boundary', !publicRead && role === 'Guest', 'GUEST_SCOPE', 'Guests can only read public documents.', 'The role is within the permitted audience.'],
      ['team', 'Team scope', !publicRead && !sameTeam, 'TEAM_MISMATCH', 'The document is outside your team.', publicRead ? 'Public reads are not team-scoped.' : 'Actor and document share the same team.'],
      ['device', 'Managed device', (resource === 'Restricted' || action !== 'read') && device !== 'Managed', 'DEVICE_REQUIRED', 'This action requires a managed device.', 'Device posture satisfies this action’s requirements.'],
      ['mfa', 'MFA for deletion', action === 'delete' && !mfa, 'MFA_REQUIRED', 'Verify MFA before deleting this document.', action === 'delete' ? 'MFA is verified for this destructive action.' : 'This action does not require the deletion MFA gate.']
    ];
    const denies = rules.filter(rule => rule[2]).map(rule => ({ code: rule[3], reason: rule[4] }));
    const trace = [{ id: 'input', title: 'Known policy input', status: 'pass', detail: 'Every context attribute is present, typed and allowlisted.' }, { id: 'candidate', title: 'Candidate role grant', status: candidateGrant ? 'pass' : 'deny', detail: candidateGrant ? role + ' matches ' + candidateGrant + '. This candidate cannot override an explicit deny.' : defaultReason }];
    for (const [id, title, denied, code, reason, passed] of rules) trace.push({ id, title, status: denied ? 'deny' : 'pass', detail: denied ? reason : passed, code: denied ? code : null });
    const allowed = Boolean(candidateGrant) && denies.length === 0;
    const code = denies[0]?.code || candidateGrant || defaultCode;
    const reasons = { PUBLIC_READ: 'Public reading is permitted inside this tenant.', READ_GRANTED: 'The role, tenant and resource controls permit reading.', WRITE_GRANTED: 'The role, ownership and device controls permit this action.', DELETE_GRANTED: 'Admin deletion is permitted: same tenant, managed device, MFA and no hold.' };
    return freezeResult({ allowed, code, reason: denies[0]?.reason || (candidateGrant ? reasons[candidateGrant] : defaultReason), candidateGrant, denies, trace });
  }
  function counterfactual(context, action) {
    const values = validate(context, action);
    if (!values) return null;
    const original = evaluate(values, action);
    const alternatives = [
      ['authenticated', !values.authenticated, values.authenticated ? 'Remove the session' : 'Sign in'],
      ['sameTeam', !values.sameTeam, values.sameTeam ? 'Leave the team' : 'Use the same team'],
      ['owner', !values.owner, values.owner ? 'Remove ownership' : 'Grant ownership'],
      ['mfa', !values.mfa, values.mfa ? 'Remove MFA' : 'Verify MFA'],
      ['device', values.device === 'Managed' ? 'Unmanaged' : 'Managed', values.device === 'Managed' ? 'Use an unmanaged device' : 'Use a managed device'],
      ['legalHold', !values.legalHold, values.legalHold ? 'Release the legal hold' : 'Place a legal hold'],
      ['revoked', !values.revoked, values.revoked ? 'Clear identity revocation' : 'Revoke the identity'],
      ['actorTenant', values.actorTenant === values.resourceTenant ? TENANTS.find(t => t !== values.resourceTenant) : values.resourceTenant, values.actorTenant === values.resourceTenant ? 'Move to another tenant' : 'Use the resource tenant']
    ];
    for (let size = 1; size <= alternatives.length; size++) {
      for (let mask = 1; mask < 2 ** alternatives.length; mask++) {
        const changes = alternatives.filter((_, i) => mask & (1 << i));
        if (changes.length !== size) continue;
        const candidate = { ...values, ...Object.fromEntries(changes.map(([key, value]) => [key, value])) };
        const result = evaluate(candidate, action);
        if (result.allowed !== original.allowed) return { changes: changes.map(([key, value, label]) => ({ key, value, label })), allowed: result.allowed, code: result.code, cardinality: size, domain: 'Fixed role, action, classification and resource tenant; boolean controls, actor tenant and device may change.' };
      }
    }
    return null;
  }
  const api = Object.freeze({ ROLES, RESOURCES, ACTIONS, TENANTS, DEVICES, DEFAULT_CONTEXT, evaluate, counterfactual });
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SentinelPolicy = api;
})(globalThis);
