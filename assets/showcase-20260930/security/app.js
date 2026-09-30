(function () {
  'use strict';
  const { ROLES, ACTIONS, evaluate } = window.SentinelPolicy;
  const defaults = { role: 'Editor', resource: 'Team', authenticated: true, mfa: false, sameTeam: true, owner: true };
  const scenarios = {
    editor: { context: { ...defaults }, action: 'edit' },
    guest: { context: { ...defaults, role: 'Guest', resource: 'Restricted', authenticated: false, sameTeam: false, owner: false }, action: 'read' },
    admin: { context: { ...defaults, role: 'Admin', resource: 'Restricted', owner: false }, action: 'delete' }
  };
  const state = { context: { ...defaults }, action: 'edit', scenario: 'editor' };
  const byId = id => document.getElementById(id);
  const titleCase = value => value[0].toUpperCase() + value.slice(1);
  function icon(allowed) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', allowed ? 'm5 12 4 4 10-10' : 'm7 7 10 10M17 7 7 17');
    svg.append(path);
    return svg;
  }
  const actionNodes = new Map();
  for (const action of ACTIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action';
    button.dataset.action = action;
    const label = document.createElement('strong');
    label.textContent = titleCase(action);
    const status = document.createElement('span');
    status.className = 'action-state';
    button.append(label, status);
    button.addEventListener('click', () => {
      state.action = action;
      render();
    });
    byId('actions').append(button);
    actionNodes.set(action, { button, status });
  }
  const matrixNodes = [];
  for (const role of ROLES) {
    const row = document.createElement('tr');
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = role;
    row.append(heading);
    for (const action of ACTIONS) {
      const cell = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'matrix-cell';
      button.dataset.role = role;
      button.dataset.action = action;
      button.addEventListener('click', () => {
        state.context.role = role;
        state.action = action;
        state.scenario = 'custom';
        render();
      });
      cell.append(button);
      row.append(cell);
      matrixNodes.push({ role, action, button });
    }
    byId('matrix').append(row);
  }

  function render() {
    const context = state.context;
    for (const key of Object.keys(defaults)) {
      if (typeof defaults[key] === 'boolean') byId(key).checked = context[key];
      else byId(key).value = context[key];
    }
    byId('scenario').value = state.scenario;
    const result = evaluate(context, state.action);
    const heading = document.createTextNode(result.allowed ? 'Allowed' : 'Denied');
    const period = document.createElement('span');
    period.textContent = '.';
    byId('result-heading').replaceChildren(heading, period);
    byId('result-reason').textContent = result.reason;
    byId('boundary').dataset.allowed = String(result.allowed);
    byId('verdict-symbol').replaceChildren(icon(result.allowed));
    byId('graph-role').textContent = context.role;
    byId('graph-resource').textContent = context.resource;
    byId('graph-session').textContent = context.authenticated ? 'Signed in' : 'No session';
    byId('graph-scope').textContent = !context.sameTeam ? 'Another team' : context.owner ? 'Your document' : 'Team document';
    byId('rule-code').textContent = result.code;
    const passed = result.trace.filter(step => step.status === 'pass').length;
    byId('check-count').textContent = result.allowed ? `${passed} checks passed` : `Stopped at check ${result.trace.length}`;
    byId('trace-label').textContent = `${context.role} / ${state.action}`;
    byId('matrix-resource').textContent = `${context.resource} document`;
    document.querySelector('.boundary-graph').setAttribute('aria-label', `${context.role} requests ${state.action} on a ${context.resource.toLowerCase()} document: ${result.allowed ? 'allowed' : 'denied'}.`);
    for (const [action, { button, status }] of actionNodes) {
      const decision = evaluate(context, action);
      button.setAttribute('aria-pressed', String(action === state.action));
      button.dataset.allowed = String(decision.allowed);
      const word = decision.allowed ? 'Allowed' : 'Denied';
      button.setAttribute('aria-label', `${titleCase(action)}: ${word}. Inspect this decision.`);
      status.replaceChildren(icon(decision.allowed), document.createTextNode(word));
    }
    const traceItems = result.trace.map(step => {
      const item = document.createElement('li');
      item.dataset.status = step.status;
      const marker = document.createElement('span');
      marker.className = 'trace-step';
      marker.append(icon(step.status === 'pass'));
      const content = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = step.title;
      const status = document.createElement('span');
      status.className = 'sr-only';
      status.textContent = step.status === 'pass' ? ' — passed' : ' — denied';
      title.append(status);
      const detail = document.createElement('p');
      detail.textContent = step.detail;
      content.append(title, detail);
      item.append(marker, content);
      return item;
    });
    byId('trace').replaceChildren(...traceItems);
    for (const { role, action, button } of matrixNodes) {
      const decision = evaluate({ ...context, role }, action);
      button.textContent = decision.allowed ? 'Allow' : 'Deny';
      button.dataset.allowed = String(decision.allowed);
      button.setAttribute('aria-pressed', String(role === context.role && action === state.action));
      button.setAttribute('aria-label', `${role}, ${action}, ${context.resource}: ${decision.allowed ? 'allowed' : 'denied'}. ${decision.reason}`);
    }
  }
  for (const key of Object.keys(defaults)) {
    byId(key).addEventListener('change', event => {
      state.context[key] = typeof defaults[key] === 'boolean' ? event.target.checked : event.target.value;
      state.scenario = 'custom';
      render();
    });
  }
  function useScenario(key) {
    if (!Object.hasOwn(scenarios, key)) return;
    state.context = { ...scenarios[key].context };
    state.action = scenarios[key].action;
    state.scenario = key;
    render();
  }
  byId('scenario').addEventListener('change', event => useScenario(event.target.value));
  byId('reset').addEventListener('click', () => useScenario('editor'));
  render();
})();
