/* Pure state transitions; classic-script compatible in an opaque-origin preview. */
(() => {
  'use strict';
  const P = globalThis.CohortProduct;
  const Q = globalThis.CohortQuality;
  if (!P || !Q) throw new Error('Load product-source.mjs and quality.mjs before the scheduler.');
  const definitions = [
    { id: 'planner', name: 'Specification', short: 'Spec', role: 'Define acceptance', file: 'specification.json', deps: [], duration: 750, output: 'A fixed product contract and acceptance criteria.' },
    { id: 'designer', name: 'Interface', short: 'Interface', role: 'Compose the views', file: 'interface.html', deps: ['planner'], duration: 1050, output: 'A component template with explicit data and label slots.' },
    { id: 'engineer', name: 'Data engineer', short: 'Data', role: 'Validate the records', file: 'journal-data.json', deps: ['planner'], duration: 1300, output: 'Three books and five original notes with unique identities.' },
    { id: 'accessibility', name: 'Accessibility', short: 'Access', role: 'Name every control', file: 'access-contract.json', deps: ['planner'], duration: 900, output: 'Labels, control names, and the interaction contract.' },
    { id: 'integrator', name: 'Integration', short: 'Merge', role: 'Bind the artifacts', file: 'reading-room.html', deps: ['designer', 'engineer', 'accessibility'], duration: 900, output: 'Rendered HTML composed from all three specialist outputs.' },
    { id: 'reviewer', name: 'Review gate', short: 'Review', role: 'Run separate checks', file: 'review-receipt.json', deps: ['integrator'], duration: 1050, output: 'Computed data, binding, label, identity, and handler checks.' },
    { id: 'publisher', name: 'Release', short: 'Release', role: 'Package accepted work', file: 'release-manifest.json', deps: ['reviewer'], duration: 650, output: 'A release manifest referring to the reviewed product and sources.' }
  ];
  const TASKS = Object.freeze(definitions.map(task => Object.freeze({ ...task, deps: Object.freeze(task.deps) })));
  const BRIEF = 'Build Luma, a local reading journal with three fictional books and five original notes. Users can choose a book, filter ideas and practices, save a thought, and add a local note. Separate the interface, data, and accessibility contracts. Merge only accepted specialist artifacts. Release only after a separate deterministic review passes. No model calls, account, server, persistence, or production deployment.';
  const clone = value => JSON.parse(JSON.stringify(value));
  const taskById = id => { const task = TASKS.find(item => item.id === id); if (!task) throw new Error(`Unknown task: ${id}`); return task; };
  const copy = state => ({ ...state, tasks: Object.fromEntries(Object.entries(state.tasks).map(([id, task]) => [id, { ...task, issues: task.issues.map(issue => ({ ...issue })) }])), artifacts: { ...state.artifacts }, events: state.events.map(event => ({ ...event })) });
  const running = state => TASKS.filter(task => state.tasks[task.id].status === 'running');
  const completed = state => TASKS.filter(task => state.tasks[task.id].status === 'completed');
  const ready = state => TASKS.filter(task => state.tasks[task.id].status === 'ready');
  const failed = state => TASKS.filter(task => state.tasks[task.id].status === 'failed');
  const isComplete = state => state.tasks.publisher.status === 'completed';
  const record = (state, kind, message, taskId = null) => state.events.push({ sequence: state.events.length + 1, round: state.round, kind, message, taskId });
  function refresh(state) {
    for (const definition of TASKS) {
      const task = state.tasks[definition.id];
      if (['running', 'completed', 'failed'].includes(task.status)) continue;
      task.status = definition.deps.every(id => state.tasks[id].status === 'completed') ? 'ready' : 'blocked';
    }
    return state;
  }
  function validConcurrency(value) { if (![1, 2, 3].includes(value)) throw new Error('Concurrency must be 1, 2, or 3.'); }
  function createState(concurrency = 3) {
    validConcurrency(concurrency);
    return refresh({ concurrency, round: 0, failureArmed: false, tasks: Object.fromEntries(TASKS.map(task => [task.id, { status: 'blocked', attempts: 0, completions: 0, lane: null, willFail: false, issues: [], candidate: null }])), artifacts: {}, events: [{ sequence: 1, round: 0, kind: 'system', message: 'Reading-room brief loaded. Specification is ready.', taskId: null }] });
  }
  function setConcurrency(state, value) {
    validConcurrency(value);
    if (running(state).length) throw new Error('Let this round finish before changing capacity.');
    if (value === state.concurrency) return state;
    const next = copy(state); next.concurrency = value; record(next, 'system', `Concurrency set to ${value}.`); return next;
  }
  function setFailure(state, armed) {
    if (state.tasks.engineer.attempts > 0) throw new Error('Reset to inject a new data fault.');
    const next = copy(state); next.failureArmed = Boolean(armed);
    record(next, 'system', next.failureArmed ? 'Data fault armed: the first dataset will contain a duplicate note ID.' : 'Data fault cleared.'); return next;
  }
  function dispatch(next, tasks) {
    next.round += 1;
    tasks.forEach((definition, index) => {
      const task = next.tasks[definition.id]; task.status = 'running'; task.attempts += 1; task.lane = index + 1; task.issues = []; task.candidate = null;
      task.willFail = definition.id === 'engineer' && next.failureArmed;
      if (task.willFail) next.failureArmed = false;
      record(next, 'start', `${definition.name} started in lane ${task.lane} · attempt ${task.attempts}.`, definition.id);
    });
    return next;
  }
  function startRound(state) {
    if (running(state).length) throw new Error('A round is already running.');
    const eligible = ready(state).slice(0, state.concurrency);
    if (!eligible.length) throw new Error(isComplete(state) ? 'All tasks are complete.' : 'No ready tasks. Retry the failed contract.');
    return dispatch(copy(state), eligible);
  }
  function artifact(id, data, content, summary) {
    const task = taskById(id);
    return Object.freeze({ id, owner: task.name, file: task.file, title: summary, kind: task.short, inputs: [...task.deps], data, content: content || JSON.stringify(data, null, 2) });
  }
  function produce(state, id) {
    if (id === 'planner') {
      const data = { product: 'Luma reading room', records: { books: 3, notes: 5 }, features: ['choose book', 'filter kind', 'save note', 'add local note'], acceptance: ['unique identities', 'valid book references', 'labelled controls', 'external behavior', 'separate review before release'], constraints: ['deterministic fixtures', 'no model calls', 'no storage or network'] };
      return { output: artifact(id, data, null, 'A shared contract before parallel work.') };
    }
    if (id === 'designer') return { output: artifact(id, { template: P.TEMPLATE, css: 'product.css', behavior: 'product.js', renderer: 'product-source.mjs' }, P.TEMPLATE, 'A reading workspace with explicit input slots.') };
    if (id === 'engineer') {
      const data = clone(P.DATA);
      if (state.tasks.engineer.willFail) data.notes[1].id = data.notes[0].id;
      const issues = Q.validateData(data);
      if (issues.length) return { issues, candidate: JSON.stringify(data, null, 2) };
      return { output: artifact(id, data, null, 'Books and notes accepted by the data contract.') };
    }
    if (id === 'accessibility') return { output: artifact(id, { ...P.LABELS }, null, 'Every collection, filter, and input has a name.') };
    if (id === 'integrator') {
      const data = state.artifacts.engineer.data, access = state.artifacts.accessibility.data;
      if (Q.validateData(data).length) return { issues: [{ code: 'INVALID_UPSTREAM_DATA', path: 'journal-data.json', message: 'Integration refuses an invalid data artifact.' }] };
      if (!state.artifacts.designer.data.template.includes('{{notes}}')) return { issues: [{ code: 'MISSING_TEMPLATE_SLOT', path: 'interface.html', message: 'Interface must expose the notes binding slot.' }] };
      const html = P.render(data, access, {}, state.artifacts.designer.data.template);
      return { output: artifact(id, { html, data, access, template: state.artifacts.designer.data.template, sourceFiles: ['product-source.mjs', 'product.css', 'product.js'] }, html, 'Three specialist artifacts become one product.') };
    }
    if (id === 'reviewer') {
      const result = Q.review(state.artifacts.integrator.data, state.artifacts.engineer.data, state.artifacts.accessibility.data);
      if (!result.passed) return { issues: result.checks.filter(check => !check.passed).map(check => ({ code: `REVIEW_${check.id.toUpperCase()}`, path: 'reading-room.html', message: check.label })), candidate: JSON.stringify(result, null, 2) };
      return { output: artifact(id, result, null, 'The separate contract reviewer accepts this build.') };
    }
    if (!state.artifacts.reviewer.data.passed) return { issues: [{ code: 'REVIEW_REQUIRED', path: 'review-receipt.json', message: 'Release requires a passing review receipt.' }] };
    const data = { product: 'Luma reading room', status: 'ready locally', entry: 'product.html', files: ['product.html', 'product.css', 'product.js', 'product-source.mjs', 'journal-data.json', 'access-contract.json', 'review-receipt.json'], review: state.artifacts.reviewer.file, acceptedTaskIds: TASKS.filter(task => task.id !== 'publisher').map(task => task.id), delivery: 'Local fixture bundle; no production deployment.' };
    return { output: artifact(id, data, null, 'Only accepted work reaches the release bundle.') };
  }
  function settleTask(state, id) {
    const definition = taskById(id);
    if (state.tasks[id].status !== 'running') throw new Error(`${definition.name} is not running.`);
    const result = produce(state, id), next = copy(state), task = next.tasks[id];
    task.lane = null; task.willFail = false;
    if (result.issues) {
      task.status = 'failed'; task.issues = result.issues; task.candidate = result.candidate || null;
      record(next, 'failed', `${definition.name} rejected: ${result.issues[0].code}. Accepted artifacts retained.`, id);
    } else {
      task.status = 'completed'; task.completions += 1; next.artifacts[id] = result.output;
      record(next, 'complete', `${definition.name} accepted → ${definition.file}.`, id);
    }
    refresh(next);
    if (isComplete(next)) record(next, 'release', 'Seven accepted outputs packaged. The reading workspace is ready locally.');
    return next;
  }
  function retryTask(state, id) {
    const definition = taskById(id);
    if (running(state).length) throw new Error('Let the running round finish before retrying.');
    if (state.tasks[id].status !== 'failed') throw new Error('Only a failed task can be retried.');
    if (!definition.deps.every(dep => state.tasks[dep].status === 'completed')) throw new Error('Dependencies are not complete.');
    const next = copy(state); record(next, 'retry', `${definition.name} retry: reload the valid fixture. Accepted upstream outputs stay unchanged.`, id); return dispatch(next, [definition]);
  }
  function packet(state) {
    if (!isComplete(state)) return null;
    return { title: 'The reading workspace is ready.', file: 'luma-handoff.md', kind: 'Bundle', content: `# Luma release\n\nLocal deterministic build. No model calls or production deployment.\n\n${TASKS.map(task => `## ${task.file}\n\n${state.artifacts[task.id].content}`).join('\n\n---\n\n')}` };
  }
  globalThis.CohortModel = Object.freeze({ TASKS, BRIEF, createState, setConcurrency, setFailure, startRound, settleTask, retryTask, running, completed, ready, failed, isComplete, packet });
})();
