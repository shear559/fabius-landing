/* Fabius "same brief, two runs" viewer (September 14 study). Renders published data only:
   every verdict, quote and number comes from results.json and the per-run trace files.
   Data is untrusted: everything reaches the DOM through textContent, never markup. */
(() => {
  'use strict';
  const root = document.querySelector('[data-trial2-results]');
  if (!root) return;
  const find = name => root.querySelector(`[data-trial2-${name}]`);
  const armNames = { baseline: 'Without fabius', fabius: 'With fabius' };
  const stateWords = { pass: 'met', fail: 'missed', split: 'split', pending: 'pending' };
  const countFormat = new Intl.NumberFormat('en-US');
  const decimalFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
  const traceCache = new Map();
  let data, taskIndex = 0, repeatIndex = 0, mobileArm = 'baseline', stateId = null, zoomInvoker = null, generation = 0;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
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
  function appendLink(parent, label, url, className) {
    const href = safeURL(url);
    if (!href) return null;
    const link = node('a', className || '', label);
    link.href = href;
    parent.append(link);
    return link;
  }
  function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
  function isText(value, max = 20000) { return typeof value === 'string' && value.length <= max; }
  function isCount(value) { return Number.isInteger(value) && value >= 0; }
  function shortId(value) { return isText(value, 64) ? value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) : ''; }

  function validate(input) {
    if (!input || typeof input !== 'object' || !input.meta || !Array.isArray(input.tasks) || !input.tasks.length || input.tasks.length > 8) throw Error('Invalid study data.');
    const meta = input.meta;
    for (const field of ['model', 'harness', 'judges', 'version', 'fabiusCommit', 'date']) if (!isText(meta[field], 400) || !meta[field]) throw Error('Incomplete study metadata.');
    if (!Number.isInteger(meta.repeatCount) || meta.repeatCount < 1 || meta.repeatCount > 10) throw Error('Invalid run protocol.');
    if (meta.limitations !== undefined && !isText(meta.limitations, 2000)) throw Error('Invalid limitations text.');
    if (input.contracts !== undefined) {
      if (!input.contracts || typeof input.contracts !== 'object' || Array.isArray(input.contracts)) throw Error('Invalid contract manifest.');
      for (const list of Object.values(input.contracts)) {
        if (!Array.isArray(list) || list.length > 40 || list.some(item => !item || !isText(item.path, 300) || !/^[0-9a-f]{64}$/.test(String(item.sha256)))) throw Error('Invalid contract manifest.');
      }
    }
    if (new Set(input.tasks.map(task => shortId(task.id))).size !== input.tasks.length) throw Error('Duplicate brief identifiers.');
    for (const task of input.tasks) {
      if (!shortId(task.id) || !isText(task.title, 200) || !isText(task.short, 80) || !isText(task.summary, 600) || !isText(task.rule, 600) || !isText(task.brief, 8000)) throw Error('Incomplete brief data.');
      if (!Array.isArray(task.rubric) || !task.rubric.length || task.rubric.length > 40 || task.rubric.some(row => !shortId(row.id) || !isText(row.label, 600))) throw Error('Invalid rubric.');
      if (new Set(task.rubric.map(row => row.id)).size !== task.rubric.length) throw Error('Duplicate rubric rows.');
      if (!Array.isArray(task.runs) || !task.runs.length || task.runs.length > 10) throw Error('Incomplete run data.');
      if (new Set(task.runs.map(run => run.repeat)).size !== task.runs.length) throw Error('Duplicate run pairs.');
      if (task.lessons !== undefined && (!Array.isArray(task.lessons) || task.lessons.length > 20 || task.lessons.some(lesson => !isText(lesson, 1200)))) throw Error('Invalid lessons.');
      for (const run of task.runs) {
        if (!Number.isInteger(run.repeat) || run.repeat < 1) throw Error('Invalid run pair.');
        for (const name of Object.keys(armNames)) validateArm(run[name], task);
      }
    }
    return input;
  }
  function validateArm(arm, task) {
    if (!arm || typeof arm !== 'object') throw Error('Incomplete condition data.');
    if (!shortId(arm.run) || !isText(arm.answer, 60000)) throw Error('Incomplete run record.');
    for (const field of ['seconds', 'tokens', 'tool_calls']) if (arm[field] !== null && arm[field] !== undefined && (!finite(arm[field]) || arm[field] < 0)) throw Error('Invalid measured usage.');
    for (const field of ['answerUrl', 'traceUrl', 'artifactUrl', 'diffUrl']) if (arm[field] !== undefined && !safeURL(arm[field])) throw Error('Invalid artifact link.');
    if (!Array.isArray(arm.rows) || arm.rows.length > 40) throw Error('Invalid verdict rows.');
    if (arm.rows.length && arm.rows.length !== task.rubric.length) throw Error('Verdict rows disagree with the rubric.');
    arm.rows.forEach((row, index) => {
      if (!row || row.id !== task.rubric[index].id || !isText(row.label, 600) || typeof row.agreed !== 'boolean' || !['pass', 'fail', 'split'].includes(row.verdict)) throw Error('Invalid verdict row.');
      if (!Array.isArray(row.judges) || !row.judges.length || row.judges.length > 4 || row.judges.some(judge => !isText(judge.judge, 40) || !['pass', 'fail', 'missing'].includes(judge.verdict) || !isText(judge.quote, 2000) || !isText(judge.note, 2000))) throw Error('Invalid judge record.');
      const agreed = new Set(row.judges.map(judge => judge.verdict)).size === 1;
      if (agreed !== row.agreed || (agreed ? row.judges[0].verdict !== row.verdict : row.verdict !== 'split')) throw Error('Verdict disagrees with the judges.');
    });
    if (!isCount(arm.passed) || !isCount(arm.split) || !isCount(arm.total) || arm.passed + arm.split > arm.total) throw Error('Invalid verdict totals.');
    if (arm.rows.length && (arm.total !== arm.rows.length || arm.passed !== arm.rows.filter(row => row.verdict === 'pass').length || arm.split !== arm.rows.filter(row => row.verdict === 'split').length)) throw Error('Verdict totals disagree with the rows.');
    if (arm.observations !== undefined && (!Array.isArray(arm.observations) || arm.observations.length > 12 || arm.observations.some(item => !isText(item, 1200)))) throw Error('Invalid observations.');
    if (arm.captures !== undefined) {
      if (!Array.isArray(arm.captures) || arm.captures.length > 12 || arm.captures.some(capture => !shortId(capture.id) || !isText(capture.label, 120) || !safeURL(capture.url))) throw Error('Invalid capture data.');
      if (new Set(arm.captures.map(capture => capture.id)).size !== arm.captures.length) throw Error('Duplicate capture states.');
    }
    if (arm.captureReport !== undefined && (!arm.captureReport || typeof arm.captureReport !== 'object')) throw Error('Invalid capture report.');
    if (arm.diff !== undefined && !isText(arm.diff, 60000)) throw Error('Invalid diff.');
    if (arm.oracle !== undefined && arm.oracle !== null && (typeof arm.oracle !== 'object' || ['cli_file', 'cli_args', 'test'].some(key => arm.oracle[key] && (!isText(arm.oracle[key].stdout, 400) || !Number.isInteger(arm.oracle[key].code))))) throw Error('Invalid oracle record.');
  }
  function validateTrace(input) {
    if (!Array.isArray(input) || input.length > 3000) throw Error('Invalid trace.');
    for (const event of input) {
      if (!event || typeof event !== 'object' || !['tool_use', 'tool_result', 'text'].includes(event.kind)) throw Error('Invalid trace event.');
      if (event.kind === 'tool_use' && (!isText(event.name, 80) || !isText(event.input, 4000))) throw Error('Invalid trace event.');
    }
    return input;
  }
  function currentTask() { return data.tasks[taskIndex]; }
  function currentRun() { return currentTask().runs[repeatIndex]; }
  function announce(text) { find('announcement').textContent = text; }

  /* ── protocol line, brief cards, panel ─────────────────────── */
  function renderProtocol() {
    const meta = data.meta;
    find('method').textContent = `${meta.model} · ${meta.harness} · fabius ${meta.version} @ ${meta.fabiusCommit.slice(0, 7)} · ${meta.repeatCount} run pairs per brief · ${meta.judges} · ${meta.date}`;
    const sources = find('source-links');
    sources.replaceChildren();
    appendLink(sources, 'Read the protocol', meta.protocolUrl);
    appendLink(sources, 'Full report', meta.reportUrl);
    appendLink(sources, 'Download all artifacts', meta.artifactsUrl);
    find('protocol').hidden = false;
    find('limit-note').textContent = isText(meta.limitations) ? meta.limitations : '';
    const tabs = find('tabs');
    tabs.replaceChildren();
    data.tasks.forEach((task, index) => {
      const button = node('button', 'trial2-brief');
      button.type = 'button';
      button.id = `trial2-tab-${shortId(task.id)}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'trial2-panel');
      button.append(node('span', 'trial2-brief-short', task.short), node('span', 'trial2-brief-summary', task.summary), node('span', 'trial2-brief-rule', `Exercises: ${task.rule}`));
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
  function selectTask(index, focus = false) {
    taskIndex = index;
    repeatIndex = 0;
    stateId = null;
    const tabs = Array.from(find('tabs').children);
    tabs.forEach((tab, position) => {
      tab.setAttribute('aria-selected', String(index === position));
      tab.tabIndex = index === position ? 0 : -1;
    });
    if (focus) tabs[index].focus();
    find('panel').setAttribute('aria-labelledby', tabs[index].id);
    renderPanel();
    announce(`${currentTask().title}, run pair ${currentRun().repeat}.`);
  }
  function captureIds(run) {
    const ids = [];
    for (const name of Object.keys(armNames)) for (const capture of run[name].captures || []) if (!ids.some(item => item.id === capture.id)) ids.push({ id: capture.id, label: capture.label });
    return ids;
  }
  function renderPanel() {
    generation += 1;
    const panel = find('panel');
    const task = currentTask();
    const run = currentRun();
    panel.replaceChildren(node('h3', 'trial2-task-title', task.title));

    // a. what both runs received
    panel.append(node('h4', 'trial2-block-head', 'What both runs received'));
    panel.append(node('pre', 'trial2-brief-text', task.brief));
    const contracts = data.contracts?.[task.id];
    if (Array.isArray(contracts) && contracts.length) {
      const details = node('details', 'trial2-contracts');
      const summary = node('summary');
      summary.append(node('span', 'trial2-caret', '›'), document.createTextNode(`What the second run read first · ${contracts.length} files from fabius ${data.meta.version}`));
      const list = node('ul', 'trial2-contract-list');
      for (const item of contracts) {
        const li = node('li');
        li.append(node('span', '', item.path), node('span', 'trial2-contract-sha', `sha256 ${String(item.sha256).slice(0, 7)}`));
        list.append(li);
      }
      details.append(summary, list);
      panel.append(details);
    }

    // b. pair select (+ shared capture-state selector for captured pages)
    const controls = node('div', 'trial2-controls');
    const pairLabel = node('label', 'trial2-select', 'Run pair ');
    const select = node('select');
    select.setAttribute('aria-label', 'Choose a repeated run pair');
    task.runs.forEach((pair, position) => {
      const option = node('option', '', `Run ${pair.repeat}`);
      option.value = String(position);
      option.selected = position === repeatIndex;
      select.append(option);
    });
    select.addEventListener('change', () => {
      repeatIndex = Number(select.value);
      stateId = null;
      renderPanel();
      announce(`${task.title}, run pair ${currentRun().repeat}.`);
    });
    pairLabel.append(select);
    controls.append(pairLabel);
    panel.append(controls);

    panel.append(renderRibbon(run, task));

    const states = captureIds(run);
    if (states.length) {
      if (!states.some(state => state.id === stateId)) stateId = states[0].id;
      panel.append(node('p', 'trial2-states-label', 'Captured state, both columns together'));
      const switcher = node('div', 'trial2-switch');
      switcher.setAttribute('role', 'group');
      switcher.setAttribute('aria-label', 'Captured state of both generated pages');
      for (const state of states) {
        const button = node('button', '', state.label);
        button.type = 'button';
        button.setAttribute('aria-pressed', String(state.id === stateId));
        button.addEventListener('click', () => {
          stateId = state.id;
          for (const control of switcher.children) control.setAttribute('aria-pressed', String(control === button));
          for (const stage of panel.querySelectorAll('[data-trial2-stage]')) showCapture(stage);
          announce(`${state.label}.`);
        });
        switcher.append(button);
      }
      panel.append(switcher);
    }

    // c. the comparison stage
    const armSwitch = node('div', 'trial2-arm-switch');
    armSwitch.setAttribute('role', 'group');
    armSwitch.setAttribute('aria-label', 'Visible condition on a narrow screen');
    const comparison = node('div', 'trial2-comparison');
    for (const [name, label] of Object.entries(armNames)) {
      const button = node('button', '', label);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(mobileArm === name));
      button.setAttribute('aria-controls', `trial2-arm-${name}`);
      button.addEventListener('click', () => {
        mobileArm = name;
        for (const arm of comparison.children) arm.dataset.mobileActive = String(arm.dataset.arm === name);
        for (const control of armSwitch.children) control.setAttribute('aria-pressed', String(control === button));
      });
      armSwitch.append(button);
      comparison.append(renderArm(name, run[name], task));
    }
    panel.append(armSwitch, comparison);

    // d. lessons
    if (task.lessons?.length) {
      const lessons = node('div', 'trial2-lessons');
      lessons.append(node('h4', '', 'What these runs show'));
      const list = node('ul');
      for (const lesson of task.lessons) list.append(node('li', '', lesson));
      lessons.append(list);
      panel.append(lessons);
    }
  }
  function chip(state) {
    const word = stateWords[state] || 'pending';
    const element = node('span', 'trial2-chip', word.toUpperCase());
    element.dataset.state = word;
    return element;
  }
  function cleanQuote(text) { return text.replace(/\*\*|`/g, '').replace(/\s+/g, ' ').trim(); }
  function firstQuote(row, verdict) {
    const judge = row.judges.find(item => item.verdict === verdict && item.quote.trim() && item.quote.trim().toLowerCase() !== 'not present') || row.judges.find(item => item.verdict === verdict);
    return judge ? judge.quote : '';
  }
  function renderRibbon(run, task) {
    const ribbon = node('div', 'trial2-ribbon');
    ribbon.append(node('p', 'trial2-ribbon-head', 'Decisive differences, both judges agreeing'));
    const base = run.baseline, fab = run.fabius;
    if (!base.rows.length || !fab.rows.length) {
      ribbon.append(node('p', 'trial2-ribbon-empty', 'Judging in progress.'));
      return ribbon;
    }
    const differing = task.rubric.map((row, index) => ({ row, b: base.rows[index], f: fab.rows[index] }))
      .filter(item => item.b.agreed && item.f.agreed && item.b.verdict !== 'split' && item.f.verdict !== 'split' && item.b.verdict !== item.f.verdict);
    if (!differing.length) ribbon.append(node('p', 'trial2-ribbon-empty', 'Both runs made the same decisions on every rubric row of this pair.'));
    for (const item of differing) {
      const block = node('div', 'trial2-diff');
      block.append(node('p', 'trial2-diff-label', item.row.label));
      const pair = node('div', 'trial2-diff-pair');
      for (const [name, verdictRow] of [['baseline', item.b], ['fabius', item.f]]) {
        const cell = node('div', 'trial2-diff-cell');
        cell.dataset.arm = name;
        const head = node('p', 'trial2-diff-arm');
        head.append(document.createTextNode(armNames[name]), chip(verdictRow.verdict));
        const quote = firstQuote(verdictRow, verdictRow.verdict);
        cell.append(head, node('p', 'trial2-diff-quote', quote ? `“${cleanQuote(quote)}”` : 'No passage quoted.'));
        pair.append(cell);
      }
      block.append(pair);
      ribbon.append(block);
    }
    const tally = node('p', 'trial2-tally');
    const splits = base.split + fab.split;
    tally.textContent = `Rows met, both judges agreeing: ${base.passed} of ${base.total} without · ${fab.passed} of ${fab.total} with · ${splits} split${splits === 1 ? '' : 's'}`;
    ribbon.append(tally);
    return ribbon;
  }

  /* ── one condition column ──────────────────────────────────── */
  function renderArm(name, arm, task) {
    const article = node('article', `trial2-arm trial2-arm-${name}`);
    article.dataset.arm = name;
    article.dataset.mobileActive = String(mobileArm === name);
    article.id = `trial2-arm-${name}`;
    article.setAttribute('aria-labelledby', `${article.id}-title`);
    const heading = node('div', 'trial2-arm-heading');
    const title = node('h4');
    title.id = `${article.id}-title`;
    const marker = node('span', 'trial2-arm-marker');
    marker.setAttribute('aria-hidden', 'true');
    title.append(marker, document.createTextNode(armNames[name]));
    const status = arm.rows.length
      ? `${arm.passed} of ${arm.total} rubric rows met${arm.split ? ` · ${arm.split} split` : ''}`
      : 'Judging in progress';
    heading.append(title, node('span', 'trial2-run-status', status));
    article.append(heading);

    const metrics = node('dl', 'trial2-metrics');
    for (const [label, value, format] of [['Elapsed', arm.seconds, v => `${decimalFormat.format(v)} s`], ['Output tokens', arm.tokens, v => countFormat.format(v)], ['Tool calls', arm.tool_calls, v => countFormat.format(v)]]) {
      const item = node('div');
      item.append(node('dt', '', label), node('dd', '', finite(value) ? format(value) : 'Unavailable'));
      metrics.append(item);
    }
    article.append(metrics);

    if (arm.captures?.length) renderCaptures(article, name, arm);
    if (isText(arm.diff) || arm.oracle || task.id === 'C') renderProof(article, arm);
    renderAnswer(article, arm);
    renderScorecard(article, arm);

    const links = node('nav', 'trial2-artifacts');
    links.setAttribute('aria-label', `${armNames[name]} run files`);
    appendLink(links, 'Answer', arm.answerUrl, 'trial2-link');
    appendLink(links, 'Trace', arm.traceUrl, 'trial2-link');
    appendLink(links, 'Source ZIP', arm.artifactUrl, 'trial2-link');
    appendLink(links, 'Diff', arm.diffUrl, 'trial2-link');
    if (links.children.length) article.append(links);
    return article;
  }

  /* ── captured pages (pricing brief) ────────────────────────── */
  function renderCaptures(article, name, arm) {
    const stage = node('div', 'trial2-stage');
    stage.dataset.trial2Stage = name;
    stage.dataset.arm = name;
    article.append(stage);
    const foot = node('div', 'trial2-capture-foot');
    const label = node('p', 'trial2-capture-label');
    const enlarge = node('button', 'trial2-button', 'Enlarge');
    enlarge.type = 'button';
    enlarge.addEventListener('click', () => {
      const capture = (arm.captures || []).find(item => item.id === stateId);
      if (capture) openZoom(name, capture, enlarge);
    });
    foot.append(label, enlarge);
    article.append(foot);
    stage.trial2 = { arm, name, label, enlarge };
    showCapture(stage);
    const facts = captureFacts(arm.captureReport);
    if (facts.length) {
      const list = node('ul', 'trial2-facts');
      list.setAttribute('aria-label', 'Recorded facts about the generated page');
      for (const fact of facts) list.append(node('li', '', fact));
      article.append(list);
    }
  }
  function showCapture(stage) {
    const { arm, name, label, enlarge } = stage.trial2;
    const capture = (arm.captures || []).find(item => item.id === stateId);
    stage.replaceChildren();
    if (!capture) {
      stage.append(node('p', 'trial2-stage-message', 'This state was not captured for this run.'));
      label.textContent = 'Not captured';
      enlarge.disabled = true;
      return;
    }
    const img = new Image();
    img.src = safeURL(capture.url);
    img.alt = `${armNames[name]} — ${capture.label}. Actual captured output of the generated page.`;
    img.decoding = 'async';
    stage.append(img);
    label.textContent = capture.label;
    enlarge.disabled = false;
  }
  function captureFacts(report) {
    if (!report || typeof report !== 'object') return [];
    const facts = [];
    if (typeof report.desktop_overflow === 'boolean' && typeof report.mobile_overflow === 'boolean') {
      const where = [report.desktop_overflow ? 'at 1440' : '', report.mobile_overflow ? 'at 390' : ''].filter(Boolean);
      facts.push(where.length ? `Horizontal overflow ${where.join(' and ')}.` : 'No horizontal overflow at 1440 or 390.');
    }
    if (Array.isArray(report.console_errors) && Array.isArray(report.external_requests)) {
      const errors = report.console_errors.length, external = report.external_requests.length;
      facts.push(`${errors ? countFormat.format(errors) + ' console error' + (errors === 1 ? '' : 's') : 'No console errors'}; ${external ? countFormat.format(external) + ' external request' + (external === 1 ? '' : 's') + ' attempted' : 'no external requests'}.`);
    }
    const props = report.uses_custom_properties;
    if (props && typeof props === 'object' && isCount(props.vars) && isCount(props.inlineHex)) {
      facts.push(`${countFormat.format(props.vars)} CSS custom properties; focus-visible ${props.focusVisible ? 'styled' : 'not styled'}; ${countFormat.format(props.inlineHex)} inline hex.`);
    }
    if (Array.isArray(report.yellow_use)) {
      const total = report.yellow_use.length, buttons = report.yellow_use.filter(item => item && item.isButton === true).length;
      facts.push(total ? `Yellow as a background on ${countFormat.format(total)} element${total === 1 ? '' : 's'}, ${buttons ? countFormat.format(buttons) + ' of them buttons' : 'none a button'}.` : 'Yellow used as a background on no element.');
    }
    if (typeof report.has_svg_logo === 'boolean') facts.push(report.has_svg_logo ? 'An SVG mark sits in the header.' : 'No SVG mark drawn in the header.');
    const focus = report.focus_after_4_tabs;
    if (focus && typeof focus === 'object' && isText(focus.tag, 40)) {
      const visible = isText(focus.outline, 200) && !/^none\b/.test(focus.outline) && !/\b0px\b/.test(focus.outline);
      facts.push(`After four Tab presses, focus sat on ${focus.tag.toLowerCase()}${isText(focus.text, 60) && focus.text ? ` “${focus.text}”` : ''} with ${visible ? 'a visible outline' : 'no visible outline'}.`);
    }
    return facts.slice(0, 6);
  }

  /* ── proof timeline, diff and oracle (fix brief) ───────────── */
  function renderProof(article, arm) {
    const head = node('h5', 'trial2-block-head', 'What the run did, in order');
    article.append(head);
    const holder = node('div');
    holder.append(node('p', 'trial2-timeline-more', 'Loading the recorded tool calls…'));
    article.append(holder);
    loadTrace(arm.traceUrl).then(trace => {
      if (!holder.isConnected) return;
      holder.replaceChildren(renderTimeline(trace));
    }).catch(() => {
      if (holder.isConnected) holder.replaceChildren(node('p', 'trial2-timeline-more', 'The recorded tool calls are not available right now.'));
    });
    if (isText(arm.diff) && arm.diff.trim()) {
      article.append(node('h5', 'trial2-block-head', 'The change, as a diff against the untouched fixture'));
      const pre = node('pre', 'trial2-pre', arm.diff);
      pre.tabIndex = 0;
      pre.setAttribute('aria-label', 'Unified diff');
      article.append(pre);
    }
    const oracle = arm.oracle;
    if (oracle && oracle.cli_file && oracle.cli_args && oracle.test) {
      article.append(node('p', 'trial2-oracle', `Independent re-run after the fix: average --file data.txt → ${oracle.cli_file.stdout} · average 2 4 6 → ${oracle.cli_args.stdout} · test → ${oracle.test.stdout}`));
    }
  }
  async function loadTrace(url) {
    const href = sameOriginURL(url);
    if (!href) throw Error('No trace.');
    if (traceCache.has(href)) return traceCache.get(href);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(href, { signal: controller.signal, cache: 'no-cache', credentials: 'same-origin' });
      if (!response.ok) throw Error('Trace unavailable.');
      const text = await response.text();
      if (text.length > 1500000) throw Error('Trace exceeds the viewer limit.');
      const trace = validateTrace(JSON.parse(text));
      traceCache.set(href, trace);
      return trace;
    } finally { clearTimeout(timeout); }
  }
  function baseName(input) {
    let path = '';
    try { const parsed = JSON.parse(input); if (parsed && typeof parsed.file_path === 'string') path = parsed.file_path; } catch { path = ''; }
    if (!path) return '';
    return path.split('/').filter(Boolean).pop() || path;
  }
  function renderTimeline(trace) {
    const calls = trace.filter(event => event.kind === 'tool_use');
    if (!calls.length) return node('p', 'trial2-timeline-more', 'The run answered without using any tool.');
    const list = node('ol', 'trial2-timeline');
    const limit = 30;
    for (const event of calls.slice(0, limit)) {
      const li = node('li');
      let kind = event.name, text = '';
      if (event.name === 'Bash') { kind = 'ran'; text = event.input.replace(/\s+/g, ' ').trim(); if (text.length > 90) text = text.slice(0, 89) + '…'; }
      else if (event.name === 'Read') { kind = 'read'; text = baseName(event.input); }
      else if (event.name === 'Edit' || event.name === 'Write') { kind = 'edited'; text = baseName(event.input); }
      else if (event.name === 'Glob' || event.name === 'Grep') { kind = 'searched'; text = ''; }
      li.append(node('span', 'trial2-tl-kind', kind), node('span', 'trial2-tl-text', text || (kind === event.name ? '' : '')));
      list.append(li);
    }
    const wrapper = node('div');
    wrapper.append(list);
    if (calls.length > limit) wrapper.append(node('p', 'trial2-timeline-more', `…and ${countFormat.format(calls.length - limit)} more tool calls in the trace.`));
    return wrapper;
  }

  /* ── the answer, rendered as reading text with judge evidence ── */
  function inline(text, parent) {
    const parts = text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/);
    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) parent.append(node('strong', '', part.slice(2, -2)));
      else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) parent.append(node('code', '', part.slice(1, -1)));
      else parent.append(document.createTextNode(part));
    }
  }
  function renderMarkdown(text) {
    const body = node('div', 'trial2-answer-body');
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    let paragraph = [], list = null, listType = '', fence = null;
    const flushParagraph = () => {
      if (!paragraph.length) return;
      const p = node('p');
      inline(paragraph.join(' '), p);
      body.append(p);
      paragraph = [];
    };
    const flushList = () => { list = null; listType = ''; };
    for (const raw of lines) {
      if (fence !== null) {
        if (raw.trim().startsWith('```')) { const pre = node('pre'); pre.append(node('code', '', fence.join('\n'))); body.append(pre); fence = null; }
        else fence.push(raw);
        continue;
      }
      const line = raw.replace(/\s+$/, '');
      if (line.trim().startsWith('```')) { flushParagraph(); flushList(); fence = []; continue; }
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
    flushParagraph();
    if (fence !== null) { const pre = node('pre'); pre.append(node('code', '', fence.join('\n'))); body.append(pre); }
    return body;
  }
  function normalizeNeedle(text) {
    return text.replace(/[*`_]/g, '').replace(/^[\s"'“”‘’…\.]+|[\s"'“”‘’…\.]+$/g, '').replace(/\s+/g, ' ').trim();
  }
  function textIndex(bodyElement) {
    const walker = document.createTreeWalker(bodyElement, NodeFilter.SHOW_TEXT);
    const map = [];
    let normalized = '', pendingSpace = false, current;
    while ((current = walker.nextNode())) {
      const text = current.nodeValue;
      for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (/\s/.test(ch)) { pendingSpace = normalized.length > 0; continue; }
        if (pendingSpace) { normalized += ' '; map.push(null); pendingSpace = false; }
        normalized += ch.toLowerCase();
        map.push({ node: current, offset: i });
      }
      pendingSpace = pendingSpace || (normalized.length > 0 && text.length > 0 && /\s$/.test(text));
    }
    return { normalized, map };
  }
  function locate(index, needle, from = 0) {
    const key = needle.toLowerCase();
    const at = index.normalized.indexOf(key, from);
    if (at < 0) return null;
    let start = at, end = at + key.length - 1;
    while (start <= end && !index.map[start]) start += 1;
    while (end >= start && !index.map[end]) end -= 1;
    if (start > end) return null;
    return { start: index.map[start], end: index.map[end] };
  }
  function markRange(bodyElement, hit, rowLabel, rowId) {
    const range = document.createRange();
    range.setStart(hit.start.node, hit.start.offset);
    range.setEnd(hit.end.node, hit.end.offset + 1);
    for (const existing of bodyElement.querySelectorAll('mark.trial2-evidence')) if (range.intersectsNode(existing)) return false;
    const mark = node('mark', 'trial2-evidence');
    mark.dataset.row = rowId;
    const label = node('span', 'trial2-sr', `Evidence for: ${rowLabel}. `);
    try {
      range.surroundContents(mark);
    } catch {
      const contents = range.extractContents();
      mark.append(contents);
      range.insertNode(mark);
    }
    mark.prepend(label);
    return true;
  }
  function candidateNeedles(quote) {
    const out = [];
    for (const segment of quote.split(/\.{3}|…/)) {
      const clean = normalizeNeedle(segment);
      if (clean.length >= 12) out.push(clean);
    }
    return out;
  }
  function highlightEvidence(bodyElement, rows) {
    let count = 0;
    for (const row of rows) {
      if (row.verdict !== 'pass') continue;
      const quote = firstQuote(row, 'pass');
      if (!quote) continue;
      let marked = false;
      for (const needle of candidateNeedles(quote)) {
        const index = textIndex(bodyElement);
        let hit = locate(index, needle);
        if (!hit) {
          const sentences = needle.split(/(?<=[.!?;:])\s+/).map(normalizeNeedle).filter(s => s.length >= 20).sort((a, b) => b.length - a.length);
          for (const sentence of sentences) { hit = locate(index, sentence); if (hit) break; }
        }
        if (!hit) {
          for (let length = Math.min(needle.length - 1, 160); length >= 40 && !hit; length -= 8) hit = locate(index, needle.slice(0, length).trim());
        }
        if (hit && markRange(bodyElement, hit, row.label, row.id)) marked = true;
      }
      if (marked) count += 1;
    }
    return count;
  }
  function renderAnswer(article, arm) {
    const section = node('div', 'trial2-answer');
    section.append(node('h5', 'trial2-block-head', 'The answer'));
    const body = renderMarkdown(arm.answer);
    body.id = `${article.id}-answer`;
    const marked = highlightEvidence(body, arm.rows);
    const clamp = arm.answer.length > 1600;
    if (clamp) body.dataset.clamped = 'true';
    section.append(body);
    const foot = node('div', 'trial2-answer-foot');
    foot.append(node('p', 'trial2-legend', marked ? 'Highlighted passages are what the blind judges quoted as evidence for a met row.' : (arm.rows.length ? 'The judges quoted no passage of this answer for a met row.' : 'Judging in progress.')));
    if (clamp) {
      const button = node('button', 'trial2-button', 'Show the whole answer');
      button.type = 'button';
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', body.id);
      button.addEventListener('click', () => {
        const open = body.dataset.clamped === 'true';
        body.dataset.clamped = String(!open);
        button.setAttribute('aria-expanded', String(open));
        button.textContent = open ? 'Show less' : 'Show the whole answer';
      });
      foot.append(button);
    }
    section.append(foot);
    article.append(section);
  }

  /* ── rubric scorecard ──────────────────────────────────────── */
  function renderScorecard(article, arm) {
    const rubric = currentTask().rubric;
    article.append(node('h5', 'trial2-block-head', 'Every rubric row'));
    const list = node('ul', 'trial2-score');
    rubric.forEach((row, index) => {
      const verdictRow = arm.rows[index];
      const li = node('li', 'trial2-row');
      const details = node('details');
      const summary = node('summary');
      summary.append(chip(verdictRow ? verdictRow.verdict : 'pending'), node('span', 'trial2-row-label', row.label));
      details.append(summary);
      const judges = node('ul', 'trial2-judges');
      if (verdictRow) {
        for (const judge of verdictRow.judges) {
          const item = node('li', 'trial2-judge');
          const head = node('p', 'trial2-judge-head');
          head.append(document.createTextNode(judge.judge), chip(judge.verdict === 'missing' ? 'pending' : judge.verdict));
          item.append(head);
          item.append(node('p', 'trial2-judge-quote', judge.quote ? `“${cleanQuote(judge.quote)}”` : 'No passage quoted.'));
          if (judge.note) item.append(node('p', 'trial2-judge-note', judge.note));
          judges.append(item);
        }
      } else judges.append(node('li', 'trial2-judge', 'Judging in progress.'));
      details.append(judges);
      li.append(details);
      list.append(li);
    });
    article.append(list);
  }

  /* ── enlarge dialog, earlier-study toggle, loading ─────────── */
  function openZoom(name, capture, invoker) {
    zoomInvoker = invoker;
    const dialog = find('zoom');
    const img = new Image();
    img.src = safeURL(capture.url);
    img.alt = `${armNames[name]} — ${capture.label}. Actual captured output of the generated page.`;
    root.querySelector('#trial2-zoom-title').textContent = `${armNames[name]} · ${capture.label}`;
    find('zoom-image').replaceChildren(img);
    find('original').href = safeURL(capture.url);
    dialog.showModal();
  }
  async function load() {
    find('retry').hidden = true;
    find('status').hidden = false;
    find('status').replaceChildren(node('strong', '', 'Loading the recorded runs.'), node('p', '', 'Answers appear only with their judge verdicts and source files.'));
    root.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const url = sameOriginURL(root.dataset.trial2Results);
      if (!url) throw Error('Invalid results URL.');
      const response = await fetch(url, { signal: controller.signal, cache: 'no-cache', credentials: 'same-origin' });
      if (!response.ok) throw Error('The recorded results are not available.');
      const text = await response.text();
      if (text.length > 3000000) throw Error('Results exceed the viewer limit.');
      data = validate(JSON.parse(text));
      renderProtocol();
      find('status').hidden = true;
      find('explorer').hidden = false;
    } catch {
      find('explorer').hidden = true;
      find('protocol').hidden = true;
      find('status').replaceChildren(node('strong', '', 'The recorded runs are not available right now.'), node('p', '', 'No verdicts or answers have been substituted. Retry to load the published study.'));
      find('retry').hidden = false;
    } finally {
      clearTimeout(timeout);
      root.removeAttribute('aria-busy');
    }
  }
  find('retry').addEventListener('click', load);
  find('close').addEventListener('click', () => find('zoom').close());
  find('zoom').addEventListener('close', () => {
    if (zoomInvoker?.isConnected) zoomInvoker.focus({ preventScroll: true });
    zoomInvoker = null;
  });
  const buildsToggle = find('builds-toggle');
  const builds = document.getElementById('trials-builds');
  if (buildsToggle && builds) {
    buildsToggle.addEventListener('click', () => {
      const open = builds.hidden;
      builds.hidden = !open;
      buildsToggle.setAttribute('aria-expanded', String(open));
      buildsToggle.textContent = open ? 'Close the build study' : 'Open the build study';
      if (open) builds.querySelector('h3, [data-trial-status], [data-trial-tabs] button')?.focus?.({ preventScroll: false });
    });
  }
  load();
})();
