/* Fabius paired trial viewer. No generated demo products or inferred scores. */
(() => {
  'use strict';
  const root = document.querySelector('[data-trial-results]');
  if (!root) return;
  const find = name => root.querySelector(`[data-trial-${name}]`);
  const armNames = { baseline: 'Without Fabius', fabius: 'With Fabius' };
  const taskNames = { math: 'Math', landing: 'Landing page', app: 'App' };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const countFormat = new Intl.NumberFormat('en-US');
  const decimalFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
  let data, taskIndex = 0, repeatIndex = 0, frameIndex = 0, mobileArm = 'baseline';
  let frameIds = [], captureViews = [], pointViews = [], timer = null, generation = 0, frameRequest = 0;
  let playbackButton, frameSlider, frameOutput, zoomInvoker;

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
  function safeURL(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, document.baseURI);
      if (url.username || url.password) return null;
      return url.protocol === 'https:' || (url.protocol === 'http:' && url.origin === location.origin) ? url.href : null;
    } catch { return null; }
  }
  function appendLink(parent, label, url) {
    const href = safeURL(url);
    if (!href) return;
    const link = node('a', '', label);
    link.href = href;
    parent.append(link);
  }
  function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
  function isText(value) { return typeof value === 'string' && value.length <= 20000; }
  function validate(input) {
    if (!input || typeof input !== 'object' || !input.meta || !Array.isArray(input.tasks) || input.tasks.length !== 3) throw Error('Invalid experiment data.');
    const meta = input.meta;
    for (const field of ['model', 'effort', 'version', 'date']) if (!isText(meta[field]) || !meta[field]) throw Error('Incomplete experiment metadata.');
    if (!Number.isInteger(meta.repeatCount) || meta.repeatCount < 1 || meta.repeatCount > 10 || !finite(meta.runCapSeconds) || meta.runCapSeconds <= 0) throw Error('Invalid run protocol.');
    if (new Set(input.tasks.map(task => task.id)).size !== 3) throw Error('Duplicate task data.');
    for (const task of input.tasks) {
      if (!Object.hasOwn(taskNames, task.id) || !isText(task.title) || !isText(task.summary) || !Array.isArray(task.runs) || task.runs.length < 1 || task.runs.length > 10) throw Error('Incomplete task data.');
      if (new Set(task.runs.map(run => run.repeat)).size !== task.runs.length) throw Error('Duplicate run pairs.');
      if (task.lessons !== undefined && (!Array.isArray(task.lessons) || task.lessons.length > 20 || task.lessons.some(lesson => !isText(lesson)))) throw Error('Invalid observations.');
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
          for (const field of ['seconds', 'tokens']) if (arm[field] !== null && (!finite(arm[field]) || arm[field] < 0)) throw Error('Invalid measured usage.');
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
  function renderPanel() {
    generation += 1;
    stopPlayback();
    captureViews = [];
    pointViews = [];
    playbackButton = null;
    frameSlider = null;
    frameOutput = null;
    const panel = find('panel');
    const task = currentTask();
    const run = currentRun();
    const intro = node('div', 'trial-task-intro');
    intro.append(node('h3', '', task.title), node('p', '', task.summary));
    if (isText(task.question) && task.question) intro.append(node('p', 'trial-task-question', task.question));
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
      });
      switcher.append(button);
      comparison.append(renderArm(name, run[name], task.id === 'math'));
    }
    let renderMathPoint;
    if (task.id === 'math') renderMathPoint = renderMath(panel, task, run);
    panel.append(switcher, comparison);
    if (renderMathPoint) renderMathPoint(0);
    if (task.id !== 'math') {
      frameIds = [];
      for (const name of Object.keys(armNames)) for (const snapshot of run[name]?.snapshots || []) if (!frameIds.includes(snapshot.id)) frameIds.push(snapshot.id);
      frameIndex = Math.min(frameIndex, Math.max(frameIds.length - 1, 0));
      renderPlayback(panel, switcher);
      showFrame(frameIndex);
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
  function renderArm(name, arm, isMath) {
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
    if (isMath) {
      const pointHolder = node('div');
      article.append(pointHolder);
      pointViews.push({ name, holder: pointHolder });
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
    for (const [label, value] of values) {
      const pair = node('div');
      pair.append(node('dt', '', label), node('dd', '', value));
      metrics.append(pair);
    }
    article.append(metrics);
    if (isText(arm.note) && arm.note) article.append(node('p', 'trial-arm-note', arm.note));
    const links = node('div', 'trial-artifact-links');
    appendLink(links, 'Source ZIP', arm.artifactUrl);
    appendLink(links, 'Proof / check record', arm.proofUrl);
    appendLink(links, 'Open product', arm.productUrl);
    if (links.childElementCount) article.append(links);
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
    const details = node('details', 'trial-checks');
    const failures = arm.checks.filter(check => !check.passed);
    details.append(node('summary', '', failures.length ? `${countFormat.format(failures.length)} checks missed · see every check` : 'See every recorded check'));
    const checkList = node('ul', 'trial-check-list');
    // Failures are visible first; every supplied check remains available.
    for (const check of [...failures, ...arm.checks.filter(item => item.passed)]) {
      const item = node('li');
      const state = node('span', 'trial-check-state', check.passed ? 'PASS' : 'FAIL');
      state.dataset.passed = String(check.passed);
      item.append(state, node('strong', '', check.label));
      if (check.detail) item.append(node('p', 'trial-check-detail', check.detail));
      checkList.append(item);
    }
    if (!arm.checks.length) checkList.append(node('li', '', 'No checks were recorded.'));
    details.append(checkList);
    article.append(details);
    return article;
  }
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
      if (!snapshot) {
        view.stage.replaceChildren(node('p', 'trial-stage-message', 'No capture was recorded for this condition at this state.'));
        continue;
      }
      if (!img) {
        view.stage.replaceChildren(node('p', 'trial-stage-message', 'This capture could not be loaded. Its source artifact is still linked below.'));
        continue;
      }
      const oldImages = Array.from(view.stage.querySelectorAll('img'));
      view.stage.querySelectorAll('.trial-stage-message').forEach(message => message.remove());
      view.stage.append(img);
      transitions.push({ img, oldImages });
      view.zoom.disabled = false;
      view.zoom.onclick = () => openZoom(view.name, snapshot, view.zoom);
    }
    // Both conditions transition in the same animation frame, after both captures settle.
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
    playback.append(controls, node('p', 'trial-playback-note', 'Composed walkthrough from actual captured states. Both sides advance together. These transitions are not a recording of model generation.'));
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
  function sampleNumber(value) {
    if (!finite(value)) return 'Unavailable';
    return String(value);
  }
  function renderMath(panel, task, run) {
    const all = Object.keys(armNames).flatMap(name => run[name]?.curve || []);
    const times = [...new Set(all.map(point => point.t))].sort((a, b) => a - b);
    const box = node('div', 'trial-math');
    const header = node('div', 'trial-math-header');
    header.append(node('h4', '', 'Candidate objective at sampled parameters'));
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
      if (isText(task.feasibleSet) && task.feasibleSet) box.append(node('p', 'trial-feasible-set', task.feasibleSet));
      panel.append(box);
      return () => pointViews.forEach(view => view.holder.replaceChildren(node('p', 'trial-point-empty', 'No candidate sample available.')));
    }
    const compact = matchMedia('(max-width: 699px)').matches;
    const bounds = compact
      ? { left: 48, right: 328, top: 20, bottom: 240, width: 350, height: 282 }
      : { left: 65, right: 755, top: 25, bottom: 278, width: 790, height: 325 };
    const minT = times[0], maxT = times[times.length - 1];
    const minV = Math.min(...all.map(point => point.value)), maxV = Math.max(...all.map(point => point.value));
    const rangeT = maxT - minT || 1, rangeV = maxV - minV || 1;
    const mapX = t => bounds.left + (t - minT) / rangeT * (bounds.right - bounds.left);
    const mapY = value => bounds.bottom - (value - minV + rangeV * .08) / (rangeV * 1.16) * (bounds.bottom - bounds.top);
    const svg = svgNode('svg', { class: 'trial-chart', viewBox: `0 0 ${bounds.width} ${bounds.height}`, role: 'img', 'aria-labelledby': 'trial-curve-title trial-curve-description' });
    const title = svgNode('title', { id: 'trial-curve-title' });
    title.textContent = 'Recorded candidate objective values, with and without Fabius';
    const description = svgNode('desc', { id: 'trial-curve-description' });
    description.textContent = 'Shared axes compare supplied samples. Connecting lines are visual guides between samples, not a continuous proof. The slider exposes each available parameter and its coordinates below.';
    svg.append(title, description);
    for (let index = 0; index < 3; index += 1) {
      const value = minV + (maxV - minV) * index / 2;
      const y = mapY(value);
      svg.append(svgNode('line', { x1: bounds.left, x2: bounds.right, y1: y, y2: y, class: 'trial-chart-grid' }));
      const label = svgNode('text', { x: bounds.left - 12, y: y + 5, 'text-anchor': 'end', class: 'trial-chart-text' });
      label.textContent = Number(value.toPrecision(4)).toString();
      svg.append(label);
    }
    svg.append(svgNode('line', { x1: bounds.left, x2: bounds.right, y1: bounds.bottom, y2: bounds.bottom, class: 'trial-chart-axis' }));
    for (const t of [minT, maxT]) {
      const label = svgNode('text', { x: mapX(t), y: bounds.bottom + 26, 'text-anchor': 'middle', class: 'trial-chart-text' });
      label.textContent = sampleNumber(t);
      svg.append(label);
    }
    const tLabel = svgNode('text', { x: (bounds.left + bounds.right) / 2, y: bounds.bottom + 32, 'text-anchor': 'middle', class: 'trial-chart-text' });
    tLabel.textContent = 'parameter t';
    svg.append(tLabel);
    // Draw the solid condition first so coincident dashed baseline samples remain inspectable.
    for (const name of ['fabius', 'baseline']) {
      const curve = [...(run[name]?.curve || [])].sort((a, b) => a.t - b.t);
      if (!curve.length) continue;
      svg.append(svgNode('polyline', { class: 'trial-chart-series', 'data-arm': name, points: curve.map(point => `${mapX(point.t)},${mapY(point.value)}`).join(' ') }));
    }
    const cursor = svgNode('line', { y1: bounds.top, y2: bounds.bottom, class: 'trial-chart-cursor' });
    const dots = svgNode('g');
    svg.append(cursor, dots);
    box.append(svg);
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
    box.append(scrub, sweepControls, node('p', 'trial-chart-caption', 'One parametric problem. Points come from the submitted candidates; they are not independent benchmark questions. Lines connect samples and do not establish a proof between them. Identical values overlap. Checks measure contract coverage, not an overall quality score.'));
    if (isText(task.feasibleSet) && task.feasibleSet) box.append(node('p', 'trial-feasible-set', task.feasibleSet));
    panel.append(box);
    function update(index) {
      const t = times[index];
      label.textContent = `t = ${sampleNumber(t)}`;
      slider.setAttribute('aria-valuetext', `t equals ${sampleNumber(t)}`);
      cursor.setAttribute('x1', String(mapX(t)));
      cursor.setAttribute('x2', String(mapX(t)));
      dots.replaceChildren();
      for (const view of pointViews) {
        const point = run[view.name]?.curve?.find(sample => sample.t === t);
        if (!point) { view.holder.replaceChildren(node('p', 'trial-point-empty', 'No sample was recorded at this exact parameter for this condition.')); continue; }
        dots.append(svgNode('circle', { cx: mapX(t), cy: mapY(point.value), r: view.name === 'fabius' ? 4 : 6, class: 'trial-chart-dot', 'data-arm': view.name }));
        const values = node('dl', 'trial-point');
        for (const key of ['x', 'y', 'z', 'value']) {
          const pair = node('div');
          pair.append(node('dt', '', key === 'value' ? 'f(t)' : key), node('dd', '', sampleNumber(point[key])));
          values.append(pair);
        }
        view.holder.replaceChildren(values);
      }
    }
    slider.addEventListener('input', () => { stopPlayback(); update(Number(slider.value)); });
    return update;
  }
  async function load() {
    find('retry').hidden = true;
    find('status').hidden = false;
    find('status').replaceChildren(node('strong', '', 'Loading the measured runs.'), node('p', '', 'Results appear only when their checks and source artifacts are available.'));
    root.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const url = safeURL(root.dataset.trialResults);
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
  reducedMotion.addEventListener('change', () => {
    stopPlayback();
    if (playbackButton?.dataset.kind === 'parameter') playbackButton.disabled = reducedMotion.matches || playbackButton.dataset.available !== 'true';
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) stopPlayback();
  }).observe(root);
  load();
})();
