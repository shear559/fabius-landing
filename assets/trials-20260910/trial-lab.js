/* Fabius paired build viewer (September 10 study), second edition.
   Shows the actual generated pages and apps live in sandboxed frames, the recorded walkthroughs,
   the solver curves and proofs, every check, the blind design reviews and the process notes.
   No generated demo products, no inferred scores; data is untrusted and reaches the DOM as text. */
(() => {
  'use strict';
  const root = document.querySelector('[data-trial-results]');
  if (!root) return;
  const find = name => root.querySelector(`[data-trial-${name}]`);
  const armNames = { baseline: 'Without Fabius', fabius: 'With Fabius' };
  const taskNames = { math: 'Math', landing: 'Landing page', app: 'App' };
  const reviewKinds = { strength: 'strength', tradeoff: 'tradeoff', 'usability concern': 'concern' };
  const devices = { desktop: { width: 1280, height: 800, label: 'Desktop' }, phone: { width: 390, height: 700, label: 'Phone' } };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const countFormat = new Intl.NumberFormat('en-US');
  const decimalFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
  const textCache = new Map();
  let data, taskIndex = 0, repeatIndex = 0, frameIndex = 0, mobileArm = 'baseline', viewMode = 'live', device = matchMedia('(max-width: 699px)').matches ? 'phone' : 'desktop';
  let frameIds = [], captureViews = [], pointViews = [], liveViews = [], timer = null, generation = 0, frameRequest = 0;
  let playbackButton, frameSlider, frameOutput, zoomInvoker, resizeObserver = null;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }
  function svgNode(tag, attributes = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    return element;
  }
  function mathNode(tag, text, attributes = {}) {
    const element = document.createElementNS('http://www.w3.org/1998/Math/MathML', tag);
    if (text !== undefined) element.textContent = String(text);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    return element;
  }
  function safeURL(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, document.baseURI);
      if (url.username || url.password) return null;
      return url.protocol === 'https:' || (url.protocol === 'http:' && url.origin === location.origin) ? url.href : null;
    } catch { return null; }
  }
  function sameOriginURL(value) {
    const href = safeURL(value);
    if (!href) return null;
    try { return new URL(href).origin === location.origin ? href : null; } catch { return null; }
  }
  function appendLink(parent, label, url, external = false) {
    const href = safeURL(url);
    if (!href) return null;
    const link = node('a', '', label);
    link.href = href;
    if (external) { link.target = '_blank'; link.rel = 'noopener'; }
    parent.append(link);
    return link;
  }
  function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
  function isText(value, max = 20000) { return typeof value === 'string' && value.length <= max; }
  function validate(input) {
    if (!input || typeof input !== 'object' || !input.meta || !Array.isArray(input.tasks) || input.tasks.length !== 3) throw Error('Invalid experiment data.');
    const meta = input.meta;
    for (const field of ['model', 'effort', 'version', 'date']) if (!isText(meta[field]) || !meta[field]) throw Error('Incomplete experiment metadata.');
    if (!Number.isInteger(meta.repeatCount) || meta.repeatCount < 1 || meta.repeatCount > 10 || !finite(meta.runCapSeconds) || meta.runCapSeconds <= 0) throw Error('Invalid run protocol.');
    if (meta.previewNote !== undefined && !isText(meta.previewNote, 1200)) throw Error('Invalid preview note.');
    if (new Set(input.tasks.map(task => task.id)).size !== 3) throw Error('Duplicate task data.');
    for (const task of input.tasks) {
      if (!Object.hasOwn(taskNames, task.id) || !isText(task.title) || !isText(task.summary) || !Array.isArray(task.runs) || task.runs.length < 1 || task.runs.length > 10) throw Error('Incomplete task data.');
      if (new Set(task.runs.map(run => run.repeat)).size !== task.runs.length) throw Error('Duplicate run pairs.');
      if (task.lessons !== undefined && (!Array.isArray(task.lessons) || task.lessons.length > 20 || task.lessons.some(lesson => !isText(lesson)))) throw Error('Invalid observations.');
      if (task.tryIt !== undefined && (!Array.isArray(task.tryIt) || task.tryIt.length > 8 || task.tryIt.some(step => !isText(step, 300)))) throw Error('Invalid walkthrough steps.');
      if (task.transitions !== undefined && (!Array.isArray(task.transitions) || task.transitions.length > 20 || task.transitions.some(value => !finite(value)))) throw Error('Invalid transition values.');
      if (task.transitionsNote !== undefined && !isText(task.transitionsNote, 600)) throw Error('Invalid transition note.');
      for (const run of task.runs) {
        if (!Number.isInteger(run.repeat) || run.repeat < 1) throw Error('Invalid run pair.');
        for (const name of Object.keys(armNames)) {
          const arm = run[name];
          if (arm === null) continue;
          if (!arm || typeof arm !== 'object' || !Array.isArray(arm.checks) || arm.checks.length > 500) throw Error('Incomplete condition data.');
          if (!Number.isInteger(arm.passed) || !Number.isInteger(arm.total) || arm.passed < 0 || arm.total < 0 || arm.passed > arm.total) throw Error('Invalid check totals.');
          if (arm.checks.length !== arm.total || arm.checks.filter(check => check.passed === true).length !== arm.passed) throw Error('Check totals disagree with recorded checks.');
          if (arm.checks.some(check => !isText(check.id) || !isText(check.label) || typeof check.passed !== 'boolean' || (check.detail !== undefined && !isText(check.detail)))) throw Error('Invalid check record.');
          if (new Set(arm.checks.map(check => check.id)).size !== arm.checks.length) throw Error('Duplicate check identifiers.');
          if (arm.process !== undefined && (!Array.isArray(arm.process) || arm.process.length > 12 || arm.process.some(item => !isText(item.label) || !isText(item.detail)))) throw Error('Invalid process observations.');
          if (arm.review !== undefined && (!Array.isArray(arm.review) || arm.review.length > 12 || arm.review.some(item => !isText(item.area, 120) || !isText(item.kind, 40) || !isText(item.observation, 2000) || !isText(item.implication, 2000)))) throw Error('Invalid design review.');
          if (arm.reviewMethod !== undefined && !isText(arm.reviewMethod, 400)) throw Error('Invalid review method.');
          if (arm.scenarios !== undefined && (!arm.scenarios || !Number.isInteger(arm.scenarios.passed) || !Number.isInteger(arm.scenarios.executed) || arm.scenarios.passed < 0 || arm.scenarios.passed > arm.scenarios.executed)) throw Error('Invalid scenario counts.');
          for (const field of ['seconds', 'tokens']) if (arm[field] !== null && (!finite(arm[field]) || arm[field] < 0)) throw Error('Invalid measured usage.');
          for (const field of ['artifactUrl', 'proofUrl', 'productUrl', 'previewUrl', 'solutionUrl', 'codeUrl', 'verificationUrl']) if (arm[field] !== undefined && !safeURL(arm[field])) throw Error('Invalid artifact link.');
          for (const field of ['previewUrl', 'solutionUrl', 'codeUrl', 'verificationUrl']) if (arm[field] !== undefined && !sameOriginURL(arm[field])) throw Error('Preview files must be same-origin.');
          if (!Array.isArray(arm.snapshots) || arm.snapshots.length > 50 || arm.snapshots.some(snapshot => !isText(snapshot.id) || !isText(snapshot.label) || !safeURL(snapshot.url))) throw Error('Invalid capture data.');
          if (new Set(arm.snapshots.map(snapshot => snapshot.id)).size !== arm.snapshots.length) throw Error('Duplicate capture states.');
          if (arm.curve !== undefined && (!Array.isArray(arm.curve) || arm.curve.length > 5000 || arm.curve.some(point => !['t', 'x', 'y', 'z', 'value'].every(key => finite(point[key]))))) throw Error('Invalid candidate samples.');
          if (arm.curve && new Set(arm.curve.map(point => point.t)).size !== arm.curve.length) throw Error('Duplicate parameter samples.');
        }
      }
    }
    return input;
  }
  function currentTask() { return data.tasks[taskIndex]; }
  function currentRun() { return currentTask().runs[repeatIndex]; }
  function isUiTask(task) { return task.id === 'landing' || task.id === 'app'; }
  function stopPlayback() {
    clearInterval(timer);
    timer = null;
    if (playbackButton) {
      playbackButton.textContent = playbackButton.dataset.playLabel || 'Play walkthrough';
      playbackButton.dataset.playing = 'false';
      playbackButton.setAttribute('aria-pressed', 'false');
    }
  }
  function announce(text) { find('announcement').textContent = text; }

  /* ── protocol line, scoreboard, task tabs ─────────────────── */
  function renderProtocol() {
    const meta = data.meta;
    find('method').textContent = `${meta.model} · ${meta.effort} reasoning · Fabius ${meta.version} · ${meta.repeatCount} run pairs per task · ${decimalFormat.format(meta.runCapSeconds)} s cap per generation · ${meta.date}`;
    const sources = find('source-links');
    sources.replaceChildren();
    appendLink(sources, 'Read the protocol', meta.protocolUrl);
    appendLink(sources, 'Full report', meta.reportUrl);
    appendLink(sources, 'Download all artifacts', meta.artifactsUrl);
    find('protocol').hidden = false;
    find('limit-note').textContent = isText(meta.limitations) ? meta.limitations : '';
    renderScoreboard();
    const tabs = find('tabs');
    tabs.replaceChildren();
    data.tasks.forEach((task, index) => {
      const button = node('button', '', taskNames[task.id]);
      button.type = 'button';
      button.id = `trial-tab-${task.id}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'trial-panel');
      button.addEventListener('click', () => selectTask(index));
      button.addEventListener('keydown', event => {
        const shifts = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: data.tasks.length - 1 - index };
        if (!Object.hasOwn(shifts, event.key)) return;
        event.preventDefault();
        selectTask((index + shifts[event.key] + data.tasks.length) % data.tasks.length, true);
      });
      tabs.append(button);
    });
    selectTask(0);
  }
  function renderScoreboard() {
    const board = find('scoreboard');
    if (!board) return;
    board.replaceChildren();
    const head = node('div', 'trial-scoreboard-head');
    head.append(node('h3', '', 'Checks met, every recorded run'), node('p', '', 'Each task ran twice per condition. A tie is a tie; nothing is averaged into a lift.'));
    board.append(head);
    for (const task of data.tasks) {
      const row = node('div', 'trial-score-row');
      const name = node('p', 'trial-score-task', taskNames[task.id]);
      name.append(node('small', '', task.title));
      row.append(name);
      for (const run of task.runs) {
        const pair = node('div', 'trial-score-pair');
        pair.append(node('span', '', `Run ${run.repeat}`));
        const values = Object.keys(armNames).map(key => run[key] ? run[key].passed : null);
        const tie = values[0] !== null && values[0] === values[1];
        Object.keys(armNames).forEach((key, position) => {
          const arm = run[key];
          const cell = node('p', 'trial-score-arm');
          cell.dataset.arm = key;
          if (!arm) { cell.append(node('span', '', `${armNames[key]}: no published result`)); pair.append(cell); return; }
          cell.append(node('b', '', `${countFormat.format(arm.passed)}/${countFormat.format(arm.total)}`), node('span', '', armNames[key]));
          if (tie && position === 1) cell.append(node('span', 'trial-score-tie', 'tie'));
          else if (!tie && values[0] !== null && values[1] !== null && values[position] === Math.max(values[0], values[1])) cell.append(node('span', 'trial-score-lead', 'more checks met'));
          pair.append(cell);
        });
        row.append(pair);
      }
      board.append(row);
    }
    board.hidden = false;
  }
  function selectTask(index, focus = false) {
    stopPlayback();
    taskIndex = index;
    repeatIndex = 0;
    frameIndex = 0;
    const tabs = Array.from(find('tabs').children);
    tabs.forEach((tab, position) => {
      tab.setAttribute('aria-selected', String(index === position));
      tab.tabIndex = index === position ? 0 : -1;
    });
    if (focus) tabs[index].focus();
    find('panel').setAttribute('aria-labelledby', tabs[index].id);
    find('repeat').replaceChildren(...currentTask().runs.map((run, position) => {
      const option = node('option', '', `Run ${run.repeat}`);
      option.value = String(position);
      return option;
    }));
    renderPanel();
    announce(`${taskNames[currentTask().id]}, run ${currentRun().repeat}.`);
  }

  /* ── the task panel ───────────────────────────────────────── */
  function renderPanel() {
    generation += 1;
    stopPlayback();
    captureViews = [];
    pointViews = [];
    liveViews = [];
    playbackButton = null;
    frameSlider = null;
    frameOutput = null;
    if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
    const panel = find('panel');
    const task = currentTask();
    const run = currentRun();
    const intro = node('div', 'trial-task-intro');
    intro.append(node('h3', '', task.title), node('p', '', task.summary));
    panel.replaceChildren(intro);
    const comparison = node('div', 'trial-comparison');
    const switcher = node('div', 'trial-arm-switch');
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', 'Visible condition on a narrow screen');
    for (const [name, label] of Object.entries(armNames)) {
      const button = node('button', '', label);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(mobileArm === name));
      button.setAttribute('aria-controls', `trial-arm-${name}`);
      button.addEventListener('click', () => {
        mobileArm = name;
        for (const arm of comparison.children) arm.dataset.mobileActive = String(arm.dataset.arm === name);
        for (const control of switcher.children) control.setAttribute('aria-pressed', String(control === button));
        fitLiveFrames();
      });
      switcher.append(button);
    }
    let renderMathPoint = null;
    if (task.id === 'math') {
      renderMathStatement(panel, task);
      renderMathPoint = renderMath(panel, task, run);
    } else {
      renderViewControls(panel, task);
    }
    for (const name of Object.keys(armNames)) comparison.append(renderArm(name, run[name], task));
    panel.append(switcher, comparison);
    if (renderMathPoint) renderMathPoint(0);
    if (isUiTask(task)) {
      frameIds = [];
      for (const name of Object.keys(armNames)) for (const snapshot of run[name]?.snapshots || []) if (!frameIds.includes(snapshot.id)) frameIds.push(snapshot.id);
      frameIndex = Math.min(frameIndex, Math.max(frameIds.length - 1, 0));
      if (viewMode === 'recorded') { renderPlayback(panel, switcher); showFrame(frameIndex); }
      else { fitLiveFrames(); watchLiveFrames(comparison); }
    }
    const lessons = node('div', 'trial-lessons');
    lessons.append(node('h4', '', 'What these runs reveal'));
    if (task.lessons?.length) {
      const list = node('ul');
      for (const lesson of task.lessons) list.append(node('li', '', lesson));
      lessons.append(list);
    } else lessons.append(node('p', '', 'The interpretation has not been published yet. Inspect the individual checks and source artifacts.'));
    panel.append(lessons);
  }
  function renderViewControls(panel, task) {
    const box = node('div', 'trial-view-controls');
    const left = node('div');
    const modeRow = node('div', 'trial-switch-row');
    modeRow.append(node('span', 'trial-switch-label', 'Show'));
    const modes = node('div', 'trial-switch');
    modes.setAttribute('role', 'group');
    modes.setAttribute('aria-label', 'What to show for both conditions');
    for (const [key, label] of [['live', 'The real product, live'], ['recorded', 'Recorded walkthrough']]) {
      const button = node('button', '', label);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(viewMode === key));
      button.addEventListener('click', () => {
        if (viewMode === key) return;
        viewMode = key;
        renderPanel();
        announce(key === 'live' ? 'Live previews of both generated products.' : 'Recorded walkthrough captures.');
      });
      modes.append(button);
    }
    modeRow.append(modes);
    left.append(modeRow);
    if (viewMode === 'live') {
      const deviceRow = node('div', 'trial-switch-row');
      deviceRow.append(node('span', 'trial-switch-label', 'Frame'));
      const frames = node('div', 'trial-switch');
      frames.setAttribute('role', 'group');
      frames.setAttribute('aria-label', 'Preview frame size for both conditions');
      for (const [key, spec] of Object.entries(devices)) {
        const button = node('button', '', `${spec.label} · ${spec.width}px`);
        button.type = 'button';
        button.setAttribute('aria-pressed', String(device === key));
        button.addEventListener('click', () => {
          device = key;
          for (const control of frames.children) control.setAttribute('aria-pressed', String(control === button));
          for (const view of liveViews) applyDevice(view);
          fitLiveFrames();
          announce(`${spec.label} frame, ${spec.width} pixels wide.`);
        });
        frames.append(button);
      }
      deviceRow.append(frames);
      left.append(deviceRow);
      if (isText(data.meta.previewNote) && data.meta.previewNote) left.append(node('p', 'trial-preview-note', data.meta.previewNote));
    } else {
      left.append(node('p', 'trial-preview-note', 'Composed walkthrough from actual captured states. Both sides advance together. These transitions are not a recording of model generation.'));
    }
    box.append(left);
    if (viewMode === 'live' && task.tryIt?.length) {
      const tryIt = node('div', 'trial-try');
      tryIt.append(node('h4', '', 'Try what the checks exercised'));
      const list = node('ol');
      for (const step of task.tryIt) list.append(node('li', '', step));
      tryIt.append(list);
      box.append(tryIt);
    }
    panel.append(box);
  }

  /* ── one condition column ─────────────────────────────────── */
  function renderArm(name, arm, task) {
    const article = node('article', `trial-arm trial-arm-${name}`);
    article.dataset.arm = name;
    article.dataset.mobileActive = String(mobileArm === name);
    article.id = `trial-arm-${name}`;
    article.setAttribute('aria-labelledby', `${article.id}-title`);
    const heading = node('div', 'trial-arm-heading');
    const title = node('h4');
    title.id = `${article.id}-title`;
    const marker = node('span', 'trial-arm-marker');
    marker.setAttribute('aria-hidden', 'true');
    title.append(marker, document.createTextNode(armNames[name]));
    heading.append(title, node('span', 'trial-run-status', arm ? (isText(arm.status) ? arm.status : 'Recorded run') : 'Not available'));
    article.append(heading);
    if (task.id === 'math') {
      const pointHolder = node('div');
      article.append(pointHolder);
      pointViews.push({ name, holder: pointHolder });
    } else if (viewMode === 'live') {
      article.append(renderLiveFrame(name, arm, task));
    } else {
      const stage = node('div', 'trial-stage');
      stage.append(node('p', 'trial-stage-message', 'No capture available for this state.'));
      const foot = node('div', 'trial-capture-foot');
      const label = node('p', 'trial-capture-label', 'Captured state');
      const zoom = node('button', 'trial-button', 'Enlarge');
      zoom.type = 'button';
      zoom.disabled = true;
      foot.append(label, zoom);
      article.append(stage, foot);
      captureViews.push({ name, stage, label, zoom, snapshot: null });
    }
    if (!arm) {
      article.append(node('p', 'trial-arm-note', 'This run has no published result. It is not counted as a pass or assigned an invented score.'));
      return article;
    }
    const metrics = node('dl', 'trial-metrics');
    const values = [
      ['Checks met', `${countFormat.format(arm.passed)} / ${countFormat.format(arm.total)}`],
      ['Elapsed', arm.seconds === null ? 'Unavailable' : `${decimalFormat.format(arm.seconds)} s`],
      ['Output tokens', arm.tokens === null ? 'Unavailable' : countFormat.format(arm.tokens)]
    ];
    if (arm.scenarios) values.push(['Browser scenarios', `${countFormat.format(arm.scenarios.passed)} / ${countFormat.format(arm.scenarios.executed)}`]);
    metrics.dataset.cells = String(values.length);
    for (const [label, value] of values) {
      const pair = node('div');
      pair.append(node('dt', '', label), node('dd', '', value));
      metrics.append(pair);
    }
    article.append(metrics);
    if (isText(arm.note) && arm.note) article.append(node('p', 'trial-arm-note', arm.note));
    if (task.id === 'math') renderSolution(article, name, arm);
    renderChecks(article, arm, task);
    if (arm.review?.length) renderReview(article, arm);
    if (arm.process?.length) {
      const process = node('details', 'trial-process');
      process.append(node('summary', '', 'Planning, tools and verification'));
      process.append(node('p', 'trial-arm-note', 'Observed actions from the run trace. This retrospective review is descriptive, not a process score; delegation was unavailable in this study.'));
      const list = node('ul', 'trial-process-list');
      for (const observation of arm.process) {
        const item = node('li');
        item.append(node('strong', '', observation.label), node('p', '', observation.detail));
        list.append(item);
      }
      process.append(list);
      article.append(process);
    }
    const links = node('div', 'trial-artifact-links');
    appendLink(links, 'Source ZIP', arm.artifactUrl);
    appendLink(links, 'Proof / check record', arm.proofUrl);
    if (isUiTask(task)) appendLink(links, 'Open the product in a new tab', arm.previewUrl || arm.productUrl, true);
    if (links.childElementCount) article.append(links);
    return article;
  }
  function renderChecks(article, arm, task) {
    const failures = arm.checks.filter(check => !check.passed);
    article.append(node('h5', 'trial-block-head', task.id === 'math' ? 'Proof and numeric criteria' : 'Every recorded check'));
    article.append(node('p', 'trial-block-note', failures.length ? `${countFormat.format(failures.length)} of ${countFormat.format(arm.total)} checks missed; the misses come first.` : `All ${countFormat.format(arm.total)} recorded checks met. Open a row for the recorded detail.`));
    const list = node('ul', 'trial-score');
    for (const check of [...failures, ...arm.checks.filter(item => item.passed)]) {
      const item = node('li');
      const details = node('details');
      const summary = node('summary');
      const chip = node('span', 'trial-chip', check.passed ? 'MET' : 'MISSED');
      chip.dataset.state = check.passed ? 'met' : 'missed';
      summary.append(chip, node('span', '', check.label));
      details.append(summary, node('p', 'trial-score-detail', check.detail || 'No further detail was recorded for this check.'));
      item.append(details);
      list.append(item);
    }
    if (!arm.checks.length) list.append(node('li', '', 'No checks were recorded.'));
    article.append(list);
  }
  function renderReview(article, arm) {
    article.append(node('h5', 'trial-block-head', 'Blind design review'));
    article.append(node('p', 'trial-block-note', isText(arm.reviewMethod) && arm.reviewMethod ? arm.reviewMethod : 'A qualitative review of the captured pixels, blind to condition. No numerical aesthetic score.'));
    const list = node('ul', 'trial-review');
    for (const item of arm.review) {
      const li = node('li');
      const head = node('p', 'trial-review-head');
      const chip = node('span', 'trial-chip', (reviewKinds[item.kind] || item.kind).toUpperCase());
      chip.dataset.state = reviewKinds[item.kind] || 'tradeoff';
      head.append(chip, document.createTextNode(item.area));
      li.append(head, node('p', '', item.observation));
      if (item.implication) li.append(node('p', 'trial-review-implication', item.implication));
      list.append(li);
    }
    article.append(list);
  }

  /* ── live previews in sandboxed frames ────────────────────── */
  function renderLiveFrame(name, arm, task) {
    const holder = node('div');
    const url = arm ? sameOriginURL(arm.previewUrl) : null;
    if (!url) {
      const shell = node('div', 'trial-device');
      shell.append(node('p', 'trial-device-unavailable', 'No live preview is published for this run. Its source archive is linked below.'));
      holder.append(shell);
      return holder;
    }
    const shell = node('div', 'trial-device');
    shell.dataset.device = device;
    const bar = node('div', 'trial-device-bar');
    for (let i = 0; i < 3; i += 1) { const dot = node('i'); dot.setAttribute('aria-hidden', 'true'); bar.append(dot); }
    bar.append(node('span', '', `${armNames[name]} · ${taskNames[task.id].toLowerCase()} · generated ${data.meta.date}`));
    const screen = node('div', 'trial-device-screen');
    screen.dataset.loading = 'true';
    screen.append(node('p', 'trial-device-loading', `Loading the generated ${task.id === 'app' ? 'app' : 'page'}…`));
    const frame = document.createElement('iframe');
    frame.addEventListener('load', () => { screen.dataset.loading = 'false'; });
    frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-modals allow-downloads');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.loading = 'lazy';
    frame.title = `Live preview, ${armNames[name]}: the generated ${task.id === 'app' ? 'task application' : 'landing page'}, in an isolated sandbox`;
    frame.src = url;
    screen.append(frame);
    shell.append(bar, screen);
    const foot = node('div', 'trial-device-foot');
    const note = node('p', '', task.id === 'app' ? 'Sandboxed frame with an in-memory storage stand-in for this preview: the app\u2019s own \u201csaved\u201d messages refer to it, and the board starts over on reload.' : 'Sandboxed frame; scroll and click inside it.');
    const actions = node('div', 'trial-device-actions');
    const reload = node('button', 'trial-button', 'Reload');
    reload.type = 'button';
    reload.addEventListener('click', () => { screen.dataset.loading = 'true'; frame.src = url; announce(`${armNames[name]} preview reloaded; its board starts over.`); });
    actions.append(reload);
    appendLink(actions, 'Open in a new tab', url, true);
    foot.append(note, actions);
    holder.append(shell, foot);
    const view = { name, shell, screen, frame };
    liveViews.push(view);
    applyDevice(view);
    return holder;
  }
  function applyDevice(view) {
    const spec = devices[device];
    view.shell.dataset.device = device;
    view.frame.width = String(spec.width);
    view.frame.height = String(spec.height);
    view.frame.style.width = `${spec.width}px`;
    view.frame.style.height = `${spec.height}px`;
  }
  function fitLiveFrames() {
    const spec = devices[device];
    for (const view of liveViews) {
      const available = view.screen.clientWidth;
      if (!available) continue;
      const scale = Math.min(1, available / spec.width);
      view.frame.style.transform = `scale(${scale})`;
      view.screen.style.height = `${Math.round(spec.height * scale)}px`;
      view.screen.style.marginInline = 'auto';
      view.screen.style.width = scale === 1 && spec.width < available ? `${spec.width}px` : '';
    }
  }
  function watchLiveFrames(comparison) {
    if (!('ResizeObserver' in window)) return;
    resizeObserver = new ResizeObserver(() => fitLiveFrames());
    resizeObserver.observe(comparison);
  }

  /* ── recorded walkthrough ──────────────────────────────────── */
  async function showFrame(index) {
    frameIndex = index;
    const id = frameIds[index];
    const request = ++frameRequest;
    const renderGeneration = generation;
    if (frameSlider) frameSlider.value = String(index);
    if (frameOutput) frameOutput.textContent = frameIds.length ? `Loading state ${index + 1}…` : 'No captured states';
    const prepared = await Promise.all(captureViews.map(view => {
      const snapshot = currentRun()[view.name]?.snapshots.find(item => item.id === id);
      view.zoom.disabled = true;
      view.zoom.onclick = null;
      if (!snapshot) return { view, snapshot: null };
      return new Promise(resolve => {
        const img = new Image();
        img.alt = `${armNames[view.name]} — ${snapshot.label}. Actual captured output.`;
        img.decoding = 'async';
        const timeout = setTimeout(() => finish(false), 10000);
        function finish(ok) {
          clearTimeout(timeout);
          img.onload = null;
          img.onerror = null;
          resolve({ view, snapshot, img: ok ? img : null });
        }
        img.onload = () => finish(true);
        img.onerror = () => finish(false);
        img.src = safeURL(snapshot.url);
      });
    }));
    if (frameRequest !== request || generation !== renderGeneration) return;
    if (frameOutput) frameOutput.textContent = frameIds.length ? `State ${index + 1} / ${frameIds.length}` : 'No captured states';
    const transitions = [];
    for (const { view, snapshot, img } of prepared) {
      view.snapshot = snapshot;
      view.label.textContent = snapshot?.label || 'No capture for this state';
      if (!snapshot) { view.stage.replaceChildren(node('p', 'trial-stage-message', 'No capture was recorded for this condition at this state.')); continue; }
      if (!img) { view.stage.replaceChildren(node('p', 'trial-stage-message', 'This capture could not be loaded. Its source artifact is still linked below.')); continue; }
      const oldImages = Array.from(view.stage.querySelectorAll('img'));
      view.stage.querySelectorAll('.trial-stage-message').forEach(message => message.remove());
      view.stage.append(img);
      transitions.push({ img, oldImages });
      view.zoom.disabled = false;
      view.zoom.onclick = () => openZoom(view.name, snapshot, view.zoom);
    }
    requestAnimationFrame(() => {
      for (const { img, oldImages } of transitions) {
        if (!img.isConnected) continue;
        img.classList.add('is-visible');
        oldImages.forEach(old => old.classList.add('is-leaving'));
        setTimeout(() => oldImages.forEach(old => old.remove()), reducedMotion.matches ? 0 : 450);
      }
    });
  }
  function renderPlayback(panel, before) {
    const playback = node('div', 'trial-playback');
    const controls = node('div', 'trial-playback-controls');
    playbackButton = node('button', 'trial-button', 'Play walkthrough');
    playbackButton.type = 'button';
    playbackButton.disabled = frameIds.length < 2;
    playbackButton.dataset.playing = 'false';
    playbackButton.setAttribute('aria-pressed', 'false');
    playbackButton.addEventListener('click', () => {
      if (timer) { stopPlayback(); return; }
      if (frameIndex >= frameIds.length - 1) showFrame(0);
      playbackButton.textContent = 'Pause walkthrough';
      playbackButton.dataset.playing = 'true';
      playbackButton.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => {
        if (frameIndex >= frameIds.length - 1) { stopPlayback(); return; }
        showFrame(frameIndex + 1);
        if (frameIndex >= frameIds.length - 1) stopPlayback();
      }, 2800);
    });
    frameSlider = node('input');
    frameSlider.type = 'range';
    frameSlider.min = '0';
    frameSlider.max = String(Math.max(frameIds.length - 1, 0));
    frameSlider.step = '1';
    frameSlider.value = String(frameIndex);
    frameSlider.disabled = frameIds.length < 2;
    frameSlider.setAttribute('aria-label', 'Captured walkthrough state');
    frameSlider.addEventListener('input', () => { stopPlayback(); showFrame(Number(frameSlider.value)); });
    frameOutput = node('output', 'trial-frame-output');
    controls.append(playbackButton, frameSlider, frameOutput);
    playback.append(controls, node('p', 'trial-playback-note', 'Every state is a real capture of the generated product after a predefined action, in a fresh browser context. Enlarge any state to inspect it.'));
    panel.insertBefore(playback, before);
  }
  function openZoom(name, snapshot, invoker) {
    zoomInvoker = invoker;
    stopPlayback();
    const dialog = find('zoom');
    const img = new Image();
    img.src = safeURL(snapshot.url);
    img.alt = `${armNames[name]} — ${snapshot.label}. Actual captured output.`;
    root.querySelector('#trial-zoom-title').textContent = `${armNames[name]} · ${snapshot.label}`;
    find('zoom-image').replaceChildren(img);
    find('original').href = safeURL(snapshot.url);
    dialog.showModal();
  }

  /* ── mathematics: statement, regime chart, small multiples, proofs ── */
  function mrow(children) { const row = mathNode('mrow'); row.append(...children); return row; }
  function term(coefficient, variable, power) {
    const parts = [];
    if (coefficient) parts.push(mathNode('mn', coefficient));
    if (power) { const sup = mathNode('msup'); sup.append(mathNode('mi', variable), mathNode('mn', power)); parts.push(sup); }
    else if (variable) parts.push(mathNode('mi', variable));
    return parts;
  }
  function renderMathStatement(panel, task) {
    if (!isText(task.question) || !task.question) return;
    const box = node('div', 'trial-statement');
    const left = node('div', 'trial-statement-row');
    left.append(node('h4', '', 'The problem, for every t in [−2, 4]'));
    const math = mathNode('math', undefined, { display: 'block' });
    const firstHalf = () => [
      mathNode('mi', 'minimize'), mathNode('mspace', undefined, { width: '0.6em' }),
      ...term('', 'x', '2'), mathNode('mo', '+'), ...term('2', 'y', '2'), mathNode('mo', '+'), ...term('3', 'z', '2'),
      mathNode('mo', '+'), mathNode('mi', 'x'), mathNode('mi', 'y'), mathNode('mo', '−'), mathNode('mi', 'y'), mathNode('mi', 'z')
    ];
    const secondHalf = () => [
      mathNode('mo', '+'), mathNode('mo', '('), mathNode('mn', '2'), mathNode('mo', '−'), mathNode('mn', '2'), mathNode('mi', 't'), mathNode('mo', ')'), mathNode('mi', 'x'),
      mathNode('mo', '+'), mathNode('mn', '5'), mathNode('mi', 'y'), mathNode('mo', '+'), mathNode('mi', 'z')
    ];
    if (matchMedia('(max-width: 699px)').matches) {
      const table = mathNode('mtable', undefined, { columnalign: 'left' });
      for (const parts of [firstHalf(), secondHalf()]) {
        const tr = mathNode('mtr'); const td = mathNode('mtd'); td.append(mrow(parts)); tr.append(td); table.append(tr);
      }
      math.append(table);
    } else math.append(mrow([...firstHalf(), ...secondHalf()]));
    left.append(math);
    left.append(node('p', '', task.question));
    const right = node('div', 'trial-statement-row');
    right.append(node('h4', '', 'Subject to'));
    const constraints = node('div', 'trial-statement-constraints');
    const rows = [
      [mathNode('mi', 'x'), mathNode('mo', '+'), mathNode('mi', 'y'), mathNode('mo', '+'), mathNode('mi', 'z'), mathNode('mo', '='), mathNode('mn', '1')],
      [mathNode('mi', 'x'), mathNode('mo', ','), mathNode('mi', 'y'), mathNode('mo', ','), mathNode('mi', 'z'), mathNode('mo', '≥'), mathNode('mn', '0')],
      [mathNode('mi', 'x'), mathNode('mo', '≤'), (() => { const f = mathNode('mfrac'); f.append(mathNode('mn', '3'), mathNode('mn', '5')); return f; })()],
      [mathNode('mn', '2'), mathNode('mi', 'y'), mathNode('mo', '+'), mathNode('mi', 'z'), mathNode('mo', '≥'), (() => { const f = mathNode('mfrac'); f.append(mathNode('mn', '1'), mathNode('mn', '2')); return f; })()]
    ];
    for (const parts of rows) { const m = mathNode('math'); m.append(mrow(parts)); constraints.append(m); }
    right.append(constraints);
    if (isText(task.feasibleSet) && task.feasibleSet) right.append(node('p', '', task.feasibleSet));
    if (isText(task.transitionsNote) && task.transitionsNote) right.append(node('p', '', task.transitionsNote));
    box.append(left, right);
    panel.append(box);
  }
  function sampleNumber(value) { return finite(value) ? String(value) : 'Unavailable'; }
  function shortNumber(value) {
    if (!finite(value)) return 'Unavailable';
    const text = String(value);
    return text.length > 9 ? Number(value.toPrecision(6)).toString() : text;
  }
  function renderMath(panel, task, run) {
    const all = Object.keys(armNames).flatMap(name => run[name]?.curve || []);
    const times = [...new Set(all.map(point => point.t))].sort((a, b) => a - b);
    const box = node('div', 'trial-math');
    const header = node('div', 'trial-math-header');
    header.append(node('h4', '', 'Optimal value f(t) from each submitted solver, with the six regimes'));
    const legend = node('div', 'trial-chart-legend');
    for (const label of Object.values(armNames)) {
      const item = node('span');
      const line = node('i');
      line.setAttribute('aria-hidden', 'true');
      item.append(line, document.createTextNode(label));
      legend.append(item);
    }
    header.append(legend);
    box.append(header);
    if (!all.length) {
      box.append(node('p', 'trial-point-empty', 'No evaluated candidate samples have been published. The plot is intentionally empty.'));
      panel.append(box);
      return () => pointViews.forEach(view => view.holder.replaceChildren(node('p', 'trial-point-empty', 'No candidate sample available.')));
    }
    const compact = matchMedia('(max-width: 699px)').matches;
    const bounds = compact
      ? { left: 48, right: 328, top: 24, bottom: 240, width: 350, height: 282 }
      : { left: 65, right: 755, top: 28, bottom: 278, width: 790, height: 325 };
    const minT = times[0], maxT = times[times.length - 1];
    const minV = Math.min(...all.map(point => point.value)), maxV = Math.max(...all.map(point => point.value));
    const rangeT = maxT - minT || 1, rangeV = maxV - minV || 1;
    const mapX = t => bounds.left + (t - minT) / rangeT * (bounds.right - bounds.left);
    const mapY = value => bounds.bottom - (value - minV + rangeV * .08) / (rangeV * 1.16) * (bounds.bottom - bounds.top);
    const svg = svgNode('svg', { class: 'trial-chart', viewBox: `0 0 ${bounds.width} ${bounds.height}`, role: 'img', 'aria-labelledby': 'trial-curve-title trial-curve-description' });
    const title = svgNode('title', { id: 'trial-curve-title' });
    title.textContent = 'Recorded optimal objective values, with and without Fabius, over the six regimes';
    const description = svgNode('desc', { id: 'trial-curve-description' });
    description.textContent = 'Shared axes compare supplied samples. Shaded bands are the six regimes between the exact transition values. Connecting lines are visual guides between samples, not a continuous proof. The slider exposes each available parameter and its coordinates below.';
    svg.append(title, description);
    const transitions = (task.transitions || []).filter(value => value > minT && value < maxT).sort((a, b) => a - b);
    const edges = [minT, ...transitions, maxT];
    for (let i = 0; i < edges.length - 1; i += 1) {
      svg.append(svgNode('rect', { x: mapX(edges[i]), y: bounds.top, width: Math.max(0, mapX(edges[i + 1]) - mapX(edges[i])), height: bounds.bottom - bounds.top, class: 'trial-chart-band' }));
    }
    for (let index = 0; index < 3; index += 1) {
      const value = minV + (maxV - minV) * index / 2;
      const y = mapY(value);
      svg.append(svgNode('line', { x1: bounds.left, x2: bounds.right, y1: y, y2: y, class: 'trial-chart-grid' }));
      const label = svgNode('text', { x: bounds.left - 12, y: y + 5, 'text-anchor': 'end', class: 'trial-chart-text' });
      label.textContent = Number(value.toPrecision(4)).toString();
      svg.append(label);
    }
    svg.append(svgNode('line', { x1: bounds.left, x2: bounds.right, y1: bounds.bottom, y2: bounds.bottom, class: 'trial-chart-axis' }));
    for (const t of transitions) {
      svg.append(svgNode('line', { x1: mapX(t), x2: mapX(t), y1: bounds.top, y2: bounds.bottom, class: 'trial-chart-transition' }));
      if (compact) continue;
      const label = svgNode('text', { x: mapX(t), y: bounds.top - 8, 'text-anchor': 'middle', class: 'trial-chart-transition-text' });
      label.textContent = String(t);
      svg.append(label);
    }
    for (const t of [minT, maxT]) {
      const label = svgNode('text', { x: mapX(t), y: bounds.bottom + 26, 'text-anchor': 'middle', class: 'trial-chart-text' });
      label.textContent = sampleNumber(t);
      svg.append(label);
    }
    const tLabel = svgNode('text', { x: (bounds.left + bounds.right) / 2, y: bounds.bottom + 32, 'text-anchor': 'middle', class: 'trial-chart-text' });
    tLabel.textContent = 'parameter t';
    svg.append(tLabel);
    for (const name of ['fabius', 'baseline']) {
      const curve = [...(run[name]?.curve || [])].sort((a, b) => a.t - b.t);
      if (!curve.length) continue;
      svg.append(svgNode('polyline', { class: 'trial-chart-series', 'data-arm': name, points: curve.map(point => `${mapX(point.t)},${mapY(point.value)}`).join(' ') }));
    }
    const cursor = svgNode('line', { y1: bounds.top, y2: bounds.bottom, class: 'trial-chart-cursor' });
    const dots = svgNode('g');
    svg.append(cursor, dots);
    box.append(svg);
    // small multiples: the optimizer components x(t), y(t), z(t)
    const multiples = node('div', 'trial-multiples');
    const minis = [];
    for (const key of ['x', 'y', 'z']) {
      const card = node('div', 'trial-multiple');
      card.append(node('h5', '', `${key}(t)`));
      const mb = { left: 34, right: 226, top: 8, bottom: 84, width: 240, height: 104 };
      const values = all.map(point => point[key]);
      const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
      const mx = t => mb.left + (t - minT) / rangeT * (mb.right - mb.left);
      const my = value => mb.bottom - (value - lo + span * .1) / (span * 1.2) * (mb.bottom - mb.top);
      const mini = svgNode('svg', { viewBox: `0 0 ${mb.width} ${mb.height}`, role: 'img', 'aria-label': `${key} component of the optimizer against t, both conditions` });
      for (const t of transitions) mini.append(svgNode('line', { x1: mx(t), x2: mx(t), y1: mb.top, y2: mb.bottom, class: 'trial-chart-transition' }));
      for (const [value, anchorY] of [[hi, my(hi) + 4], [lo, my(lo) + 4]]) {
        const label = svgNode('text', { x: mb.left - 6, y: anchorY, 'text-anchor': 'end', class: 'trial-chart-text' });
        label.textContent = Number(value.toPrecision(3)).toString();
        mini.append(label);
      }
      mini.append(svgNode('line', { x1: mb.left, x2: mb.right, y1: mb.bottom, y2: mb.bottom, class: 'trial-chart-axis' }));
      for (const name of ['fabius', 'baseline']) {
        const curve = [...(run[name]?.curve || [])].sort((a, b) => a.t - b.t);
        if (curve.length) mini.append(svgNode('polyline', { class: 'trial-chart-mini', 'data-arm': name, points: curve.map(point => `${mx(point.t)},${my(point[key])}`).join(' ') }));
      }
      const miniCursor = svgNode('line', { y1: mb.top, y2: mb.bottom, class: 'trial-chart-mini-cursor' });
      mini.append(miniCursor);
      card.append(mini);
      multiples.append(card);
      minis.push({ cursor: miniCursor, mx });
    }
    box.append(multiples);
    const scrub = node('div', 'trial-math-scrub');
    const label = node('label');
    label.htmlFor = 'trial-parameter';
    const slider = node('input');
    slider.type = 'range';
    slider.id = 'trial-parameter';
    slider.min = '0';
    slider.max = String(times.length - 1);
    slider.step = '1';
    slider.value = '0';
    slider.disabled = times.length < 2;
    slider.setAttribute('aria-label', 'Parameter t, recorded samples only');
    scrub.append(label, slider);
    const sweepControls = node('div', 'trial-sweep-controls');
    playbackButton = node('button', 'trial-button', 'Play parameter sweep');
    playbackButton.type = 'button';
    playbackButton.dataset.playLabel = 'Play parameter sweep';
    playbackButton.dataset.kind = 'parameter';
    playbackButton.dataset.available = String(times.length > 1);
    playbackButton.dataset.playing = 'false';
    playbackButton.disabled = times.length < 2 || reducedMotion.matches;
    playbackButton.setAttribute('aria-pressed', 'false');
    playbackButton.setAttribute('aria-describedby', 'trial-sweep-note');
    const sweepNote = node('p', 'trial-playback-note', 'Parameter sweep through recorded samples only, at 100 ms per sample. It stops at the end. Reduced motion keeps the manual slider available. This is a visualization, not an execution recording.');
    sweepNote.id = 'trial-sweep-note';
    playbackButton.addEventListener('click', () => {
      if (timer) { stopPlayback(); return; }
      if (reducedMotion.matches) return;
      if (Number(slider.value) >= times.length - 1) { slider.value = '0'; update(0); }
      playbackButton.textContent = 'Pause parameter sweep';
      playbackButton.dataset.playing = 'true';
      playbackButton.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => {
        const next = Number(slider.value) + 1;
        if (next >= times.length) { stopPlayback(); return; }
        slider.value = String(next);
        update(next);
        if (next === times.length - 1) stopPlayback();
      }, 100);
    });
    sweepControls.append(playbackButton, sweepNote);
    box.append(scrub, sweepControls, node('p', 'trial-chart-caption', 'One parametric problem. Points come from the submitted candidates; they are not independent benchmark questions. Lines connect samples and do not establish a proof between them. Identical values overlap, which is what a correctness tie looks like.'));
    panel.append(box);
    function update(index) {
      const t = times[index];
      label.textContent = `t = ${sampleNumber(t)}`;
      slider.setAttribute('aria-valuetext', `t equals ${sampleNumber(t)}`);
      cursor.setAttribute('x1', String(mapX(t)));
      cursor.setAttribute('x2', String(mapX(t)));
      for (const mini of minis) { mini.cursor.setAttribute('x1', String(mini.mx(t))); mini.cursor.setAttribute('x2', String(mini.mx(t))); }
      dots.replaceChildren();
      for (const view of pointViews) {
        const point = run[view.name]?.curve?.find(sample => sample.t === t);
        if (!point) { view.holder.replaceChildren(node('p', 'trial-point-empty', 'No sample was recorded at this exact parameter for this condition.')); continue; }
        dots.append(svgNode('circle', { cx: mapX(t), cy: mapY(point.value), r: view.name === 'fabius' ? 4 : 6, class: 'trial-chart-dot', 'data-arm': view.name }));
        const values = node('dl', 'trial-point');
        for (const key of ['x', 'y', 'z', 'value']) {
          const pair = node('div');
          const dd = node('dd', '', shortNumber(point[key]));
          if (shortNumber(point[key]) !== sampleNumber(point[key])) dd.title = `Recorded value ${sampleNumber(point[key])}`;
          pair.append(node('dt', '', key === 'value' ? 'f(t)' : key), dd);
          values.append(pair);
        }
        view.holder.replaceChildren(values);
      }
    }
    slider.addEventListener('input', () => { stopPlayback(); update(Number(slider.value)); });
    return update;
  }

  /* ── the submitted proof, code and verification notes ────── */
  function renderSolution(article, name, arm) {
    const files = [['Proof', arm.solutionUrl, 'prose'], ['Code', arm.codeUrl, 'code'], ['Verification', arm.verificationUrl, 'prose']].filter(item => sameOriginURL(item[1]));
    if (!files.length) return;
    article.append(node('h5', 'trial-block-head', 'The submitted solution'));
    const box = node('div', 'trial-solution');
    const tabs = node('div', 'trial-solution-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', `${armNames[name]} solution files`);
    const body = node('div', 'trial-solution-body');
    body.setAttribute('role', 'tabpanel');
    body.tabIndex = 0;
    const buttons = files.map(([label, url, kind], index) => {
      const button = node('button', '', label);
      button.type = 'button';
      button.id = `trial-solution-${name}-${index}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', 'false');
      button.tabIndex = -1;
      button.addEventListener('click', () => show(index));
      button.addEventListener('keydown', event => {
        const shifts = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: files.length - 1 - index };
        if (!Object.hasOwn(shifts, event.key)) return;
        event.preventDefault();
        const next = (index + shifts[event.key] + files.length) % files.length;
        show(next);
        buttons[next].focus();
      });
      tabs.append(button);
      return button;
    });
    box.append(tabs, body);
    article.append(box);
    function show(index) {
      buttons.forEach((button, position) => { button.setAttribute('aria-selected', String(position === index)); button.tabIndex = position === index ? 0 : -1; });
      body.setAttribute('aria-labelledby', buttons[index].id);
      const [, url, kind] = files[index];
      body.dataset.kind = kind;
      body.replaceChildren(node('p', 'trial-solution-status', 'Loading the submitted file…'));
      loadText(url).then(text => {
        if (!body.isConnected || body.dataset.kind !== kind || body.getAttribute('aria-labelledby') !== buttons[index].id) return;
        body.replaceChildren(kind === 'code' ? renderCode(text) : renderProse(text));
      }).catch(() => {
        if (body.isConnected) body.replaceChildren(node('p', 'trial-solution-status', 'This file is not available right now. The source ZIP holds it.'));
      });
    }
    show(0);
  }
  async function loadText(url) {
    const href = sameOriginURL(url);
    if (!href) throw Error('No file.');
    if (textCache.has(href)) return textCache.get(href);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(href, { signal: controller.signal, cache: 'no-cache', credentials: 'same-origin' });
      if (!response.ok) throw Error('Unavailable.');
      const text = await response.text();
      if (text.length > 400000) throw Error('File exceeds the viewer limit.');
      textCache.set(href, text);
      return text;
    } finally { clearTimeout(timeout); }
  }
  function renderCode(text) {
    const pre = node('pre', 'trial-code');
    pre.setAttribute('aria-label', 'Submitted source code');
    for (const line of text.replace(/\r\n?/g, '\n').split('\n')) pre.append(node('span', '', line.length ? line : ' '));
    return pre;
  }
  function inline(text, parent) {
    const parts = text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`|\$\$[^$\n]+\$\$|\$[^$\n]+\$|\\\([^\n]*?\\\)|\\\[[^\n]*?\\\])/);
    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) parent.append(node('strong', '', part.slice(2, -2)));
      else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) parent.append(node('code', '', part.slice(1, -1)));
      else if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) parent.append(node('span', 'trial-tex', part.slice(2, -2)));
      else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) parent.append(node('span', 'trial-tex', part.slice(1, -1)));
      else if ((part.startsWith('\\(') && part.endsWith('\\)')) || (part.startsWith('\\[') && part.endsWith('\\]'))) parent.append(node('span', 'trial-tex', part.slice(2, -2)));
      else parent.append(document.createTextNode(part));
    }
  }
  function renderProse(text) {
    const body = node('div', 'trial-prose');
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    let paragraph = [], list = null, listType = '', fence = null, table = null;
    const flushParagraph = () => { if (!paragraph.length) return; const p = node('p'); inline(paragraph.join(' '), p); body.append(p); paragraph = []; };
    const flushList = () => { list = null; listType = ''; };
    const flushTable = () => {
      if (!table) return;
      const rows = table.filter(row => !/^\s*\|?\s*:?-{2,}/.test(row));
      const scroll = node('div', 'trial-table-scroll');
      const element = node('table');
      rows.forEach((row, index) => {
        const cells = row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(cell => cell.trim());
        const tr = node('tr');
        for (const cell of cells) { const td = node(index === 0 ? 'th' : 'td'); inline(cell, td); tr.append(td); }
        element.append(tr);
      });
      scroll.append(element);
      body.append(scroll);
      table = null;
    };
    for (const raw of lines) {
      if (fence !== null) {
        if (raw.trim().startsWith('```')) { const pre = node('pre'); pre.append(node('code', '', fence.join('\n'))); body.append(pre); fence = null; }
        else fence.push(raw);
        continue;
      }
      const line = raw.replace(/\s+$/, '');
      if (line.trim().startsWith('```')) { flushParagraph(); flushList(); flushTable(); fence = []; continue; }
      if (line.trim().startsWith('|')) { flushParagraph(); flushList(); (table = table || []).push(line); continue; }
      flushTable();
      if (!line.trim()) { flushParagraph(); flushList(); continue; }
      const heading = /^#{1,6}\s+(.*)$/.exec(line);
      if (heading) { flushParagraph(); flushList(); const h = node('h5'); inline(heading[1], h); body.append(h); continue; }
      const item = /^\s*([-*•]|\d+[.)])\s+(.*)$/.exec(line);
      if (item) {
        flushParagraph();
        const type = /^\d/.test(item[1]) ? 'ol' : 'ul';
        if (!list || listType !== type) { list = node(type); listType = type; body.append(list); }
        const li = node('li');
        inline(item[2], li);
        list.append(li);
        continue;
      }
      if (list && /^\s{2,}\S/.test(line) && list.lastElementChild) { list.lastElementChild.append(document.createTextNode(' ')); inline(line.trim(), list.lastElementChild); continue; }
      flushList();
      paragraph.push(line.replace(/^>\s?/, '').trim());
    }
    flushParagraph(); flushTable();
    if (fence !== null) { const pre = node('pre'); pre.append(node('code', '', fence.join('\n'))); body.append(pre); }
    return body;
  }

  /* ── loading and page-level events ────────────────────────── */
  async function load() {
    find('retry').hidden = true;
    find('status').hidden = false;
    find('status').replaceChildren(node('strong', '', 'Loading the measured runs.'), node('p', '', 'Results appear only when their checks and source artifacts are available.'));
    root.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const url = sameOriginURL(root.dataset.trialResults);
      if (!url) throw Error('Invalid results URL.');
      const response = await fetch(url, { signal: controller.signal, cache: 'no-cache', credentials: 'same-origin' });
      if (!response.ok) throw Error('The measured results are not available.');
      const text = await response.text();
      if (text.length > 2000000) throw Error('Results exceed the viewer limit.');
      data = validate(JSON.parse(text));
      renderProtocol();
      find('status').hidden = true;
      find('explorer').hidden = false;
    } catch {
      stopPlayback();
      find('explorer').hidden = true;
      find('protocol').hidden = true;
      const board = find('scoreboard');
      if (board) board.hidden = true;
      find('status').replaceChildren(node('strong', '', 'The measured results are not available right now.'), node('p', '', 'No scores or example products have been substituted. Retry to load the published experiment.'));
      find('retry').hidden = false;
    } finally {
      clearTimeout(timeout);
      root.removeAttribute('aria-busy');
    }
  }
  find('repeat').addEventListener('change', () => {
    repeatIndex = Number(find('repeat').value);
    frameIndex = 0;
    renderPanel();
    announce(`${taskNames[currentTask().id]}, run ${currentRun().repeat}.`);
  });
  find('retry').addEventListener('click', load);
  find('close').addEventListener('click', () => find('zoom').close());
  find('zoom').addEventListener('close', () => {
    if (zoomInvoker?.isConnected) zoomInvoker.focus({ preventScroll: true });
    zoomInvoker = null;
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlayback(); });
  window.addEventListener('pagehide', stopPlayback);
  window.addEventListener('resize', fitLiveFrames);
  reducedMotion.addEventListener('change', () => {
    stopPlayback();
    if (playbackButton?.dataset.kind === 'parameter') playbackButton.disabled = reducedMotion.matches || playbackButton.dataset.available !== 'true';
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) stopPlayback();
  }).observe(root);
  load();
})();
