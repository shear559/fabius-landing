'use strict';
(() => {
  const KEY = 'fieldnote-board:v1';
  const MAX_BYTES = 1024 * 1024;
  const STATUSES = { todo: 'To do', doing: 'In progress', done: 'Done' };
  const PRIORITIES = { low: 'Low', medium: 'Medium', high: 'High' };
  const $ = (selector) => document.querySelector(selector);
  const form = $('#task-form');
  const dialog = $('#task-dialog');
  let tasks = [], baseline = null, originalBytes = null, recovery = false, conflict = false, unsaved = false;
  let storageError = '', importError = '', editingId = null, deleted = null, returnFocus = null;
  const icons = {
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15l-1 5Z"/></svg>',
    delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18"/></svg>'
  };
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function validDate(value) {
    if (value === '') return true;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    return y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  }
  function textField(value, name, max) {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required.`);
    if (value !== value.trim()) throw new Error(`${name} must not have leading or trailing spaces.`);
    if (value.length > max) throw new Error(`${name} must be ${max} characters or fewer.`);
  }
  function validateTask(task) {
    if (!task || typeof task !== 'object' || Array.isArray(task)) throw new Error('Each task must be an object.');
    const keys = ['id', 'title', 'project', 'status', 'priority', 'dueDate', 'tags'];
    if (Object.keys(task).length !== keys.length || !keys.every(k => Object.hasOwn(task, k))) throw new Error('Each task must contain exactly id, title, project, status, priority, dueDate and tags.');
    if (typeof task.id !== 'string' || task.id.length === 0 || task.id.length > 80) throw new Error('Task ID must be a nonempty string of 80 characters or fewer.');
    textField(task.title, 'Title', 120);
    textField(task.project, 'Project', 80);
    if (typeof task.status !== 'string' || !Object.hasOwn(STATUSES, task.status)) throw new Error('Status must be todo, doing or done.');
    if (typeof task.priority !== 'string' || !Object.hasOwn(PRIORITIES, task.priority)) throw new Error('Priority must be low, medium or high.');
    if (!validDate(task.dueDate)) throw new Error('Due date must be a real calendar date in YYYY-MM-DD format, or blank.');
    if (!Array.isArray(task.tags) || task.tags.length > 8) throw new Error('Use an array of no more than 8 tags.');
    task.tags.forEach(tag => textField(tag, 'Each tag', 24));
    return { id: task.id, title: task.title, project: task.project, status: task.status, priority: task.priority, dueDate: task.dueDate, tags: [...task.tags] };
  }
  function parseBoard(raw) {
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error('This is not valid JSON. Choose a Fieldnote board export.'); }
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.tasks)) throw new Error('Expected a version 1 board with schemaVersion: 1 and a tasks array.');
    const ids = new Set();
    return data.tasks.map((task, i) => {
      let validated;
      try { validated = validateTask(task); } catch (error) { throw new Error(`Task ${i + 1}: ${error.message}`); }
      if (ids.has(validated.id)) throw new Error(`Task ${i + 1}: duplicate task ID. Every task needs a unique ID.`);
      ids.add(validated.id);
      return validated;
    });
  }
  function seed() {
    return [
      { id: 'fn-studio-01', title: 'Map out the new website experience', project: 'Studio website', status: 'todo', priority: 'high', dueDate: '2026-09-15', tags: ['planning', 'website'] },
      { id: 'fn-studio-02', title: 'Gather references for the visual direction', project: 'Brand refresh', status: 'todo', priority: 'medium', dueDate: '2026-09-18', tags: ['inspiration', 'design'] },
      { id: 'fn-studio-03', title: 'Write a first draft of our studio story', project: 'Studio website', status: 'todo', priority: 'low', dueDate: '', tags: ['copywriting'] },
      { id: 'fn-studio-04', title: 'Explore a warmer, more expressive palette', project: 'Brand refresh', status: 'doing', priority: 'high', dueDate: '2026-09-14', tags: ['design', 'exploration'] },
      { id: 'fn-studio-05', title: 'Build the homepage wireframes', project: 'Studio website', status: 'doing', priority: 'medium', dueDate: '2026-09-17', tags: ['website', 'wireframes'] },
      { id: 'fn-studio-06', title: 'Collect feedback from the team', project: 'Brand refresh', status: 'done', priority: 'medium', dueDate: '2026-09-08', tags: ['research'] },
      { id: 'fn-studio-07', title: 'Set the project goals and milestones', project: 'Studio website', status: 'done', priority: 'low', dueDate: '2026-09-07', tags: ['planning', 'team'] }
    ];
  }
  function serialize() { return JSON.stringify({ schemaVersion: 1, tasks }, null, 2); }
  function markConflict() {
    conflict = true;
    renderNotices();
    updateLocks();
    if (dialog.open) showFormError('This board changed in another tab. Close this form and reload the board before editing.');
  }
  // Compare the current bytes immediately before each mutation, including after asynchronous import.
  function canMutate(allowRecovery = false) {
    if (conflict || (recovery && !allowRecovery)) return false;
    try {
      if (localStorage.getItem(KEY) !== baseline) { markConflict(); return false; }
    } catch (error) {
      storageError = 'Browser storage is unavailable. Your work is held in memory; export it to keep a copy.';
    }
    return true;
  }
  function persist() {
    try {
      const current = localStorage.getItem(KEY);
      if (current !== baseline) { unsaved = true; markConflict(); return; }
      const raw = serialize();
      localStorage.setItem(KEY, raw);
      baseline = raw;
      unsaved = false;
      storageError = '';
    } catch (error) {
      unsaved = true;
      storageError = 'Changes are not saved. Browser storage may be full or unavailable. Your current board is kept in memory. Export a backup or try saving again.';
    }
  }
  function loadBoard() {
    tasks = []; recovery = false; conflict = false; unsaved = false; originalBytes = null; storageError = ''; importError = ''; deleted = null;
    $('#toast').hidden = true;
    try { baseline = localStorage.getItem(KEY); }
    catch { baseline = null; storageError = 'Browser storage could not be read. Start a board in memory and export your work before closing this page.'; unsaved = true; render(); return; }
    if (baseline === null) { tasks = seed(); persist(); }
    else {
      try { tasks = parseBoard(baseline); }
      catch (error) { originalBytes = baseline; recovery = true; storageError = error.message; }
    }
    render();
  }
  function download(content, name, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = el('a'); link.href = url; link.download = name;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function notice(title, message, actions = [], error = false) {
    const box = el('div', `notice${error ? ' error' : ''}`);
    box.append(el('strong', '', title), el('p', '', message));
    if (actions.length) {
      const row = el('div', 'notice-actions');
      for (const [label, action] of actions) { const b = el('button', '', label); b.type = 'button'; b.addEventListener('click', action); row.append(b); }
      box.append(row);
    }
    return box;
  }
  function renderNotices() {
    const area = $('#notice-area'); area.replaceChildren();
    if (conflict) area.append(notice('This board changed in another tab', 'Editing is paused to protect the newer board. Export any work here, then explicitly reload to use the latest saved version.', [['Reload board', () => { if (unsaved && !confirm('Reload the saved board? Unsaved changes in this tab will be discarded. Export first if you need a copy.')) return; if (dialog.open) dialog.close(); loadBoard(); }]]));
    if (recovery) area.append(notice('Your saved board needs recovery', `The original data is untouched. ${storageError} Download it for safekeeping, import a valid board, or reset to the sample board.`, [['Download original data', () => download(originalBytes, 'fieldnote-original.txt', 'text/plain;charset=utf-8')], ['Reset board', () => {
      if (!canMutate(true)) return;
      if (!confirm('Replace the unreadable saved board with the sample board? Download the original data first if you want to keep it.')) return;
      if (!canMutate(true)) return;
      tasks = seed(); recovery = false; persist(); render();
    }]], true));
    else if (storageError) area.append(notice('Your work is not saved', storageError, [['Export backup', () => download(serialize(), 'fieldnote-backup.json')], ['Try saving again', () => { if (canMutate()) { persist(); render(); } }]], true));
    if (importError) area.append(notice('Import could not be completed', importError, [['Dismiss', () => { importError = ''; renderNotices(); }]], true));
    $('#save-state').replaceChildren();
    $('#save-state').append(el('span', 'local-dot'), document.createTextNode(conflict ? 'Reload needed · edits paused' : recovery ? 'Saved data needs recovery' : unsaved || storageError ? 'Not saved · export a backup' : 'All changes saved locally'));
  }
  function updateLocks() {
    const locked = conflict || recovery;
    $('#create-task').disabled = locked;
    $('#save-task').disabled = locked;
    document.querySelectorAll('[data-action], .column-add, .add-bottom').forEach(node => { node.disabled = locked; });
    $('#undo-delete').disabled = locked;
    $('#import-file').disabled = conflict;
    $('#export').disabled = recovery;
  }
  function updateProjects() {
    const projects = [...new Set(tasks.map(t => t.project))].sort((a, b) => a.localeCompare(b));
    const select = $('#filter-project'), selected = select.value;
    select.replaceChildren(new Option('All projects', 'all'));
    for (const project of projects) select.add(new Option(project, project));
    select.value = projects.includes(selected) ? selected : 'all';
    $('#project-options').replaceChildren(...projects.map(p => { const option = el('option'); option.value = p; return option; }));
    $('#project-list').replaceChildren(...projects.map(p => { const row = el('div', 'project-item'); row.append(el('span', 'project-dot'), el('span', '', p), el('small', '', tasks.filter(t => t.project === p).length)); return row; }));
  }
  function formatDue(value) {
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(0); date.setFullYear(y, m - 1, d); date.setHours(12, 0, 0, 0);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(y !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
  }
  function card(task) {
    const article = el('article', 'task-card'); article.dataset.testid = 'task-card'; article.dataset.taskId = task.id;
    const top = el('div', 'task-top'); top.append(el('span', 'task-project', task.project), el('span', `priority ${task.priority}`, PRIORITIES[task.priority]));
    const title = el('h3', '', task.title);
    const tags = el('div', 'task-tags'); for (const tag of task.tags) tags.append(el('span', 'tag', tag));
    const foot = el('div', 'task-footer');
    const now = new Date(); const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const overdue = task.dueDate && task.dueDate < today && task.status !== 'done';
    const due = el('span', `task-date${overdue ? ' overdue' : ''}`); due.innerHTML = icons.calendar;
    due.append(document.createTextNode(task.dueDate ? formatDue(task.dueDate) : 'No due date'));
    due.title = task.dueDate ? `${overdue ? 'Overdue: ' : 'Due: '}${task.dueDate}` : 'No due date';
    const status = el('select', 'task-status'); status.dataset.action = 'status'; status.setAttribute('aria-label', `Status for ${task.title}`);
    for (const [key, label] of Object.entries(STATUSES)) status.add(new Option(label, key));
    status.value = task.status;
    status.addEventListener('change', () => {
      if (!canMutate()) { status.value = task.status; return; }
      tasks = tasks.map(t => t.id === task.id ? { ...t, status: status.value } : t); persist(); render();
      (findCard(task.id)?.querySelector('[data-action="status"]') || $('#filter-status')).focus();
    });
    foot.append(due, status);
    for (const action of ['edit', 'delete']) {
      const b = el('button', 'icon-button'); b.type = 'button'; b.dataset.action = action; b.innerHTML = icons[action];
      b.setAttribute('aria-label', `${action === 'edit' ? 'Edit' : 'Delete'} ${task.title}`); b.title = action === 'edit' ? 'Edit task' : 'Delete task';
      b.addEventListener('click', () => action === 'edit' ? openForm(task) : deleteTask(task.id)); foot.append(b);
    }
    article.append(top, title, tags, foot); return article;
  }
  function findCard(id) { return [...document.querySelectorAll('[data-testid="task-card"]')].find(node => node.dataset.taskId === id); }
  function renderBoard() {
    const search = $('#search').value.trim().toLocaleLowerCase();
    const status = $('#filter-status').value, project = $('#filter-project').value, priority = $('#filter-priority').value;
    const filtering = !!search || status !== 'all' || project !== 'all' || priority !== 'all';
    const matches = tasks.filter(t => (!search || [t.title, t.project, ...t.tags].some(text => text.toLocaleLowerCase().includes(search))) && (status === 'all' || t.status === status) && (project === 'all' || t.project === project) && (priority === 'all' || t.priority === priority));
    $('#match-count').textContent = `${matches.length} of ${tasks.length} tasks`;
    $('#clear-filters').hidden = !filtering;
    const empty = $('#empty-state'); empty.hidden = !!matches.length || recovery; empty.replaceChildren();
    if (!matches.length && !recovery) {
      empty.append(el('h3', '', tasks.length || filtering ? 'A little too quiet here.' : 'A fresh page for your next idea.'), el('p', '', tasks.length || filtering ? 'No tasks match these filters. Try a different search or clear the filters to see your board.' : 'Start with one small step. Create your first task and give it a project.'));
      const b = el('button', 'button secondary', tasks.length || filtering ? 'Clear filters' : 'Create your first task');
      b.addEventListener('click', tasks.length || filtering ? clearFilters : () => openForm()); b.disabled = conflict; empty.append(b);
    }
    const columns = $('#board-columns'); columns.replaceChildren(); columns.hidden = recovery || (!matches.length && filtering);
    for (const [key, label] of Object.entries(STATUSES)) {
      const column = el('section', `board-column ${key}`); column.setAttribute('aria-label', label);
      const group = matches.filter(t => t.status === key);
      const heading = el('div', 'column-heading'); heading.append(el('span', 'status-dot'), el('strong', '', label), el('span', 'column-count', group.length));
      const add = el('button', 'column-add', '+'); add.setAttribute('aria-label', `Add task to ${label}`); add.addEventListener('click', () => openForm(null, key)); heading.append(add); column.append(heading);
      if (group.length) group.forEach(t => column.append(card(t)));
      else column.append(el('p', 'column-empty', key === 'done' ? 'Good things take a little time.\nCompleted work will land here.' : 'Room for the next step.'));
      const bottom = el('button', 'add-bottom', '+  Add task'); bottom.setAttribute('aria-label', `Add task to ${label}`); bottom.addEventListener('click', () => openForm(null, key)); column.append(bottom); columns.append(column);
    }
    updateLocks();
  }
  function render() {
    $('#nav-count').textContent = tasks.length;
    $('#stat-total').textContent = tasks.length;
    $('#stat-doing').textContent = tasks.filter(t => t.status === 'doing').length;
    const done = tasks.filter(t => t.status === 'done').length;
    $('#stat-done').textContent = done;
    $('#completion-text').textContent = tasks.length ? `${Math.round(done / tasks.length * 100)}% of the board, complete` : 'Fresh possibilities ahead';
    updateProjects(); renderNotices(); renderBoard();
  }
  function clearFilters() {
    $('#search').value = ''; for (const kind of ['status', 'project', 'priority']) $(`#filter-${kind}`).value = 'all';
    renderBoard(); $('#search').focus();
  }
  function showFormError(message) { $('#form-error').textContent = message; $('#form-error').hidden = false; }
  function openForm(task = null, status = 'todo') {
    if (!canMutate()) return;
    returnFocus = document.activeElement; editingId = task?.id ?? null;
    form.reset(); $('#form-error').hidden = true;
    $('#dialog-title').textContent = task ? 'Edit task' : 'New task';
    $('#save-task').textContent = task ? 'Save changes' : 'Create task';
    if (task) for (const key of ['title', 'project', 'status', 'priority', 'dueDate', 'tags']) form.elements[key].value = key === 'tags' ? task.tags.join(', ') : task[key];
    else form.elements.status.value = status;
    dialog.showModal(); form.elements.title.focus();
  }
  function generateId() {
    let id;
    do { id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `fn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`; } while (tasks.some(t => t.id === id) || deleted?.task.id === id);
    return id;
  }
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!canMutate()) { showFormError('Editing is paused. Close this form and resolve the board notice first.'); return; }
    const seen = new Set();
    let tags = form.elements.tags.value.split(',').map(t => t.trim()).filter(t => { if (!t || seen.has(t.toLocaleLowerCase())) return false; seen.add(t.toLocaleLowerCase()); return true; });
    // Preserve imported tags containing commas when the tags field was not changed.
    const existing = editingId ? tasks.find(t => t.id === editingId) : null;
    if (existing && form.elements.tags.value === existing.tags.join(', ')) tags = [...existing.tags];
    const draft = { id: editingId || generateId(), title: form.elements.title.value.trim(), project: form.elements.project.value.trim(), status: form.elements.status.value, priority: form.elements.priority.value, dueDate: form.elements.dueDate.value.trim(), tags };
    try { validateTask(draft); } catch (error) { showFormError(error.message); return; }
    if (editingId && !tasks.some(t => t.id === editingId)) { showFormError('This task is no longer on the board. Close the form and reload.'); return; }
    tasks = editingId ? tasks.map(t => t.id === editingId ? draft : t) : [...tasks, draft];
    persist(); render(); dialog.close();
  });
  function deleteTask(id) {
    if (!canMutate()) return;
    const index = tasks.findIndex(t => t.id === id); if (index < 0) return;
    deleted = { task: structuredClone(tasks[index]), index };
    tasks = tasks.filter(t => t.id !== id); persist(); render();
    $('#toast-text').textContent = `Deleted “${deleted.task.title}”`;
    $('#toast').hidden = false; $('#undo-delete').focus();
  }
  $('#undo-delete').addEventListener('click', () => {
    if (!deleted || !canMutate()) return;
    if (tasks.some(t => t.id === deleted.task.id)) return;
    const restoredId = deleted.task.id;
    tasks.splice(Math.min(deleted.index, tasks.length), 0, deleted.task); deleted = null;
    persist(); render(); $('#toast').hidden = true;
    (findCard(restoredId)?.querySelector('[data-action="edit"]') || $('#create-task')).focus();
  });
  $('#dismiss-toast').addEventListener('click', () => { $('#toast').hidden = true; deleted = null; $('#create-task').focus(); });
  $('#create-task').addEventListener('click', () => openForm());
  $('#close-dialog').addEventListener('click', () => dialog.close());
  $('#cancel-task').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')].filter(node => node.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  dialog.addEventListener('close', () => {
    const target = returnFocus?.isConnected ? returnFocus : editingId ? findCard(editingId)?.querySelector('[data-action="edit"]') : null;
    (target || $('#create-task')).focus();
  });
  $('#search').addEventListener('input', renderBoard);
  for (const kind of ['status', 'project', 'priority']) $(`#filter-${kind}`).addEventListener('change', renderBoard);
  $('#clear-filters').addEventListener('click', clearFilters);
  $('#export').addEventListener('click', () => download(serialize(), 'fieldnote-board.json'));
  $('#import-file').addEventListener('change', async event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file || !canMutate(true)) return;
    importError = ''; renderNotices();
    try {
      if (file.size > MAX_BYTES) throw new Error('The file is too large. Choose a JSON file of 1 MiB (1,048,576 bytes) or smaller.');
      const raw = await file.text();
      const incoming = parseBoard(raw);
      if (!canMutate(true)) return;
      if (!confirm(`Replace the current board (${tasks.length} tasks) with ${incoming.length} imported tasks? This replaces all tasks. Export your current board first if you want a backup.`)) return;
      if (!canMutate(true)) return;
      tasks = incoming; recovery = false; deleted = null; $('#toast').hidden = true;
      persist(); render();
    } catch (error) { importError = error.message || 'The file could not be read. Please try again.'; renderNotices(); }
  });
  window.addEventListener('storage', event => {
    if ((event.key === KEY || event.key === null) && event.storageArea === localStorage) {
      if (event.key === null || event.newValue !== baseline) markConflict();
    }
  });
  loadBoard();
})();
