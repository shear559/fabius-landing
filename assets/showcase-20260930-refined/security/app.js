(() => {
  'use strict';
  const { ROLES, ACTIONS, evaluate } = globalThis.SentinelPolicy;
  const base = { role: 'Editor', resource: 'Team', authenticated: true, mfa: false, sameTeam: true, owner: true };
  const scenarios = {
    editor: { context: { ...base }, action: 'edit' },
    admin: { context: { ...base, role: 'Admin', resource: 'Restricted', owner: false }, action: 'delete' },
    boundary: { context: { ...base, role: 'Admin', sameTeam: false, mfa: true }, action: 'edit' },
    restricted: { context: { ...base, role: 'Admin', resource: 'Restricted', mfa: true }, action: 'share' },
    guest: { context: { ...base, role: 'Guest', resource: 'Restricted', authenticated: false, owner: false }, action: 'read' }
  };
  const $ = id => document.getElementById(id);
  const cap = value => value[0].toUpperCase() + value.slice(1);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const state = { context: { ...base }, action: 'edit', scenario: 'editor', receipt: 'decision', revision: 1 };
  const ruleText = {
    PUBLIC_READ: 'resource = Public AND action = read', SESSION_REQUIRED: 'authenticated must be true', GUEST_SCOPE: 'Guest → public read only', TEAM_MISMATCH: 'sameTeam must be true; Admin has no bypass', OWNER_REQUIRED: 'owner OR team Admin must grant this scope', READ_GRANTED: 'signedIn + sameTeam + document scope', ADMIN_REQUIRED: 'delete requires role = Admin', MFA_REQUIRED: 'Admin + delete requires mfa = true', DELETE_GRANTED: 'signedIn + sameTeam + Admin + MFA', RESTRICTED_SHARING: 'Restricted + share → deny for every role', WRITE_GRANTED: 'sameTeam AND (Admin OR Editor + owner)', READ_ONLY: 'Viewer has no edit or share grant', INVALID_INPUT: 'unrecognized input → deny'
  };
  const flags = [{ key: 'authenticated', label: 'Sign in' }, { key: 'sameTeam', label: 'Use the same team' }, { key: 'owner', label: 'Grant ownership' }, { key: 'mfa', label: 'Verify MFA' }];
  let suggestedChange = null;
  let previousPermissions = Object.fromEntries(ACTIONS.map(action => [action, evaluate(base, action).allowed]));

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
    $('check-count').textContent = decision.allowed ? `${decision.trace.length} gates passed` : `Stopped at gate ${decision.trace.length}`;
    $('graph-role').textContent = context.role;
    $('graph-session').textContent = context.authenticated ? 'Signed in' : 'No session';
    $('graph-resource').textContent = context.resource;
    $('graph-scope').textContent = !context.sameTeam ? 'Other team' : context.owner ? 'Owned document' : 'Not the owner';
    $('actor-team').textContent = context.sameTeam ? 'Atlas' : 'Another workspace';
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
    suggestedChange = null;
    for (const flag of flags) {
      const changedContext = { ...context, [flag.key]: !context[flag.key] };
      const result = evaluate(changedContext, state.action);
      if (result.allowed !== decision.allowed) {
        suggestedChange = { key: flag.key, value: !context[flag.key] };
        const label = context[flag.key] ? `Remove ${flag.key === 'sameTeam' ? 'team membership' : flag.key === 'authenticated' ? 'the session' : flag.key === 'owner' ? 'ownership' : 'MFA verification'}` : flag.label;
        $('counterfactual').innerHTML = `<p>Change one fact and re-evaluate</p><button type="button" id="apply-counterfactual">${label} → ${result.allowed ? 'Allow' : 'Deny'}</button>`;
        break;
      }
    }
    if (!suggestedChange) $('counterfactual').innerHTML = `<p class="no-change">${decision.code === 'RESTRICTED_SHARING' ? 'No session, team, ownership, or MFA change permits sharing a Restricted document.' : 'No single session, team, ownership, or MFA change reverses this decision.'}</p>`;
    const receiptId = `eval_${String(state.revision).padStart(3, '0')}`;
    $('receipt-id').textContent = receiptId;
    const receipt = state.receipt === 'request' ? { evaluation: receiptId, policy: 'document-access/v1', subject: 'actor_demo_07', document: 'DOC-024', action: state.action, context: { ...context } } : { evaluation: receiptId, allowed: decision.allowed, code: decision.code, reason: decision.reason, checks: decision.trace.map(step => ({ gate: step.id, result: step.status })) };
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
  $('reset').addEventListener('click', () => selectScenario('editor'));
  $('counterfactual').addEventListener('click', event => {
    if (event.target.closest('#apply-counterfactual') && suggestedChange) {
      const change = { ...suggestedChange };
      mutate(() => { state.context[change.key] = change.value; state.scenario = 'custom'; }, 'Counterfactual applied.');
    }
  });
  document.querySelectorAll('[data-receipt]').forEach(button => button.addEventListener('click', () => { state.receipt = button.dataset.receipt; render(); }));
  $('context-toggle').addEventListener('click', () => {
    const panel = document.querySelector('.context-panel'); const open = panel.classList.toggle('is-open');
    $('context-toggle').setAttribute('aria-expanded', String(open));
  });
  render();
})();
