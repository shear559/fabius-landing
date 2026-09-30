(() => {
  'use strict';
  const { buildPlan, validateTasks, runChecks, PRESETS } = globalThis.ClearCode;
  const $ = selector => document.querySelector(selector);
  let currentResult = null;
  let currentSource = 'transform';

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  function sourceView(kind) {
    currentSource = kind;
    $('#source-transform').setAttribute('aria-pressed', String(kind === 'transform'));
    $('#source-validate').setAttribute('aria-pressed', String(kind === 'validate'));
    const fn = kind === 'transform' ? buildPlan : validateTasks;
    const lines = fn.toString().split('\n');
    const gutter = lines[1]?.match(/^ */)[0].length - 2 || 0;
    const root = $('#source-code');
    root.replaceChildren();
    lines.forEach((line, index) => {
      const row = node('span', undefined, 'source-line');
      const number = node('span', String(index + 1), 'line-number');
      number.setAttribute('aria-hidden', 'true');
      row.append(number);
      const code = index === 0 ? line : line.slice(Math.max(0, gutter));
      const tokens = code.match(/'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:function|const|let|if|for|of|return|throw|new|typeof|true|false)\b|\b\d+\b|[^'`\w]+|\w+|./g) || [];
      for (const text of tokens) {
        const type = /^['`]/.test(text) ? 'string' : /^\d+$/.test(text) ? 'number' : /^(function|const|let|if|for|of|return|throw|new|typeof|true|false)$/.test(text) ? 'key' : '';
        row.append(node('span', text, type ? `token-${type}` : ''));
      }
      root.append(row);
    });
  }

  function renderFlow(result, inputLength = 0) {
    const unique = result ? result.trace.filter(t => t.reason !== 'duplicate').length : null;
    const selected = result ? result.trace.filter(t => t.reason === 'selected').length : null;
    const stages = [
      ['Validate', result ? result.trace.length : '—', result ? 'valid rows' : 'input rejected'],
      ['Deduplicate', unique ?? '—', 'unique IDs'],
      ['Select', selected ?? '—', 'tasks kept'],
      ['Group', result ? result.groups.length : '—', 'project plans']
    ];
    $('#flow').replaceChildren(...stages.map(([name, count, label]) => {
      const card = node('div', undefined, 'flow-step');
      const detail = node('div');
      detail.append(node('b', name), node('span', label));
      card.append(node('strong', String(count)), detail);
      return card;
    }));
    $('#flow-note').textContent = result ? `${result.trace.length} rows in · ${selected} tasks out` : 'Validation stops the entire transformation.';
  }

  function renderResult(result) {
    $('#result-error').hidden = true;
    $('#result-content').hidden = false;
    const count = result.trace.filter(t => t.reason === 'selected').length;
    const minutes = result.groups.reduce((sum, group) => sum + group.minutes, 0);
    $('#total-minutes').textContent = minutes;
    $('#task-count').textContent = `${count} ${count === 1 ? 'task' : 'tasks'} · ${result.groups.length} ${result.groups.length === 1 ? 'project' : 'projects'}`;
    $('#result-count').textContent = `${result.trace.length - count} excluded`;
    $('#stacked-bar').replaceChildren();
    $('#bar-labels').replaceChildren();
    const groups = $('#groups');
    groups.replaceChildren();
    if (!count) groups.append(node('p', 'No tasks match. Raise the limit, include completed work, or edit the input.', 'empty-output'));
    result.groups.forEach(group => {
      const bar = node('span');
      bar.style.width = `${minutes ? group.minutes / minutes * 100 : 0}%`;
      $('#stacked-bar').append(bar);
      const label = node('span');
      label.append(node('i'), document.createTextNode(`${group.project} · ${group.minutes} min`));
      $('#bar-labels').append(label);
      const article = node('div', undefined, 'group');
      const heading = node('div', undefined, 'group-heading');
      heading.append(node('strong', group.project), node('span', `${group.minutes} min`));
      article.append(heading);
      group.tasks.forEach(task => {
        const row = node('div', undefined, 'group-task');
        row.dataset.done = String(task.done);
        row.append(node('span', task.title), node('span', `${task.minutes} min`));
        article.append(row);
      });
      groups.append(article);
    });
    $('#result-json').textContent = JSON.stringify(result.groups, null, 2);
    $('#show-json').disabled = false;
    $('#trace-count').textContent = `${result.trace.length} rows`;
    $('#trace-list').replaceChildren(...result.trace.map(task => {
      const row = node('div', undefined, 'trace-row');
      const reason = node('span', task.reason, 'reason');
      reason.dataset.reason = task.reason;
      row.append(node('span', String(task.row).padStart(2, '0')), node('span', task.title), reason);
      return row;
    }));
    if (!result.trace.length) $('#trace-list').append(node('p', 'No rows to trace.', 'empty-output'));
    renderFlow(result);
    $('#run-status').dataset.state = 'success';
    $('#run-status').textContent = `Executed locally · ${count} selected · ${result.trace.length - count} excluded with reasons.`;
    document.body.dataset.result = 'success';
  }

  function execute() {
    try {
      const text = $('#input-json').value;
      if (text.length > 30000) throw new Error('Input is too long. Use at most 30,000 characters.');
      let input;
      try { input = JSON.parse(text); }
      catch { throw new Error('Invalid JSON. Check commas, quotes and brackets, then run again.'); }
      currentResult = buildPlan(input, Number($('#limit').value), $('#include-done').checked);
      renderResult(currentResult);
    } catch (error) {
      currentResult = null;
      $('#result-content').hidden = true;
      const errorPanel = $('#result-error');
      errorPanel.hidden = false;
      errorPanel.replaceChildren(node('strong', 'Nothing was partially processed.'), node('p', error.message));
      $('#result-count').textContent = 'Input rejected';
      $('#result-json').hidden = true;
      $('#result-json').textContent = '';
      $('#show-json').setAttribute('aria-expanded', 'false');
      $('#show-json').disabled = true;
      $('#trace-count').textContent = 'Not processed';
      $('#trace-list').replaceChildren(node('p', 'Fix the input above and run again. Validation happens before filtering or grouping.', 'empty-output'));
      $('#run-status').dataset.state = 'error';
      $('#run-status').textContent = error.message;
      document.body.dataset.result = 'error';
      renderFlow(null);
    }
  }

  function loadPreset(name) {
    $('#input-json').value = JSON.stringify(PRESETS[name], null, 2);
    $('#preset').value = name;
    execute();
  }

  function showChecks() {
    const results = runChecks();
    $('#checks-list').replaceChildren(...results.map(result => {
      const row = node('div', undefined, 'check-result');
      row.dataset.pass = result.pass;
      row.append(node('span', result.pass ? 'PASS' : 'FAIL'), node('span', result.label));
      return row;
    }));
    const passes = results.filter(r => r.pass).length;
    $('#checks-status').textContent = `${passes} / ${results.length} fixture checks passed against the executing function. These cases are coverage, not a proof for all inputs.`;
  }

  $('#plan-form').addEventListener('submit', event => { event.preventDefault(); execute(); });
  $('#apply-input').addEventListener('click', execute);
  $('#preset').addEventListener('change', event => loadPreset(event.target.value));
  $('#restore').addEventListener('click', () => { $('#limit').value = 60; $('#limit-label').textContent = '60 min'; $('#include-done').checked = false; loadPreset('mixed'); });
  $('#limit').addEventListener('input', () => { $('#limit-label').textContent = `${$('#limit').value} min`; execute(); });
  $('#include-done').addEventListener('change', execute);
  $('#input-json').addEventListener('input', () => { $('#preset').value = 'custom'; $('#run-status').dataset.state = 'pending'; $('#run-status').textContent = 'Input edited · the visible plan is from the previous run. Run the function to apply your changes.'; });
  $('#source-transform').addEventListener('click', () => sourceView('transform'));
  $('#source-validate').addEventListener('click', () => sourceView('validate'));
  $('#run-checks').addEventListener('click', showChecks);
  $('#show-json').addEventListener('click', () => { const visible = $('#result-json').hidden; $('#result-json').hidden = !visible; $('#show-json').setAttribute('aria-expanded', String(visible)); });
  sourceView(currentSource);
  loadPreset('mixed');
  showChecks();
})();
