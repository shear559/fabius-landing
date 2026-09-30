(() => {
  'use strict';
  const M = globalThis.CohortModel;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  let state = M.createState();
  let selectedArtifact = 'brief';
  let generation = 0;
  let autoRunning = false;
  let stageView = 'preview';
  const timers = new Set();

  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const capitalize = value => value.charAt(0).toUpperCase() + value.slice(1);
  const taskName = id => M.TASKS.find(task => task.id === id).name;
  const statusText = value => value === 'completed' ? 'Complete' : capitalize(value);

  function selectArtifact(id, focus = false) {
    selectedArtifact = id;
    renderArtifact();
    renderNodes();
    renderWorkspace();
    if (focus) $('#artifact-content').focus({ preventScroll: true });
  }

  function renderNodes() {
    for (const definition of M.TASKS) {
      const task = state.tasks[definition.id];
      const node = $(`[data-task="${definition.id}"]`);
      node.dataset.status = task.status;
      node.setAttribute('aria-pressed', String(selectedArtifact === definition.id));
      node.setAttribute('aria-label', `${definition.name}, ${statusText(task.status)}. Inspect ${definition.file}`);
      node.querySelector('.task-status').textContent = statusText(task.status);
    }
    const done = M.isComplete(state);
    $('#packet-node').dataset.ready = String(done);
    $('#packet-node').setAttribute('aria-label', done ? 'Launch handoff ready. Inspect assembled packet.' : 'Launch handoff waiting for review.');
    $('#packet-status').textContent = done ? 'Ready to inspect' : 'Waiting for review';
  }

  function renderControls() {
    const active = M.running(state);
    const done = M.isComplete(state);
    const failed = state.tasks.engineer.status === 'failed';
    const ready = M.ready(state);
    const run = $('#run-button');
    run.disabled = active.length > 0 || ready.length === 0;
    run.querySelector('span').textContent = active.length ? 'Round running…' : done ? 'Run complete' : failed && !ready.length ? 'Retry required' : 'Run next round';
    for (const button of $$('[data-capacity]')) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.capacity) === state.concurrency));
      button.disabled = active.length > 0;
    }
    const fault = $('#fault-button');
    fault.setAttribute('aria-pressed', String(state.failureArmed));
    fault.disabled = state.tasks.engineer.attempts > 0;
    fault.querySelector('span').textContent = state.failureArmed ? 'Failure armed' : state.events.some(event => event.kind === 'failed') ? 'Fault injected' : 'Engineer failure';
    fault.title = fault.disabled ? 'Reset this run to inject a new fault.' : 'Make the Engineer fail once; retry will preserve completed work.';
    $('#retry-button').hidden = !failed;
    $('#retry-button').disabled = active.length > 0;
    $('#completed-count').innerHTML = `${M.completed(state).length}<span>/4</span>`;
    $('#round-count').textContent = String(state.round).padStart(2, '0');
    $('#artifact-count').textContent = `${Object.keys(state.artifacts).length} of 4 produced`;
    let message;
    if (active.length) message = `${active.map(task => task.name).join(' + ')} ${active.length > 1 ? 'are' : 'is'} running. The next round waits for this one to finish.`;
    else if (done) message = 'Handoff assembled. Inspect the packet, or reset to try a different execution path.';
    else if (failed) message = 'Engineer hit the injected fault. Retry that task; completed artifacts stay intact.';
    else if (!state.round) message = 'Start the Planner to turn the brief into a shared outline.';
    else if (ready.length > 1) message = `Designer and Engineer are ready. The next round can start ${Math.min(state.concurrency, ready.length)} together.`;
    else message = `${ready[0].name} is ready. Run the next round to continue.`;
    $('#run-message').textContent = message;
    $('#dependency-note').textContent = done ? 'All dependency gates satisfied.' : failed ? 'Review is held until Engineer succeeds.' : state.tasks.reviewer.status === 'ready' ? 'Both specialist artifacts are complete. Review is ready.' : state.tasks.planner.status === 'completed' ? 'Review waits for both design and component.' : 'Planner unlocks both specialists.';
  }

  function renderLanes() {
    const active = M.running(state);
    const lanes = $('#worker-lanes');
    lanes.dataset.lanes = state.concurrency;
    lanes.innerHTML = Array.from({ length: state.concurrency }, (_, index) => {
      const task = active.find(definition => state.tasks[definition.id].lane === index + 1);
      return `<div class="worker-lane" data-busy="${Boolean(task)}"><span class="lane-number">${index + 1}</span><div class="lane-description"><strong>${task ? task.name : 'Available'}</strong><span>${task ? 'Running' : M.isComplete(state) ? 'Run complete' : 'No task assigned'}</span></div></div>`;
    }).join('');
  }

  function renderLog() {
    $('#event-count').textContent = `${state.events.length} ${state.events.length === 1 ? 'event' : 'events'}`;
    $('#event-log').innerHTML = [...state.events].reverse().map(event => `<li data-kind="${event.kind}"><span class="event-round">R${String(event.round).padStart(2, '0')}</span><div><p class="event-message">${escape(event.message)}</p><span class="event-kind">${event.kind === 'system' ? 'Coordinator' : event.kind}</span></div></li>`).join('');
  }

  const sourceDetails = (content, label = 'Inspect the full artifact') => `<details class="source-details"><summary>${label}</summary><pre class="artifact-source">${escape(content)}</pre></details>`;
  const meta = (kind, file) => `<div class="artifact-meta"><span>${kind}</span><span>${file}</span></div>`;

  function renderArtifact() {
    const id = selectedArtifact;
    for (const tab of $$('.artifact-tabs > button')) {
      const selected = tab.dataset.artifact === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const available = tab.dataset.artifact === 'brief' || Boolean(state.artifacts[tab.dataset.artifact]) || tab.dataset.artifact === 'packet' && M.isComplete(state);
      const marker = tab.querySelector('.tab-state');
      if (marker) {
        marker.textContent = available ? '✓' : '○';
        marker.setAttribute('aria-hidden', 'true');
      }
      tab.setAttribute('aria-label', `${tab.textContent.replace(/[✓○]/g, '').trim()}${available ? ', available' : ', not yet produced'}`);
    }
    const panel = $('#artifact-content');
    panel.setAttribute('aria-labelledby', `tab-${id}`);
    if (id === 'brief') {
      panel.innerHTML = `${meta('Source · synthetic project', 'launch-brief.md')}<h3>A quieter place for your reading.</h3><p class="artifact-description">Luma is a fictional reading journal. Build a focused launch-page handoff for people with ideas scattered across notebooks and apps.</p><dl class="brief-details"><div><dt>Audience</dt><dd>Curious readers who want to keep their best ideas.</dd></div><div><dt>Primary action</dt><dd>Start a reading journal.</dd></div><div><dt>Deliverables</dt><dd>Outline · design spec · component · review.</dd></div></dl>${sourceDetails(M.BRIEF, 'Read the complete brief')}`;
      return;
    }
    const artifact = id === 'packet' ? M.packet(state) : state.artifacts[id];
    if (!artifact) {
      const definition = M.TASKS.find(task => task.id === id);
      const task = definition ? state.tasks[id] : null;
      const missing = definition ? definition.deps.filter(dep => state.tasks[dep].status !== 'completed').map(taskName) : [];
      let title = 'The packet comes last.';
      let description = 'Complete the outline, design specification, component, and review to assemble a single handoff.';
      if (task) {
        title = task.status === 'failed' ? 'A recoverable fault.' : task.status === 'running' ? `${definition.name} is working.` : task.status === 'ready' ? `${definition.name} is ready.` : 'The handoff has a dependency.';
        description = task.status === 'failed' ? 'The injected build fault produced no component. Use Retry Engineer above; the successful outline and design stay available.' : task.status === 'running' ? `${definition.file} appears here when this local task completes.` : task.status === 'ready' ? 'The required inputs are available. Run the next round to produce this artifact.' : `${definition.name} needs ${missing.join(' and ')} to finish before it can start.`;
      }
      panel.innerHTML = `${meta(task ? statusText(task.status) : 'Pending', definition ? definition.file : 'luma-handoff.md')}<div class="artifact-waiting"><span class="waiting-symbol" aria-hidden="true">${task?.status === 'failed' ? '!' : '·'}</span><h3>${title}</h3><p class="artifact-description">${description}</p><p class="eyebrow">FIXED LOCAL OUTPUT · NO MODEL CALLS</p></div>`;
      return;
    }
    let body;
    if (id === 'planner') {
      body = `<p class="artifact-description">The page has one job: help a reader start a journal. Each specialist gets a clear artifact to produce.</p><ol class="outline-list"><li><div><strong>Hero &amp; promise</strong><p>A quieter place for your reading.</p></div></li><li><div><strong>Product &amp; context</strong><p>Keep passages, sources, and ideas together.</p></div></li><li><div><strong>Parallel handoff</strong><p>Designer owns the visual spec. Engineer owns the component.</p></div></li><li><div><strong>Review &amp; assemble</strong><p>Both artifacts must exist before the final check.</p></div></li></ol>${sourceDetails(artifact.content)}`;
    } else if (id === 'designer') {
      body = `<p class="artifact-description">Paper, clear type, and one violet accent. A fixed sample of the intended visual direction.</p><div class="design-preview"><span class="luma-mark">luma.</span><h4>A quieter place for your reading.</h4><p>Keep the passages and ideas you want to return to.</p><div class="swatch-list"><span><i class="swatch" aria-hidden="true"></i>Paper</span><span><i class="swatch ink" aria-hidden="true"></i>Ink</span><span><i class="swatch violet" aria-hidden="true"></i>Violet</span></div></div>${sourceDetails(artifact.content, 'Read the design specification')}`;
    } else if (id === 'engineer') {
      body = `<p class="artifact-description">A semantic launch-card fixture. Source is displayed as text; it is not executed in this viewer.</p><pre class="artifact-source"><code>${escape(artifact.content)}</code></pre>`;
    } else if (id === 'reviewer') {
      body = `<p class="artifact-description">Fixed sample checklist. This records the handoff contract, not an independent audit.</p><ul class="review-list">${artifact.content.split('\n').filter(line => /^\[[x ]\]/.test(line)).map(line => `<li${line.startsWith('[ ]') ? ' class="pending"' : ''}>${escape(line.slice(4))}</li>`).join('')}</ul>${sourceDetails(artifact.content)}`;
    } else {
      body = `<p class="artifact-description">Four completed artifacts, assembled into one sample handoff. Open any item, or inspect the combined source below.</p><div class="packet-list">${M.TASKS.map(task => `<button type="button" data-open-artifact="${task.id}"><span>${task.file}</span><span aria-hidden="true">↗</span></button>`).join('')}</div>${sourceDetails(artifact.content, 'Inspect the complete handoff')}`;
    }
    panel.innerHTML = `${meta(`${artifact.kind} · fixed fixture`, artifact.file)}<h3>${artifact.title}</h3>${body}`;
  }

  function drawConnections() {
    const graph = $('#graph');
    const bounds = graph.getBoundingClientRect();
    const svg = $('#connections');
    svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    const vertical = true;
    const edges = [['planner', 'designer'], ['planner', 'engineer'], ['designer', 'reviewer'], ['engineer', 'reviewer'], ['reviewer', 'packet']];
    svg.replaceChildren();
    const box = id => (id === 'packet' ? $('#packet-node') : $(`[data-task="${id}"]`)).getBoundingClientRect();
    for (const [from, to] of edges) {
      const a = box(from), b = box(to);
      const x1 = (vertical ? a.left + a.width / 2 : a.right) - bounds.left;
      const y1 = (vertical ? a.bottom : a.top + a.height / 2) - bounds.top;
      const x2 = (vertical ? b.left + b.width / 2 : b.left) - bounds.left;
      const y2 = (vertical ? b.top : b.top + b.height / 2) - bounds.top;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = vertical ? `M${x1} ${y1} C${x1} ${(y1 + y2) / 2},${x2} ${(y1 + y2) / 2},${x2} ${y2}` : `M${x1} ${y1} C${(x1 + x2) / 2} ${y1},${(x1 + x2) / 2} ${y2},${x2} ${y2}`;
      path.setAttribute('d', d);
      const sourceComplete = state.tasks[from].status === 'completed';
      const targetRunning = to === 'packet' ? M.isComplete(state) : ['ready', 'running'].includes(state.tasks[to].status);
      path.setAttribute('class', `connection ${sourceComplete && targetRunning ? 'ready-link' : sourceComplete ? 'complete-link' : ''}`);
      svg.append(path);
    }
  }

  function render() {
    renderNodes();
    renderControls();
    renderWorkspace();
    renderLanes();
    renderLog();
    renderArtifact();
    drawConnections();
  }

  function scheduleRunningTasks() {
    const thisGeneration = generation;
    for (const task of M.running(state)) {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (thisGeneration !== generation) return;
        state = M.settleTask(state, task.id);
        selectedArtifact = M.isComplete(state) ? 'packet' : task.id;
        if (state.tasks.engineer.status === 'failed' || M.isComplete(state)) autoRunning = false;
        render();
        if (autoRunning && M.running(state).length === 0 && M.ready(state).length) {
          const nextTimer = window.setTimeout(() => {
            timers.delete(nextTimer);
            if (thisGeneration !== generation || !autoRunning) return;
            state = M.startRound(state);
            render();
            scheduleRunningTasks();
          }, 300);
          timers.add(nextTimer);
        }
      }, task.duration);
      timers.add(timer);
    }
  }

  function perform(action) {
    try {
      state = action();
      render();
    } catch (error) {
      $('#run-message').textContent = error.message;
    }
  }

  $('#run-button').addEventListener('click', () => {
    if ($('#run-button').disabled) return;
    perform(() => M.startRound(state));
    scheduleRunningTasks();
  });
  $('#reset-button').addEventListener('click', () => {
    generation += 1;
    autoRunning = false;
    timers.forEach(timer => window.clearTimeout(timer));
    timers.clear();
    state = M.createState(state.concurrency);
    selectedArtifact = 'brief';
    render();
  });
  $('#retry-button').addEventListener('click', () => {
    if ($('#retry-button').disabled) return;
    perform(() => M.retryTask(state, 'engineer'));
    scheduleRunningTasks();
  });
  $('#fault-button').addEventListener('click', () => perform(() => M.setFailure(state, !state.failureArmed)));
  $$('[data-capacity]').forEach(button => button.addEventListener('click', () => perform(() => M.setConcurrency(state, Number(button.dataset.capacity)))));
  $$('[data-task]').forEach(button => button.addEventListener('click', () => {
    selectArtifact(button.dataset.task);
    if (window.innerWidth < 760) {
      const artifactTop = $('.artifact-panel').getBoundingClientRect().top + window.scrollY;
      document.scrollingElement.scrollTo({ top: Math.max(0, artifactTop - 16), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  }));
  $$('[data-artifact]').forEach(button => button.addEventListener('click', () => selectArtifact(button.dataset.artifact)));
  $('.artifact-tabs').addEventListener('keydown', event => {
    const tabs = $$('.artifact-tabs > button');
    const current = tabs.indexOf(document.activeElement);
    if (current < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectArtifact(tabs[next].dataset.artifact);
    tabs[next].focus();
  });
  $('#artifact-content').addEventListener('click', event => {
    const button = event.target.closest('[data-open-artifact]');
    if (button) selectArtifact(button.dataset.openArtifact, true);
  });

  function renderWorkspace() {
    const component = state.artifacts.engineer;
    const reviewed = M.isComplete(state);
    $('#live-artifact').innerHTML = (component || M.ARTIFACTS.engineer).content;
    $('#stage-source').textContent = (component || M.ARTIFACTS.engineer).content;
    $('#stage-source').hidden = stageView !== 'source';
    $('.browser-frame').hidden = stageView !== 'preview';
    $('#stage-state').textContent = reviewed ? 'Reviewed handoff · all four tasks complete' : component ? 'Produced by Engineer · waiting for review' : state.artifacts.designer ? 'Design specification ready · component pending' : 'Reference target · not yet produced';
    $('#build-indicator').textContent = reviewed ? 'REVIEWED' : component ? 'PRODUCED' : 'REFERENCE';
    $('#stage-caption').textContent = component ? 'This preview renders the completed launch-card.html artifact. Its source is inspectable; the review checklist keeps remaining production work explicit.' : 'The reference shows the intended launch component. Run the specialists to produce the actual source; the label changes only when that task succeeds.';
    $('#stage-deliverables').innerHTML = M.TASKS.map(task => `<span data-complete="${Boolean(state.artifacts[task.id])}"><i aria-hidden="true">${state.artifacts[task.id] ? '✓' : '○'}</i>${task.name === 'Planner' ? 'Outline' : task.name === 'Engineer' ? 'Component' : task.name === 'Designer' ? 'Design' : 'Review'}</span>`).join('');
    const task = M.TASKS.find(item => item.id === selectedArtifact);
    $('#agent-contract').innerHTML = task ? `<dl class="contract-grid"><dt>Owner</dt><dd>${task.name} · attempt ${state.tasks[task.id].attempts}</dd><dt>Inputs</dt><dd>${task.deps.length ? task.deps.map(id => M.TASKS.find(item => item.id === id).file).join(' + ') : 'launch-brief.md'}</dd><dt>Output</dt><dd>${task.file}</dd></dl>` : '';
    $('#auto-run').innerHTML = autoRunning ? 'Pause after round' : M.isComplete(state) ? 'Handoff complete' : 'Run through <span aria-hidden="true">↗</span>';
    $('#auto-run').disabled = !autoRunning && (M.isComplete(state) || state.tasks.engineer.status === 'failed' || M.running(state).length > 0);
    $$('[data-stage-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.stageView === stageView)));
  }
  $('#auto-run').addEventListener('click', () => {
    if (autoRunning) { autoRunning = false; renderWorkspace(); return; }
    if (M.running(state).length || !M.ready(state).length) return;
    autoRunning = true;
    state = M.startRound(state);
    render();
    scheduleRunningTasks();
  });
  $$('[data-stage-view]').forEach(button => button.addEventListener('click', () => { stageView = button.dataset.stageView; renderWorkspace(); }));

  new ResizeObserver(drawConnections).observe($('#graph'));
  render();
})();
