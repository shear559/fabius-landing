'use strict';
(() => {
  const KEY = 'fieldnote-board:v1';
  const LIMIT = 1024 * 1024;
  const STATUSES = { todo: 'To do', doing: 'In progress', done: 'Done' };
  const PRIORITIES = ['low', 'medium', 'high'];
  const FIELDS = ['id', 'title', 'project', 'status', 'priority', 'dueDate', 'tags'];
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const form = $('[data-testid="task-form"]');
  const dialog = $('#task-dialog');
  let tasks = [], baseline = null, corruptRaw = null, recovery = false;
  let conflict = false, unsaved = false, storageError = '', importError = '';
  let editingId = null, returnFocus = null, deleted = [], importSequence = 0;
  const filters = { search: '', status: 'all', project: 'all', projectAll: true, priority: 'all' };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + name); svg.append(use); return svg;
  }
  function button(text, handler, className = 'button secondary') {
    const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', handler); return node;
  }
  function announce(text) { $('#announcement').textContent = text; }
  function validDate(value) {
    if (value === '') return true;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    if (y < 1 || m < 1 || m > 12 || d < 1) return false;
    const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    return d <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  }
  function cleanString(value, max) { return typeof value === 'string' && value.length > 0 && value.length <= max && value.trim() === value; }
  function validateDocument(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.schemaVersion !== 1 || !Array.isArray(data.tasks)) throw new Error('Expected a board with schemaVersion 1 and a tasks array.');
    const seen = new Set();
    const result = data.tasks.map((t, index) => {
      const prefix = 'Task ' + (index + 1) + ': ';
      const fail = (message) => { throw new Error(prefix + message); };
      if (!t || typeof t !== 'object' || Array.isArray(t) || Object.keys(t).length !== FIELDS.length || !FIELDS.every(key => Object.hasOwn(t, key))) fail('must contain exactly id, title, project, status, priority, dueDate, and tags.');
      if (typeof t.id !== 'string' || !t.id.trim() || t.id.length > 80) fail('ID must be a nonempty string of at most 80 characters.');
      if (seen.has(t.id)) fail('duplicate ID. Every task needs a unique ID.');
      seen.add(t.id);
      if (!cleanString(t.title, 120)) fail('title must be trimmed, nonempty, and at most 120 characters.');
      if (!cleanString(t.project, 80)) fail('project must be trimmed, nonempty, and at most 80 characters.');
      if (typeof t.status !== 'string' || !Object.hasOwn(STATUSES, t.status)) fail('status must be todo, doing, or done.');
      if (!PRIORITIES.includes(t.priority)) fail('priority must be low, medium, or high.');
      if (!validDate(t.dueDate)) fail('due date must be empty or a real date in YYYY-MM-DD format.');
      if (!Array.isArray(t.tags) || t.tags.length > 8 || !t.tags.every(tag => cleanString(tag, 24))) fail('use at most 8 trimmed, nonempty tags of at most 24 characters each.');
      return { id: t.id, title: t.title, project: t.project, status: t.status, priority: t.priority, dueDate: t.dueDate, tags: [...t.tags] };
    });
    return result;
  }
  function parseBoard(raw) {
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error('This file is not valid JSON.'); }
    return validateDocument(data);
  }
  function documentJSON() { return JSON.stringify({ schemaVersion: 1, tasks }, null, 2); }
  function uniqueId() {
    let id;
    do { id = globalThis.crypto?.randomUUID?.() || 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2); }
    while (tasks.some(t => t.id === id) || deleted.some(item => item.task.id === id));
    return id;
  }
  function seeds() {
    const rows = [
      ['Map the new website experience', 'Website refresh', 'todo', 'high', '2026-09-14', ['strategy', 'planning']],
      ['Gather inspiration for the visual direction', 'Website refresh', 'todo', 'medium', '2026-09-16', ['design', 'research']],
      ['Draft the October content calendar', 'Autumn launch', 'todo', 'low', '2026-09-21', ['content']],
      ['Bring the homepage concept to life', 'Website refresh', 'doing', 'high', '2026-09-12', ['design', 'web']],
      ['Write the story behind the launch', 'Autumn launch', 'doing', 'medium', '2026-09-15', ['copywriting']],
      ['Build a first look at the launch kit', 'Autumn launch', 'doing', 'medium', '2026-09-18', ['design', 'brand']],
      ['Agree on the things that matter', 'Website refresh', 'done', 'medium', '2026-09-08', ['kickoff', 'strategy']],
      ['Collect a little customer perspective', 'Autumn launch', 'done', 'low', '2026-09-09', ['research']]
    ];
    return rows.map((r, i) => ({ id: 'fieldnote-seed-' + (i + 1), title: r[0], project: r[1], status: r[2], priority: r[3], dueDate: r[4], tags: r[5] }));
  }
  function staleCheck() {
    if (conflict) return false;
    try {
      if (localStorage.getItem(KEY) !== baseline) { conflict = true; renderNotices(); updateDisabled(); return false; }
      return true;
    } catch {
      storageError = 'Browser storage is unavailable. Your work is kept in memory; export a copy before closing this page.';
      return null;
    }
  }
  // Compare the stored snapshot before every write as well as listening for storage events.
  // Failed writes keep the whole working board in memory and never advance the saved snapshot.
  function commit(nextTasks, allowRecovery = false) {
    if (conflict || (recovery && !allowRecovery)) return false;
    const current = staleCheck();
    if (current === false) return false;
    tasks = nextTasks;
    const raw = documentJSON();
    try {
      if (current === null) throw new Error('Storage unavailable');
      localStorage.setItem(KEY, raw);
      baseline = raw; unsaved = false; storageError = ''; recovery = false; corruptRaw = null;
    } catch {
      unsaved = true;
      storageError = 'This change is not saved. Your working board is safe in this open tab. Retry saving or export a copy before closing it.';
      // A failed, explicitly approved recovery keeps the original bytes available for download.
    }
    render(); return true;
  }
  function loadBoard() {
    conflict = false; unsaved = false; storageError = ''; importError = ''; recovery = false; corruptRaw = null; deleted = [];
    try { baseline = localStorage.getItem(KEY); }
    catch {
      baseline = null; tasks = []; unsaved = true;
      storageError = 'Browser storage could not be read. You can work in memory and export your board, but changes are not saved.';
      render(); return;
    }
    if (baseline === null) { tasks = []; commit(seeds()); return; }
    try { tasks = parseBoard(baseline); }
    catch (error) { tasks = []; recovery = true; corruptRaw = baseline; storageError = ''; }
    render();
  }
  function download(text, name, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = el('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function reloadBoard() {
    if ((unsaved || dialog.open) && !confirm('Reload the latest saved board? Unsaved work and any open form will be discarded. Export a copy first if you need it.')) return;
    dialog.close(); importSequence++; loadBoard(); announce('Board reloaded from browser storage.');
  }
  function notice(title, message, className, actions) {
    const node = el('div', 'notice ' + (className || '')); node.setAttribute('role', 'alert');
    node.append(el('strong', '', title), el('p', '', message));
    if (actions?.length) { const row = el('div', 'notice-actions'); row.append(...actions); node.append(row); }
    $('#notices').append(node);
  }
  function renderNotices() {
    $('#notices').replaceChildren();
    if (conflict) notice('This board changed in another tab.', 'Editing is paused to protect the newer board. Export your working copy if needed, then reload the latest saved board.', '', [button('Reload board', reloadBoard), button('Export working copy', () => download(documentJSON(), 'fieldnote-working-copy.json'))]);
    if (recovery) notice('Your saved board needs recovery.', 'The saved data could not be read as a valid Fieldnote board. Its original contents have been preserved. Download them before resetting, or import a valid board.', 'error', [button('Download original data', () => download(corruptRaw, 'fieldnote-original.txt', 'text/plain;charset=utf-8')), button('Reset board', () => {
      if (conflict) return;
      if (confirm('Replace the unreadable saved data with a fresh example board? Download the original first if you want to keep it.')) { if (commit(seeds(), true)) { deleted = []; renderUndo(); } }
    })]);
    if (storageError) notice('Changes are not saved', storageError, 'error', [button('Retry saving', () => commit(tasks, true)), button('Export working copy', () => download(documentJSON(), 'fieldnote-working-copy.json'))]);
    if (importError) notice('Import could not be completed', importError + ' Your prior board has not been replaced.', 'error', [button('Dismiss', () => { importError = ''; renderNotices(); })]);
    $('#save-state').replaceChildren();
    const label = conflict ? 'Reload needed' : unsaved ? 'Not saved · in memory' : recovery ? 'Recovery needed' : 'Saved on this browser';
    if (!conflict && !unsaved && !recovery) $('#save-state').append(el('span', 'live-dot'));
    $('#save-state').append(document.createTextNode(label));
  }
  function updateDisabled() {
    const blocked = conflict || recovery;
    $('[data-testid="create-task"]').disabled = blocked;
    $$('.add-column, [data-action="edit"], [data-action="delete"], [data-action="status"]').forEach(node => node.disabled = blocked);
    $('[data-testid="save-task"]').disabled = blocked;
    $('[data-testid="undo-delete"]').disabled = blocked;
    $('#import-trigger').disabled = conflict;
    $('#import-file').disabled = conflict;
    const formNotice = $('#form-notice');
    if (dialog.open && blocked) {
      formNotice.textContent = conflict ? 'Another tab changed this board. Your form is still here, but saving is paused. Close this form to export your working board or reload the latest data.' : 'Recover the saved board before editing tasks.';
      formNotice.hidden = false;
    }
  }
  function renderProjects() {
    const projects = [...new Set(tasks.map(t => t.project))].sort((a, b) => a.localeCompare(b));
    const select = $('[data-testid="filter-project"]'); select.replaceChildren(new Option('All projects', 'all'));
    projects.forEach(project => select.add(new Option(project, project)));
    if (!filters.projectAll && !projects.includes(filters.project)) select.add(new Option(filters.project + ' (no tasks)', filters.project));
    select.selectedIndex = filters.projectAll ? 0 : [...select.options].findIndex((option, index) => index > 0 && option.value === filters.project);
    $('#project-suggestions').replaceChildren(...projects.map(p => { const option = el('option'); option.value = p; return option; }));
    $('#project-list').replaceChildren(...projects.map(project => {
      const node = button('', () => { filters.project = project; filters.projectAll = false; select.selectedIndex = [...select.options].findIndex((option, index) => index > 0 && option.value === project); renderBoard(); $('#board-title').scrollIntoView({ block: 'start' }); }, 'project-nav');
      node.setAttribute('aria-label', 'Filter project: ' + project); const dot = el('span', 'project-dot'); dot.style.background = project === 'Autumn launch' ? '#b19b82' : '#92a17b'; node.append(dot, el('span', '', project)); return node;
    }));
  }
  function dateLabel(date) {
    if (!date) return 'No due date';
    const [year, month, day] = date.split('-').map(Number);
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1] + ' ' + day + (year !== new Date().getFullYear() ? ', ' + year : '');
  }
  function card(task) {
    const node = el('article', 'task-card'); node.dataset.testid = 'task-card'; node.dataset.taskId = task.id;
    const top = el('div', 'card-top');
    const project = el('span', 'project-label' + (task.project === 'Autumn launch' ? ' project-alt' : ''), task.project);
    top.append(project, el('span', 'priority ' + task.priority, task.priority[0].toUpperCase() + task.priority.slice(1)));
    const heading = el('h4', '', task.title);
    const tags = el('div', 'tags'); task.tags.forEach(tag => tags.append(el('span', 'tag', tag)));
    const bottom = el('div', 'card-bottom');
    const due = el('span', 'due-date'); due.append(icon('calendar'), document.createTextNode(dateLabel(task.dueDate))); if (task.dueDate) due.title = task.dueDate;
    const actions = el('div', 'card-actions');
    const status = el('select', 'card-status'); status.dataset.action = 'status'; status.setAttribute('aria-label', 'Status for ' + task.title);
    Object.entries(STATUSES).forEach(([value, label]) => status.add(new Option(label, value))); status.value = task.status;
    status.addEventListener('change', () => {
      const next = tasks.map(t => t.id === task.id ? { ...t, status: status.value } : t);
      if (commit(next)) { announce('Task moved to ' + STATUSES[status.value] + (unsaved ? '. Change is not saved.' : '.')); focusTask(task.id, 'status'); }
      else status.value = task.status;
    });
    const edit = button('', () => openForm(task.id), 'icon-button'); edit.dataset.action = 'edit'; edit.setAttribute('aria-label', 'Edit ' + task.title); edit.title = 'Edit task'; edit.append(icon('edit'));
    const remove = button('', () => deleteTask(task.id), 'icon-button'); remove.dataset.action = 'delete'; remove.setAttribute('aria-label', 'Delete ' + task.title); remove.title = 'Delete task'; remove.append(icon('trash'));
    actions.append(status, edit, remove); bottom.append(due, actions); node.append(top, heading, tags, bottom); return node;
  }
  function focusTask(id, action) {
    const node = $$('[data-testid="task-card"]').find(n => n.dataset.taskId === id);
    (node?.querySelector('[data-action="' + action + '"]') || $('[data-testid="create-task"]')).focus();
  }
  function renderBoard() {
    const query = filters.search.toLocaleLowerCase().trim();
    const matching = tasks.filter(t => (filters.status === 'all' || t.status === filters.status) && (filters.projectAll || t.project === filters.project) && (filters.priority === 'all' || t.priority === filters.priority) && (!query || [t.title, t.project, ...t.tags].some(value => value.toLocaleLowerCase().includes(query))));
    $('#result-count').textContent = `Showing ${matching.length} of ${tasks.length} tasks`;
    const active = !!query || !filters.projectAll || ['status', 'priority'].some(key => filters[key] !== 'all');
    $('#clear-filters').hidden = !active;
    const empty = $('#empty-state'); empty.replaceChildren(); empty.hidden = matching.length > 0 || recovery;
    $('#kanban').hidden = matching.length === 0 && !recovery;
    if (!matching.length && !recovery) {
      empty.append(icon(tasks.length ? 'search' : 'leaf'), el('h3', '', tasks.length ? 'A little too quiet here.' : 'Make room for your first idea.'), el('p', '', tasks.length ? 'No tasks match these filters. Try a different search or clear the filters to see your board.' : 'Start with one small next step. Add a task and give it a place to grow.'));
      empty.append(button(tasks.length || active ? 'Clear filters' : 'Create your first task', tasks.length || active ? clearFilters : () => openForm(), 'button secondary'));
    }
    Object.keys(STATUSES).forEach(status => {
      const subset = matching.filter(t => t.status === status);
      $('#count-' + status).textContent = subset.length;
      const list = $('#tasks-' + status); list.replaceChildren(...subset.map(card));
      if (!subset.length) list.append(el('div', 'column-empty', recovery ? 'Your data is preserved. Use recovery above.' : active ? 'No matching tasks in this column.' : status === 'done' ? 'Small wins will land here.' : status === 'doing' ? 'Ready when you are.' : 'A little breathing room.'));
    });
    updateDisabled();
  }
  function renderUndo() {
    const item = deleted.at(-1); $('#undo-toast').hidden = !item;
    if (item) $('#undo-message').textContent = 'Deleted “' + item.task.title + '”' + (unsaved ? ' · not saved' : '');
    $('[data-testid="undo-delete"]').disabled = conflict || recovery;
  }
  function render() {
    $('#nav-count').textContent = tasks.length;
    $('#stat-total').textContent = tasks.length;
    $('#stat-doing').textContent = tasks.filter(t => t.status === 'doing').length;
    const done = tasks.filter(t => t.status === 'done').length;
    $('#stat-done').textContent = done;
    const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    $('#progress-percent').textContent = percent + '%'; $('#progress-fill').style.width = percent + '%';
    $('.progress-track').setAttribute('aria-valuenow', percent);
    $('#progress-caption').textContent = tasks.length ? `${done} of ${tasks.length} tasks brought across the finish line.` : 'Your next chapter starts with a task.';
    renderProjects(); renderNotices(); renderBoard(); renderUndo();
  }
  function clearFilters() {
    filters.search = ''; filters.project = filters.status = filters.priority = 'all'; filters.projectAll = true;
    $('[data-testid="search"]').value = '';
    ['status', 'project', 'priority'].forEach(key => $('[data-testid="filter-' + key + '"]').value = 'all'); renderBoard();
  }
  function clearErrors() {
    $$('.field-error').forEach(node => node.textContent = '');
    $$('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
    $('#form-notice').hidden = true; $('#form-notice').textContent = '';
  }
  function openForm(id = null, status = 'todo') {
    if (conflict || recovery) return;
    returnFocus = document.activeElement; editingId = id; form.reset(); clearErrors();
    const task = id ? tasks.find(t => t.id === id) : null;
    if (id && !task) return;
    $('#dialog-title').textContent = task ? 'Edit task' : 'New task';
    const save = $('[data-testid="save-task"]'); save.replaceChildren(document.createTextNode(task ? 'Save changes' : 'Create task'), icon('arrow'));
    if (task) FIELDS.filter(key => key !== 'id').forEach(key => form.elements.namedItem(key).value = key === 'tags' ? task.tags.join(', ') : task[key]);
    else { form.elements.namedItem('status').value = status; if (!filters.projectAll) form.elements.namedItem('project').value = filters.project; }
    dialog.showModal(); form.elements.namedItem('title').focus();
  }
  function closeFocus() {
    if (returnFocus?.isConnected) returnFocus.focus();
    else if (editingId) focusTask(editingId, 'edit');
    else $('[data-testid="create-task"]').focus();
    editingId = null;
  }
  function deleteTask(id) {
    if (conflict || recovery) return;
    const index = tasks.findIndex(t => t.id === id); if (index < 0) return;
    const task = tasks[index];
    if (commit(tasks.filter(t => t.id !== id))) {
      deleted.push({ task, index }); renderUndo(); $('[data-testid="undo-delete"]').focus();
      announce('Task deleted. Undo is available for this session.');
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault(); if (conflict || recovery) return; clearErrors();
    const values = Object.fromEntries(['title', 'project', 'status', 'priority', 'dueDate', 'tags'].map(key => [key, form.elements.namedItem(key).value]));
    values.title = values.title.trim(); values.project = values.project.trim(); values.dueDate = values.dueDate.trim();
    const originalTask = editingId ? tasks.find(t => t.id === editingId) : null;
    const seen = new Set();
    values.tags = originalTask && values.tags === originalTask.tags.join(', ') ? [...originalTask.tags] : values.tags.split(',').map(t => t.trim()).filter(t => { const lower = t.toLocaleLowerCase(); if (!t || seen.has(lower)) return false; seen.add(lower); return true; });
    const errors = {};
    if (!values.title || values.title.length > 120) errors.title = 'Enter a task title between 1 and 120 characters.';
    if (!values.project || values.project.length > 80) errors.project = 'Enter a project name between 1 and 80 characters.';
    if (!validDate(values.dueDate)) errors.dueDate = 'Enter a real calendar date in YYYY-MM-DD format, or leave it empty.';
    if (values.tags.length > 8 || values.tags.some(t => t.length > 24)) errors.tags = 'Use at most 8 unique tags, with no more than 24 characters each.';
    if (!Object.hasOwn(STATUSES, values.status) || !PRIORITIES.includes(values.priority)) { $('#form-notice').textContent = 'Choose a valid status and priority.'; $('#form-notice').hidden = false; return; }
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([key, message]) => { $('#error-' + key).textContent = message; form.elements.namedItem(key).setAttribute('aria-invalid', 'true'); });
      form.elements.namedItem(Object.keys(errors)[0]).focus(); return;
    }
    const task = { id: editingId || uniqueId(), ...values };
    if (editingId && !tasks.some(t => t.id === editingId)) { $('#form-notice').hidden = false; $('#form-notice').textContent = 'This task is no longer on the board. Close the form and create a new task.'; return; }
    const next = editingId ? tasks.map(t => t.id === editingId ? task : t) : [...tasks, task];
    if (commit(next)) { dialog.close(); announce(unsaved ? 'Task updated in memory. This change is not saved; export a copy or retry saving.' : 'Task saved.'); }
  });
  $$('[data-testid="create-task"]').forEach(node => node.addEventListener('click', () => openForm()));
  $$('.add-column').forEach(node => node.addEventListener('click', () => openForm(null, node.dataset.addStatus)));
  $$('.close-dialog').forEach(node => node.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', closeFocus);
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(node => !node.hidden);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
  });
  $('[data-testid="search"]').addEventListener('input', event => { filters.search = event.target.value; renderBoard(); });
  ['status', 'project', 'priority'].forEach(key => $('[data-testid="filter-' + key + '"]').addEventListener('change', event => { filters[key] = event.target.value; if (key === 'project') filters.projectAll = event.target.selectedIndex === 0; renderBoard(); }));
  $('#clear-filters').addEventListener('click', clearFilters);
  $('[data-testid="undo-delete"]').addEventListener('click', () => {
    const item = deleted.at(-1); if (!item || conflict || recovery) return;
    if (tasks.some(t => t.id === item.task.id)) { announce('This task ID already exists; undo is unavailable.'); return; }
    const next = [...tasks]; next.splice(Math.min(item.index, next.length), 0, item.task);
    if (commit(next)) { deleted.pop(); renderUndo(); focusTask(item.task.id, 'edit'); announce(unsaved ? 'Task restored in memory, but not saved.' : 'Task restored and saved.'); }
  });
  $('#dismiss-undo').addEventListener('click', () => { deleted = []; renderUndo(); $('[data-testid="create-task"]').focus(); });
  $('[data-testid="export"]').addEventListener('click', () => download(documentJSON(), 'fieldnote-board.json'));
  $('#import-trigger').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', async event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file || conflict) return;
    const sequence = ++importSequence;
    importError = ''; renderNotices();
    try {
      if (file.size > LIMIT) throw new Error('Choose a JSON file of 1 MiB (1,048,576 bytes) or less.');
      const raw = await file.text();
      if (sequence !== importSequence) return;
      const imported = parseBoard(raw);
      if (conflict || staleCheck() === false) return;
      if (!confirm(`Replace your entire board (${tasks.length} tasks) with ${imported.length} imported tasks? This includes tasks hidden by filters. Export a backup first if needed.`)) { announce('Import cancelled. Your board is unchanged.'); return; }
      if (commit(imported, true)) { deleted = []; clearFilters(); renderUndo(); announce(unsaved ? 'Imported board is in memory, but is not saved.' : 'Board imported and saved.'); }
    } catch (error) {
      if (sequence !== importSequence) return;
      importError = error instanceof Error ? error.message : 'The selected file could not be read.';
      renderNotices();
    }
  });
  window.addEventListener('storage', event => {
    if ((event.key === KEY || event.key === null) && event.newValue !== baseline) {
      conflict = true; renderNotices(); updateDisabled(); announce('Another tab changed the board. Reload before editing.');
    }
  });
  window.addEventListener('beforeunload', event => { if (unsaved) { event.preventDefault(); event.returnValue = ''; } });
  loadBoard();
})();
