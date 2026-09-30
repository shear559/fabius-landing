(function (root) {
  'use strict';
  const ROLES = Object.freeze(['Viewer', 'Editor', 'Admin', 'Guest']);
  const RESOURCES = Object.freeze(['Public', 'Team', 'Restricted']);
  const ACTIONS = Object.freeze(['read', 'edit', 'share', 'delete']);
  const FIELDS = Object.freeze(['role', 'resource', 'authenticated', 'mfa', 'sameTeam', 'owner']);
  const flags = ['authenticated', 'mfa', 'sameTeam', 'owner'];
  const outcome = (allowed, code, reason, trace) => Object.freeze({ allowed, code, reason, trace: Object.freeze(trace.map(Object.freeze)) });

  function evaluate(context, action) {
    const trace = [];
    const step = (id, title, pass, detail) => trace.push({ id, title, status: pass ? 'pass' : 'deny', detail });
    const deny = (code, reason) => outcome(false, code, reason, trace);
    try {
      const descriptors = context !== null && typeof context === 'object' ? Object.getOwnPropertyDescriptors(context) : {};
      const values = Object.fromEntries(FIELDS.map(key => [key, descriptors[key]?.value]));
      const valid = context !== null && typeof context === 'object' &&
        [Object.prototype, null].includes(Object.getPrototypeOf(context)) &&
        Reflect.ownKeys(context).length === FIELDS.length &&
        FIELDS.every(key => Object.hasOwn(descriptors, key) && Object.hasOwn(descriptors[key], 'value')) &&
        ROLES.includes(values.role) && RESOURCES.includes(values.resource) &&
        ACTIONS.includes(action) && flags.every(key => typeof values[key] === 'boolean');
      step('input', 'Known policy input', valid, valid ? 'Role, document, action and flags match the fixture policy.' : 'Missing or unrecognized input fails closed.');
      if (!valid) return deny('INVALID_INPUT', 'Unrecognized policy input.');

      const { role, resource, authenticated, sameTeam, owner, mfa } = values;
      if (resource === 'Public' && action === 'read') {
        step('public', 'Public read grant', true, 'Public documents can be read without a session.');
        return outcome(true, 'PUBLIC_READ', 'Public documents are readable by everyone.', trace);
      }
      step('session', 'Authenticated session', authenticated, authenticated ? 'A signed-in session is present in this simulation.' : 'This request requires a signed-in session.');
      if (!authenticated) return deny('SESSION_REQUIRED', 'Sign in to request this permission.');
      if (role === 'Guest') {
        step('role', 'Role grant', false, 'Guest has public-read access only.');
        return deny('GUEST_SCOPE', 'Guests can only read public documents.');
      }
      step('team', 'Team boundary', sameTeam, sameTeam ? 'Caller and document belong to the same team.' : 'The document belongs to another team; no role bypasses this boundary.');
      if (!sameTeam) return deny('TEAM_MISMATCH', 'The document is outside your team.');

      if (action === 'read') {
        const permitted = resource !== 'Restricted' || owner || role === 'Admin';
        step('scope', 'Document scope', permitted, permitted ? (resource === 'Restricted' ? (role === 'Admin' ? 'Admin can read restricted documents within this team.' : 'You own this restricted document.') : 'Team members may read this document.') : 'Restricted reads require ownership or Admin within the team.');
        return permitted ? outcome(true, 'READ_GRANTED', 'Your role and document scope permit reading.', trace) : deny('OWNER_REQUIRED', 'Only the owner or a team Admin may read this document.');
      }
      if (action === 'delete') {
        const admin = role === 'Admin';
        step('role', 'Admin role required', admin, admin ? 'Admin is the only role that may request deletion.' : 'Ownership does not grant deletion; Admin is required.');
        if (!admin) return deny('ADMIN_REQUIRED', 'Only an Admin may delete documents.');
        step('mfa', 'MFA for deletion', mfa, mfa ? 'Multi-factor authentication is verified in this context.' : 'Destructive requests require an MFA-verified session.');
        return mfa ? outcome(true, 'DELETE_GRANTED', 'Admin deletion is permitted with MFA.', trace) : deny('MFA_REQUIRED', 'Verify MFA before deleting this document.');
      }
      if (action === 'share' && resource === 'Restricted') {
        step('classification', 'Restricted sharing rule', false, 'Restricted documents cannot be shared, including by Admin.');
        return deny('RESTRICTED_SHARING', 'Restricted documents cannot be shared.');
      }
      const permitted = role === 'Admin' || (role === 'Editor' && owner);
      step('role', 'Role and ownership grant', permitted, permitted ? (role === 'Admin' ? 'Admin can manage documents within this team.' : 'Editor owns this document.') : (role === 'Viewer' ? 'Viewer has no write or share grant.' : 'Editor may only edit or share documents they own.'));
      return permitted ? outcome(true, 'WRITE_GRANTED', action === 'edit' ? 'Your role and ownership permit editing.' : 'Your role and ownership permit sharing.', trace) : deny(role === 'Viewer' ? 'READ_ONLY' : 'OWNER_REQUIRED', role === 'Viewer' ? 'Viewer is a read-only role.' : 'You must own this document.');
    } catch {
      step('input', 'Known policy input', false, 'Unreadable input fails closed.');
      return deny('INVALID_INPUT', 'Unrecognized policy input.');
    }
  }

  const api = Object.freeze({ ROLES, RESOURCES, ACTIONS, evaluate });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SentinelPolicy = api;
})(globalThis);
