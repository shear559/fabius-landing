(() => {
  'use strict';
  const { ROLES, ACTIONS, DEFAULT_CONTEXT, evaluate, counterfactual } = globalThis.SentinelPolicy;
  const base = { ...DEFAULT_CONTEXT };
  const scenarios = {
    hold: { context: { ...base, role: 'Admin', resource: 'Restricted', device: 'Unmanaged', legalHold: true }, action: 'delete' },
    tenant: { context: { ...base, role: 'Admin', actorTenant: 'Boreal', mfa: true }, action: 'edit' },
    revoked: { context: { ...base, role: 'Admin', resource: 'Public', revoked: true, mfa: true }, action: 'read' },
    editor: { context: { ...base }, action: 'edit' },
    admin: { context: { ...base, role: 'Admin', resource: 'Restricted', owner: false }, action: 'delete' },
    boundary: { context: { ...base, role: 'Admin', sameTeam: false, mfa: true }, action: 'edit' },
    restricted: { context: { ...base, role: 'Admin', resource: 'Restricted', mfa: true }, action: 'share' },
    guest: { context: { ...base, role: 'Guest', resource: 'Restricted', authenticated: false, owner: false }, action: 'read' }
  };
  const $ = id => document.getElementById(id);
  const cap = value => value[0].toUpperCase() + value.slice(1);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const state = { context: { ...scenarios.hold.context }, action: 'delete', scenario: 'hold', receipt: 'decision', revision: 1 };
  const ruleText = {
    ACCESS_REVOKED: 'revoked = true → deny every grant', TENANT_MISMATCH: 'actor.tenant must equal resource.tenant', LEGAL_HOLD: 'legalHold AND delete → explicit deny', DEVICE_REQUIRED: 'Restricted OR write → device must be Managed',
    PUBLIC_READ: 'resource = Public AND action = read', SESSION_REQUIRED: 'authenticated must be true', GUEST_SCOPE: 'Guest → public read only', TEAM_MISMATCH: 'sameTeam must be true; Admin has no bypass', OWNER_REQUIRED: 'owner OR team Admin must grant this scope', READ_GRANTED: 'signedIn + sameTeam + document scope', ADMIN_REQUIRED: 'delete requires role = Admin', MFA_REQUIRED: 'Admin + delete requires mfa = true', DELETE_GRANTED: 'signedIn + sameTeam + Admin + MFA', RESTRICTED_SHARING: 'Restricted + share → deny for every role', WRITE_GRANTED: 'sameTeam AND (Admin OR Editor + owner)', READ_ONLY: 'Viewer has no edit or share grant', INVALID_INPUT: 'unrecognized input → deny'
  };
  const flags = [{ key: 'authenticated', label: 'Sign in' }, { key: 'sameTeam', label: 'Use the same team' }, { key: 'owner', label: 'Grant ownership' }, { key: 'mfa', label: 'Verify MFA' }];
  let suggestedChange = null;
  let previousPermissions = Object.fromEntries(ACTIONS.map(action => [action, evaluate(state.context, action).allowed]));

  function mutate(change, description) {
    change();
    state.revision += 1;
    const current = Object.fromEntries(ACTIONS.map(action => [action, evaluate(state.context, action).allowed]));
    const changed = ACTIONS.filter(action => previousPermissions[action] !== current[action]);
    $('change-strip').textContent = changed.length ? changed.map(action => `${cap(action)}: ${previousPermissions[action] ? 'Allow' : 'Deny'} → ${current[action] ? 'Allow' : 'Deny'}`).join(' · ') : `${description} No other permission changed.`;
    previousPermissions = current;
    render();
  }

  for (const action of ACTIONS) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'action'; button.dataset.action = action;
    button.addEventListener('click', () => mutate(() => { state.action = action; }, `${cap(action)} selected.`));
    $('actions').append(button);
  }
  for (const role of ROLES) {
    const row = document.createElement('tr');
    const label = document.createElement('th'); label.scope = 'row'; label.textContent = role; row.append(label);
    for (const action of ACTIONS) {
      const cell = document.createElement('td'); const button = document.createElement('button');
      button.type = 'button'; button.className = 'matrix-cell'; button.dataset.role = role; button.dataset.action = action;
      button.addEventListener('click', () => mutate(() => { state.context.role = role; state.action = action; state.scenario = 'custom'; }, `${role} / ${action} selected.`));
      cell.append(button); row.append(cell);
    }
    $('matrix').append(row);
  }

  function render() {
    const context = state.context;
    const decision = evaluate(context, state.action);
    for (const key of Object.keys(base)) {
      if (typeof base[key] === 'boolean') $(key).checked = context[key];
      else $(key).value = context[key];
    }
    $('scenario').value = state.scenario;
    $('result-heading').textContent = `${cap(state.action)} ${decision.allowed ? 'permitted' : 'denied'}`;
    $('decision-mark').textContent = decision.allowed ? '✓' : '×';
    $('result-reason').textContent = decision.reason;
    $('rule-code').textContent = decision.code;
    $('check-count').textContent = decision.allowed ? `${decision.trace.length} checks satisfied` : `${decision.denies.length} explicit ${decision.denies.length === 1 ? 'deny' : 'denies'}`;
    $('graph-role').textContent = context.role;
    $('graph-session').textContent = context.authenticated ? 'Signed in' : 'No session';
    $('graph-resource').textContent = context.resource;
    $('graph-scope').textContent = !context.sameTeam ? 'Other team' : context.owner ? 'Owned document' : 'Not the owner';
    $('actor-team').textContent = context.sameTeam ? 'Editorial' : 'Another team';
    $('tenant-path').textContent = `${context.actorTenant} actor → ${context.resourceTenant} document`;
    $('grant-evidence').textContent = decision.candidateGrant ? `${context.role} matches ${decision.candidateGrant}` : 'No role grant matches';
    $('deny-evidence').textContent = decision.denies.length ? decision.denies.map(d => d.code).join(' + ') : 'No explicit deny';
    $('precedence-note').textContent = decision.candidateGrant && decision.denies.length ? 'Grant overridden. Every explicit deny must be resolved.' : decision.allowed ? 'Grant accepted after all boundary checks.' : 'No matching grant: access remains denied.';
    document.querySelector('.deny-precedence').dataset.blocked = String(!decision.allowed);
    $('resource-tenant-label').textContent = `${context.resourceTenant} workspace`;
    $('document-class').textContent = `${context.resource.toUpperCase()} DOCUMENT`;
    $('matched-rule').textContent = ruleText[decision.code];
    $('request-line').textContent = `${{read:'GET',edit:'PATCH',share:'POST',delete:'DELETE'}[state.action]} /documents/DOC-024${state.action === 'share' ? '/shares' : ''}`;
    $('trace-label').textContent = `${context.role} / ${state.action}`;
    $('matrix-resource').textContent = `${context.resource} · DOC-024`;
    $('context-summary').textContent = `${context.role} / ${context.resource}`;
    document.querySelectorAll('.action').forEach(button => {
      const action = button.dataset.action; const result = evaluate(context, action);
      button.innerHTML = `<strong>${cap(action)}</strong><span class="action-state"><span aria-hidden="true">${result.allowed ? '✓' : '×'}</span>${result.allowed ? 'Allow' : 'Deny'}</span>`;
      button.dataset.allowed = result.allowed;
      button.setAttribute('aria-pressed', String(action === state.action));
      button.setAttribute('aria-label', `${cap(action)}: ${result.allowed ? 'allowed' : 'denied'}. Inspect decision.`);
    });
    $('trace').innerHTML = decision.trace.map((step, index) => `<li data-status="${step.status}"><span class="trace-step" aria-hidden="true">${step.status === 'pass' ? '✓' : '×'}</span><div><strong>${esc(step.title)}<span class="sr-only"> — ${step.status === 'pass' ? 'passed' : 'denied'}</span></strong><p>${esc(step.detail)}</p></div></li>`).join('');
    document.querySelectorAll('.matrix-cell').forEach(button => {
      const result = evaluate({ ...context, role: button.dataset.role }, button.dataset.action);
      button.textContent = `${result.allowed ? '✓ Allow' : '× Deny'}`;
      button.dataset.allowed = result.allowed;
      button.setAttribute('aria-pressed', String(button.dataset.role === context.role && button.dataset.action === state.action));
      button.setAttribute('aria-label', `${button.dataset.role}, ${button.dataset.action}: ${result.allowed ? 'allowed' : 'denied'}. ${result.reason}`);
    });
    suggestedChange = counterfactual(context, state.action);
    if (suggestedChange) {
      const changes = suggestedChange.changes;
      $('counterfactual').innerHTML = `<p>Smallest change within this role and resource: ${changes.length} ${changes.length === 1 ? 'fact' : 'facts'}</p><ul>${changes.map(change => `<li>${esc(change.label)}</li>`).join('')}</ul><button type="button" id="apply-counterfactual">Apply ${changes.length === 1 ? 'this fact' : 'these facts'} → ${suggestedChange.allowed ? 'Allow' : 'Deny'}</button><small>Simulation only. A role or tenant grant cannot release a real retention hold.</small>`;
    } else $('counterfactual').innerHTML = '<p class="no-change">No permitted context change can reverse this decision while the role, action and classification stay fixed.</p>';
    const receiptId = `eval_${String(state.revision).padStart(3, '0')}`;
    $('receipt-id').textContent = receiptId;
    const receipt = state.receipt === 'request' ? { evaluation: receiptId, policy: 'document-access/v2', subject: 'actor_demo_07', document: 'DOC-024', action: state.action, context: { ...context } } : { evaluation: receiptId, allowed: decision.allowed, code: decision.code, reason: decision.reason, candidateGrant: decision.candidateGrant, explicitDenies: decision.denies.map(deny => deny.code), checks: decision.trace.map(step => ({ gate: step.id, result: step.status })) };
    $('receipt-json').textContent = JSON.stringify(receipt, null, 2);
    document.querySelectorAll('[data-receipt]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.receipt === state.receipt)));
  }
  for (const key of Object.keys(base)) $(key).addEventListener('change', event => mutate(() => {
    state.context[key] = typeof base[key] === 'boolean' ? event.target.checked : event.target.value;
    state.scenario = 'custom';
  }, `${key} updated.`));
  function selectScenario(key) {
    if (!Object.hasOwn(scenarios, key)) return;
    mutate(() => { state.context = { ...scenarios[key].context }; state.action = scenarios[key].action; state.scenario = key; }, 'Scenario loaded.');
  }
  $('scenario').addEventListener('change', event => selectScenario(event.target.value));
  $('reset').addEventListener('click', () => selectScenario('hold'));
  $('counterfactual').addEventListener('click', event => {
    if (event.target.closest('#apply-counterfactual') && suggestedChange) {
      const changes = [...suggestedChange.changes];
      mutate(() => { for (const change of changes) state.context[change.key] = change.value; state.scenario = 'custom'; }, 'Minimal counterfactual applied.');
    }
  });
  document.querySelectorAll('[data-receipt]').forEach(button => button.addEventListener('click', () => { state.receipt = button.dataset.receipt; render(); }));
  $('context-toggle').addEventListener('click', () => {
    const panel = document.querySelector('.context-panel'); const open = panel.classList.toggle('is-open');
    $('context-toggle').setAttribute('aria-expanded', String(open));
  });
  render();
})();
