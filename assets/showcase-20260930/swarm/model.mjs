/* Classic-script-compatible module: one scheduler for opaque-origin browsers and Node. */
(() => {
  'use strict';

  const TASKS = Object.freeze([
    Object.freeze({ id: 'planner', name: 'Planner', role: 'Scope the work', file: 'launch-outline.md', deps: Object.freeze([]), duration: 1000 }),
    Object.freeze({ id: 'designer', name: 'Designer', role: 'Define the experience', file: 'design-spec.md', deps: Object.freeze(['planner']), duration: 1150 }),
    Object.freeze({ id: 'engineer', name: 'Engineer', role: 'Build the component', file: 'launch-card.html', deps: Object.freeze(['planner']), duration: 1550 }),
    Object.freeze({ id: 'reviewer', name: 'Reviewer', role: 'Check the handoff', file: 'review-checklist.md', deps: Object.freeze(['designer', 'engineer']), duration: 1100 })
  ]);

  const BRIEF = `# Luma launch brief\n\nLuma is a fictional reading journal. Create a focused launch-page handoff for people who want to keep ideas from what they read.\n\nAudience: curious readers with notes scattered across apps.\nPromise: a quieter place for your reading.\nPrimary action: start a reading journal.\nDeliverables: a page outline, a visual specification, a semantic launch-card component, and a handoff review.\nConstraints: one violet accent, a paper canvas, readable type, no invented testimonials or metrics.`;

  const ARTIFACTS = Object.freeze({
    planner: Object.freeze({ title: 'A brief everyone can build from.', file: 'launch-outline.md', kind: 'Outline', content: `# Launch outline\n\n## One page, one action\n1. Hero: “A quieter place for your reading.”\n2. Context: collect the passages and ideas you want to return to.\n3. Product: a reading-note card with a title, source, and excerpt.\n4. Action: start a reading journal.\n\n## Ownership\nDesigner → define the paper, violet, typography, and note-card treatment.\nEngineer → create a semantic launch-card component using those constraints.\nReviewer → inspect both artifacts against the original brief.\n\n## Handoff contract\nDesign and component work may run in parallel after this outline. Review must wait for both. Claims stay limited to the fictional product concept.` }),
    designer: Object.freeze({ title: 'Quiet by design.', file: 'design-spec.md', kind: 'Design spec', content: `# Luma design specification\n\nCanvas: warm paper (#F5F3EF).\nSurface: white (#FFFFFF).\nInk: near black (#212126).\nAccent: violet (#6A4DD8), reserved for the product mark and a single emphasis.\nType: system sans; 40px headline on desktop, 28px on mobile; 16px body.\nSpacing: 8px base; 24px card padding; 12px inner rhythm.\nShape: 16px note-card corner radius.\n\n## Reading note card\nShow an eyebrow “YOUR READING, KEPT CLOSE”, the main promise, and a concise descriptive sentence. The product preview contains a book label, note title, and excerpt.\n\n## Interaction and access\nUse a semantic section and heading. Keep visible keyboard focus on interactive elements, respect reduced motion, and keep body text readable. Avoid decorative counters or unverifiable proof.` }),
    engineer: Object.freeze({ title: 'The component, ready to inspect.', file: 'launch-card.html', kind: 'Component', content: `<section class="launch-card" aria-labelledby="launch-title">\n  <p class="eyebrow">Your reading, kept close</p>\n  <h1 id="launch-title">A quieter place for your reading.</h1>\n  <p>Keep the passages and ideas you want to return to.</p>\n  <article class="reading-note" aria-labelledby="note-title">\n    <p class="book-label">A fictional reading journal</p>\n    <h2 id="note-title">A thought worth keeping</h2>\n    <p>Make room for the ideas that stay with you.</p>\n  </article>\n</section>` }),
    reviewer: Object.freeze({ title: 'A deliberate final handoff.', file: 'review-checklist.md', kind: 'Review', content: `# Handoff review — fixed sample checklist\n\n[x] Outline identifies the audience, promise, and primary action.\n[x] Design specification defines paper, ink, and one violet accent.\n[x] Component has a section, a named main heading, and a reading-note article.\n[x] Both design and component artifacts were completed before this review task started.\n[x] No testimonials, user counts, or claimed performance figures appear.\n[ ] Connect the primary action to a real journal flow before production.\n[ ] Test the final styled implementation with a browser and assistive technology before production.\n\nOutcome: the sample handoff is assembled. This fixture is not an independent code audit.` })
  });

  const taskById = id => {
    const task = TASKS.find(item => item.id === id);
    if (!task) throw new Error(`Unknown task: ${id}`);
    return task;
  };
  const copy = state => ({ ...state, tasks: Object.fromEntries(Object.entries(state.tasks).map(([id, task]) => [id, { ...task }])), artifacts: { ...state.artifacts }, events: state.events.map(event => ({ ...event })) });
  const running = state => TASKS.filter(task => state.tasks[task.id].status === 'running');
  const completed = state => TASKS.filter(task => state.tasks[task.id].status === 'completed');
  const ready = state => TASKS.filter(task => state.tasks[task.id].status === 'ready');
  const isComplete = state => completed(state).length === TASKS.length;
  const record = (state, kind, message, taskId = null) => state.events.push({ sequence: state.events.length + 1, round: state.round, kind, message, taskId });

  function refresh(state) {
    for (const task of TASKS) {
      const current = state.tasks[task.id];
      if (['running', 'completed', 'failed'].includes(current.status)) continue;
      current.status = task.deps.every(id => state.tasks[id].status === 'completed') ? 'ready' : 'blocked';
    }
    return state;
  }

  function validConcurrency(value) {
    if (![1, 2, 3].includes(value)) throw new Error('Concurrency must be 1, 2, or 3.');
  }

  function createState(concurrency = 2) {
    validConcurrency(concurrency);
    return refresh({
      concurrency, round: 0, failureArmed: false,
      tasks: Object.fromEntries(TASKS.map(task => [task.id, { status: 'blocked', attempts: 0, completions: 0, lane: null, willFail: false }])),
      artifacts: {}, events: [{ sequence: 1, round: 0, kind: 'system', message: 'Launch brief loaded. Planner is ready.', taskId: null }]
    });
  }

  function setConcurrency(state, value) {
    validConcurrency(value);
    if (running(state).length) throw new Error('Let this round finish before changing capacity.');
    if (state.concurrency === value) return state;
    const next = copy(state);
    next.concurrency = value;
    record(next, 'system', `Concurrency set to ${value}.`);
    return next;
  }

  function setFailure(state, armed) {
    if (state.tasks.engineer.attempts > 0) throw new Error('Reset to inject another Engineer failure.');
    const next = copy(state);
    next.failureArmed = Boolean(armed);
    record(next, 'system', next.failureArmed ? 'Engineer failure armed for its first attempt.' : 'Engineer failure cleared.');
    return next;
  }

  function dispatch(next, tasks) {
    next.round += 1;
    for (const [index, definition] of tasks.entries()) {
      const task = next.tasks[definition.id];
      task.status = 'running';
      task.attempts += 1;
      task.lane = index + 1;
      task.willFail = definition.id === 'engineer' && next.failureArmed;
      if (task.willFail) next.failureArmed = false;
      record(next, 'start', `${definition.name} started in lane ${task.lane}${task.attempts > 1 ? ` · attempt ${task.attempts}` : ''}.`, definition.id);
    }
    return next;
  }

  function startRound(state) {
    if (running(state).length) throw new Error('A round is already running.');
    const eligible = ready(state).slice(0, state.concurrency);
    if (!eligible.length) throw new Error(isComplete(state) ? 'All tasks are complete.' : 'No ready tasks. Retry the failed task.');
    return dispatch(copy(state), eligible);
  }

  function settleTask(state, id) {
    const definition = taskById(id);
    if (state.tasks[id].status !== 'running') throw new Error(`${definition.name} is not running.`);
    const next = copy(state);
    const task = next.tasks[id];
    task.lane = null;
    if (task.willFail) {
      task.status = 'failed';
      task.willFail = false;
      record(next, 'failed', 'Engineer failed: injected component-build fault. Completed artifacts retained.', id);
    } else {
      task.status = 'completed';
      task.completions += 1;
      next.artifacts[id] = ARTIFACTS[id];
      record(next, 'complete', `${definition.name} completed → ${definition.file}.`, id);
    }
    refresh(next);
    if (isComplete(next)) record(next, 'complete', 'Handoff packet assembled from all four artifacts.');
    return next;
  }

  function retryTask(state, id) {
    const definition = taskById(id);
    if (running(state).length) throw new Error('Let the running round finish before retrying.');
    if (state.tasks[id].status !== 'failed') throw new Error('Only a failed task can be retried.');
    if (!definition.deps.every(dep => state.tasks[dep].status === 'completed')) throw new Error('Dependencies are not complete.');
    const next = copy(state);
    record(next, 'retry', `${definition.name} retry requested. Successful tasks will not rerun.`, id);
    return dispatch(next, [definition]);
  }

  function packet(state) {
    if (!isComplete(state)) return null;
    return { title: 'The launch handoff is ready.', file: 'luma-handoff.md', kind: 'Handoff', content: `# Luma launch handoff\n\nSynthetic sample, assembled from completed local tasks.\n\n${TASKS.map(task => state.artifacts[task.id].content).join('\n\n---\n\n')}` };
  }

  globalThis.CohortModel = Object.freeze({ TASKS, BRIEF, ARTIFACTS, createState, setConcurrency, setFailure, startRound, settleTask, retryTask, running, completed, ready, isComplete, packet });
})();
