'use strict';
/*
 * Fieldnote Board — local-first task app.
 * No build step, no network, no dependencies. All state lives in localStorage
 * under STORAGE_KEY. See README.md for the data model and design notes.
 */

(function () {
  var STORAGE_KEY = 'fieldnote-board:v1';
  var MAX_IMPORT_BYTES = 1024 * 1024; // 1 MiB
  var STATUSES = ['todo', 'doing', 'done'];
  var PRIORITIES = ['low', 'medium', 'high'];
  var STATUS_LABELS = { todo: 'To do', doing: 'Doing', done: 'Done' };
  var PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };

  var state = {
    tasks: [],
    mode: 'normal', // 'normal' | 'corrupt'
    corruptRaw: null,
    corruptReason: '',
    storageUnavailable: false,
    conflictPending: false
  };

  var dom = {};
  var editingId = null;
  var lastFocusedElement = null;
  var toastTimer = null;

  // ---------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------

  function genId() {
    return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function isValidDateString(s) {
    if (typeof s !== 'string') return false;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return false;
    var year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
    if (month < 1 || month > 12) return false;
    var d = new Date(year, month - 1, day);
    return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
  }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function formatDueDate(dueDate) {
    var parts = dueDate.split('-').map(Number);
    var dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function isOverdue(dueDate, status) {
    if (!dueDate || status === 'done') return false;
    return dueDate < todayIso();
  }

  function normalizeTags(raw) {
    var parts = raw.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s !== ''; });
    var seen = {};
    var result = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.length > 24) return { tags: [], error: 'Tag "' + p + '" exceeds 24 characters.' };
      var key = p.toLowerCase();
      if (!seen[key]) { seen[key] = true; result.push(p); }
    }
    if (result.length > 8) return { tags: [], error: 'A task can have at most 8 tags.' };
    return { tags: result, error: null };
  }

  // ---------------------------------------------------------------------
  // Validation (shared between the form path and the import path)
  // ---------------------------------------------------------------------

  function validateTaskRecord(task) {
    var errors = [];
    if (typeof task !== 'object' || task === null || Array.isArray(task)) {
      return ['task is not a JSON object.'];
    }
    if (typeof task.id !== 'string' || task.id.trim() === '' || task.id.length > 80) {
      errors.push('id must be a nonempty string of at most 80 characters.');
    }
    if (typeof task.title !== 'string' || task.title.trim() === '' || task.title.length > 120) {
      errors.push('title must be a nonempty string of at most 120 characters.');
    }
    if (typeof task.project !== 'string' || task.project.trim() === '' || task.project.length > 80) {
      errors.push('project must be a nonempty string of at most 80 characters.');
    }
    if (STATUSES.indexOf(task.status) === -1) {
      errors.push('status must be one of todo, doing, done.');
    }
    if (PRIORITIES.indexOf(task.priority) === -1) {
      errors.push('priority must be one of low, medium, high.');
    }
    if (task.dueDate !== '' && !isValidDateString(task.dueDate)) {
      errors.push('dueDate must be "" or a valid YYYY-MM-DD calendar date.');
    }
    if (!Array.isArray(task.tags)) {
      errors.push('tags must be an array.');
    } else {
      if (task.tags.length > 8) errors.push('tags must contain at most 8 items.');
      for (var i = 0; i < task.tags.length; i++) {
        var t = task.tags[i];
        if (typeof t !== 'string' || t.trim() === '' || t !== t.trim() || t.length > 24) {
          errors.push('each tag must be a trimmed, nonempty string of at most 24 characters.');
          break;
        }
      }
    }
    return errors;
  }

  function validateBoardDocument(doc) {
    if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
      return 'expected a JSON object with schemaVersion and tasks.';
    }
    if (doc.schemaVersion !== 1) return 'unsupported or missing schemaVersion (expected 1).';
    if (!Array.isArray(doc.tasks)) return '"tasks" must be an array.';
    var seen = {};
    for (var i = 0; i < doc.tasks.length; i++) {
      var t = doc.tasks[i];
      var errs = validateTaskRecord(t);
      if (errs.length) return 'task ' + (i + 1) + ' is invalid — ' + errs[0];
      if (seen[t.id]) return 'duplicate task id "' + t.id + '".';
      seen[t.id] = true;
    }
    return null;
  }

  // ---------------------------------------------------------------------
  // Seed data
  // ---------------------------------------------------------------------

  function seedTasks() {
    return [
      { id: 'seed-1', title: 'Design onboarding flow wireframes', project: 'Orchard Kiosk', status: 'doing', priority: 'high', dueDate: '2026-09-20', tags: ['design', 'onboarding'] },
      { id: 'seed-2', title: 'Wire up offline sync queue', project: 'Orchard Kiosk', status: 'todo', priority: 'high', dueDate: '2026-09-25', tags: ['sync', 'offline'] },
      { id: 'seed-3', title: 'Fix crash on tag import', project: 'Fieldnote Board', status: 'doing', priority: 'medium', dueDate: '2026-09-16', tags: ['bug', 'import'] },
      { id: 'seed-4', title: 'Write release notes for v1.2', project: 'Fieldnote Board', status: 'todo', priority: 'low', dueDate: '', tags: ['docs'] },
      { id: 'seed-5', title: 'Spike: migrate task store to IndexedDB', project: 'Fieldnote Board', status: 'todo', priority: 'medium', dueDate: '2026-10-01', tags: ['research', 'storage'] },
      { id: 'seed-6', title: 'Synthesize user interview notes', project: 'Orchard Kiosk', status: 'done', priority: 'medium', dueDate: '2026-09-10', tags: ['research', 'ux'] },
      { id: 'seed-7', title: 'Set up staging environment', project: 'Harvest Ledger', status: 'done', priority: 'low', dueDate: '2026-09-05', tags: ['ops'] },
      { id: 'seed-8', title: 'Accessibility audit pass', project: 'Fieldnote Board', status: 'doing', priority: 'high', dueDate: '2026-09-18', tags: ['a11y', 'review'] }
    ];
  }

  // ---------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------

  function persist(tasks) {
    try {
      var payload = JSON.stringify({ schemaVersion: 1, tasks: tasks });
      localStorage.setItem(STORAGE_KEY, payload);
      return true;
    } catch (err) {
      return false;
    }
  }

  function loadBoard() {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      state.storageUnavailable = true;
      state.tasks = seedTasks();
      state.mode = 'normal';
      return;
    }

    if (raw === null) {
      var seeded = seedTasks();
      var ok = persist(seeded);
      state.tasks = seeded;
      state.mode = 'normal';
      if (!ok) state.storageUnavailable = true;
      return;
    }

    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      state.mode = 'corrupt';
      state.corruptRaw = raw;
      state.corruptReason = 'the saved data is not valid JSON';
      return;
    }

    var issue = validateBoardDocument(parsed);
    if (issue) {
      state.mode = 'corrupt';
      state.corruptRaw = raw;
      state.corruptReason = issue;
      return;
    }

    state.tasks = parsed.tasks.map(function (t) {
      return {
        id: t.id,
        title: t.title.trim(),
        project: t.project.trim(),
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        tags: t.tags.map(function (x) { return x.trim(); })
      };
    });
    state.mode = 'normal';
  }

  // ---------------------------------------------------------------------
  // DOM caching
  // ---------------------------------------------------------------------

  function cacheDom() {
    dom.appRoot = document.getElementById('app');
    dom.createTaskBtn = document.getElementById('create-task-btn');
    dom.noticeRegion = document.getElementById('notice-region');
    dom.recoveryPanel = document.getElementById('recovery-panel');
    dom.recoveryMessage = document.getElementById('recovery-message');
    dom.downloadCorruptBtn = document.getElementById('download-corrupt-btn');
    dom.resetStorageBtn = document.getElementById('reset-storage-btn');
    dom.boardRegion = document.getElementById('board-region');
    dom.searchInput = document.getElementById('search-input');
    dom.filterStatus = document.getElementById('filter-status');
    dom.filterProject = document.getElementById('filter-project');
    dom.filterPriority = document.getElementById('filter-priority');
    dom.exportBtn = document.getElementById('export-btn');
    dom.importBtn = document.getElementById('import-btn');
    dom.importFile = document.getElementById('import-file');
    dom.countBar = document.getElementById('count-bar');
    dom.board = document.getElementById('main-board');
    dom.emptyState = document.getElementById('empty-state');
    dom.toastRegion = document.getElementById('toast-region');
    dom.modalOverlay = document.getElementById('modal-overlay');
    dom.modalCloseBtn = document.getElementById('modal-close-btn');
    dom.cancelFormBtn = document.getElementById('cancel-form-btn');
    dom.formTitle = document.getElementById('form-title');
    dom.taskForm = document.getElementById('task-form');
    dom.taskId = document.getElementById('task-id');
    dom.titleInput = document.getElementById('task-title');
    dom.projectInput = document.getElementById('task-project');
    dom.statusSelect = document.getElementById('task-status');
    dom.prioritySelect = document.getElementById('task-priority');
    dom.dueInput = document.getElementById('task-due');
    dom.tagsInput = document.getElementById('task-tags');
  }

  // ---------------------------------------------------------------------
  // Toasts
  // ---------------------------------------------------------------------

  function showToast(message, type, opts) {
    opts = opts || {};
    dom.toastRegion.innerHTML = '';
    var el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' toast-error' : type === 'success' ? ' toast-success' : '');
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    var msg = document.createElement('span');
    msg.textContent = message;
    el.appendChild(msg);
    if (opts.actionLabel && opts.onAction) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn';
      btn.textContent = opts.actionLabel;
      if (opts.actionTestId) btn.setAttribute('data-testid', opts.actionTestId);
      btn.addEventListener('click', function () {
        clearTimeout(toastTimer);
        if (dom.toastRegion.contains(el)) dom.toastRegion.removeChild(el);
        opts.onAction();
      });
      el.appendChild(btn);
    }
    dom.toastRegion.appendChild(el);
    clearTimeout(toastTimer);
    var duration = opts.duration || (type === 'error' ? 6000 : 4000);
    toastTimer = setTimeout(function () {
      if (dom.toastRegion.contains(el)) dom.toastRegion.removeChild(el);
    }, duration);
  }

  // ---------------------------------------------------------------------
  // Notices (persistent, non-dismissing banners)
  // ---------------------------------------------------------------------

  function renderConflictNotice() {
    var existing = document.getElementById('conflict-notice');
    if (!state.conflictPending) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    var el = document.createElement('div');
    el.id = 'conflict-notice';
    el.className = 'notice notice-info';
    el.setAttribute('role', 'alert');
    var msg = document.createElement('span');
    msg.textContent = 'This board changed in another browser tab. Reload to see the latest data before making further edits.';
    el.appendChild(msg);
    var actions = document.createElement('div');
    actions.className = 'notice-actions';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary';
    btn.setAttribute('data-testid', 'reload-board');
    btn.textContent = 'Reload board';
    btn.addEventListener('click', function () { location.reload(); });
    actions.appendChild(btn);
    el.appendChild(actions);
    dom.noticeRegion.appendChild(el);
  }

  function renderStorageUnavailableNotice() {
    if (!state.storageUnavailable) return;
    if (document.getElementById('storage-unavailable-notice')) return;
    var el = document.createElement('div');
    el.id = 'storage-unavailable-notice';
    el.className = 'notice notice-warn';
    el.setAttribute('role', 'alert');
    el.textContent = 'Local storage is unavailable in this browser (private browsing or blocked storage). Changes will not be saved between visits.';
    dom.noticeRegion.appendChild(el);
  }

  function blockedByConflict() {
    if (state.conflictPending) {
      showToast('Reload the board first — another tab changed this data.', 'error');
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------
  // Recovery panel (corrupt storage)
  // ---------------------------------------------------------------------

  function renderRecoveryPanel() {
    if (state.mode !== 'corrupt') {
      dom.recoveryPanel.hidden = true;
      dom.boardRegion.hidden = false;
      dom.createTaskBtn.disabled = false;
      return;
    }
    dom.boardRegion.hidden = true;
    dom.createTaskBtn.disabled = true;
    dom.recoveryPanel.hidden = false;
    dom.recoveryMessage.textContent = 'Your saved board could not be read (' + state.corruptReason + '). ' +
      'Nothing has been changed or deleted. Download the original data below, or reset to start a fresh board.';
  }

  function todayStamp() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function downloadText(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------------------------------------------------------------------
  // Filtering + rendering
  // ---------------------------------------------------------------------

  function setSelectOptions(sel, options) {
    var prev = sel.value;
    sel.innerHTML = '';
    for (var i = 0; i < options.length; i++) {
      var opt = document.createElement('option');
      opt.value = options[i].value;
      opt.textContent = options[i].label;
      sel.appendChild(opt);
    }
    var stillValid = options.some(function (o) { return o.value === prev; });
    sel.value = stillValid ? prev : 'all';
  }

  function renderFilterOptions() {
    setSelectOptions(dom.filterStatus, [{ value: 'all', label: 'All statuses' }].concat(
      STATUSES.map(function (s) { return { value: s, label: STATUS_LABELS[s] }; })
    ));
    setSelectOptions(dom.filterPriority, [{ value: 'all', label: 'All priorities' }].concat(
      PRIORITIES.map(function (p) { return { value: p, label: PRIORITY_LABELS[p] }; })
    ));
    var projects = Array.from(new Set(state.tasks.map(function (t) { return t.project; }))).sort(function (a, b) { return a.localeCompare(b); });
    setSelectOptions(dom.filterProject, [{ value: 'all', label: 'All projects' }].concat(
      projects.map(function (p) { return { value: p, label: p }; })
    ));
  }

  function getFilteredTasks() {
    var q = dom.searchInput.value.trim().toLowerCase();
    var fStatus = dom.filterStatus.value;
    var fProject = dom.filterProject.value;
    var fPriority = dom.filterPriority.value;
    return state.tasks.filter(function (t) {
      if (fStatus !== 'all' && t.status !== fStatus) return false;
      if (fProject !== 'all' && t.project !== fProject) return false;
      if (fPriority !== 'all' && t.priority !== fPriority) return false;
      if (q) {
        var hay = (t.title + ' ' + t.project + ' ' + t.tags.join(' ')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function renderCount(matched, total) {
    if (total === 0) {
      dom.countBar.textContent = 'No tasks yet.';
    } else if (matched === total) {
      dom.countBar.textContent = 'Showing all ' + total + ' task' + (total === 1 ? '' : 's') + '.';
    } else {
      dom.countBar.textContent = 'Showing ' + matched + ' of ' + total + ' task' + (total === 1 ? '' : 's') + '.';
    }
  }

  function showEmptyState(kind) {
    dom.emptyState.hidden = false;
    dom.board.hidden = true;
    dom.emptyState.innerHTML = '';
    var h = document.createElement('h3');
    var p = document.createElement('p');
    dom.emptyState.appendChild(h);
    dom.emptyState.appendChild(p);
    if (kind === 'empty') {
      h.textContent = 'No tasks yet';
      p.textContent = 'Create your first task to start tracking work for this project.';
    } else {
      h.textContent = 'No matching tasks';
      p.textContent = 'Try a different search term or clear your filters.';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn';
      btn.textContent = 'Clear filters';
      btn.addEventListener('click', function () {
        dom.searchInput.value = '';
        dom.filterStatus.value = 'all';
        dom.filterProject.value = 'all';
        dom.filterPriority.value = 'all';
        renderBoardOnly();
      });
      dom.emptyState.appendChild(btn);
    }
  }

  function hideEmptyState() {
    dom.emptyState.hidden = true;
    dom.board.hidden = false;
  }

  function buildCard(task) {
    var card = document.createElement('article');
    card.className = 'task-card status-' + task.status;
    card.setAttribute('data-testid', 'task-card');
    card.setAttribute('data-task-id', task.id);

    var top = document.createElement('div');
    top.className = 'card-top';
    var title = document.createElement('h3');
    title.className = 'card-title' + (task.status === 'done' ? ' done-strike' : '');
    title.textContent = task.title;
    var badge = document.createElement('span');
    badge.className = 'badge badge-' + task.priority;
    badge.textContent = PRIORITY_LABELS[task.priority];
    top.appendChild(title);
    top.appendChild(badge);
    card.appendChild(top);

    var projectLine = document.createElement('p');
    projectLine.className = 'card-project';
    projectLine.textContent = task.project;
    card.appendChild(projectLine);

    if (task.dueDate) {
      var due = document.createElement('p');
      var overdue = isOverdue(task.dueDate, task.status);
      due.className = 'card-due' + (overdue ? ' overdue' : '');
      due.textContent = (overdue ? 'Overdue — was due ' : 'Due ') + formatDueDate(task.dueDate);
      card.appendChild(due);
    }

    if (task.tags.length) {
      var tagsWrap = document.createElement('div');
      tagsWrap.className = 'card-tags';
      task.tags.forEach(function (tag) {
        var chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.textContent = tag;
        tagsWrap.appendChild(chip);
      });
      card.appendChild(tagsWrap);
    }

    var controls = document.createElement('div');
    controls.className = 'card-controls';

    var statusSelectId = 'status-select-' + task.id;
    var statusLabel = document.createElement('label');
    statusLabel.className = 'visually-hidden';
    statusLabel.setAttribute('for', statusSelectId);
    statusLabel.textContent = 'Status for ' + task.title;
    var statusSelectEl = document.createElement('select');
    statusSelectEl.id = statusSelectId;
    statusSelectEl.setAttribute('data-action', 'status');
    statusSelectEl.setAttribute('aria-label', 'Status for ' + task.title);
    STATUSES.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s;
      opt.textContent = STATUS_LABELS[s];
      if (s === task.status) opt.selected = true;
      statusSelectEl.appendChild(opt);
    });

    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn';
    editBtn.setAttribute('data-action', 'edit');
    editBtn.setAttribute('aria-label', 'Edit ' + task.title);
    editBtn.textContent = 'Edit';

    var deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.setAttribute('data-action', 'delete');
    deleteBtn.setAttribute('aria-label', 'Delete ' + task.title);
    deleteBtn.textContent = 'Delete';

    controls.appendChild(statusLabel);
    controls.appendChild(statusSelectEl);
    controls.appendChild(editBtn);
    controls.appendChild(deleteBtn);
    card.appendChild(controls);

    return card;
  }

  function renderBoard(filtered) {
    dom.board.innerHTML = '';
    if (filtered.length === 0) {
      showEmptyState(state.tasks.length === 0 ? 'empty' : 'no-results');
      return;
    }
    hideEmptyState();
    var frag = document.createDocumentFragment();
    filtered.forEach(function (task) { frag.appendChild(buildCard(task)); });
    dom.board.appendChild(frag);
  }

  function renderBoardOnly() {
    var filtered = getFilteredTasks();
    renderBoard(filtered);
    renderCount(filtered.length, state.tasks.length);
  }

  function renderAll() {
    renderFilterOptions();
    renderBoardOnly();
  }

  function focusStatusSelect(taskId) {
    var cards = dom.board.querySelectorAll('.task-card');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute('data-task-id') === taskId) {
        var sel = cards[i].querySelector('[data-action="status"]');
        if (sel) sel.focus();
        return;
      }
    }
  }

  // ---------------------------------------------------------------------
  // Form errors
  // ---------------------------------------------------------------------

  function setFieldError(field, msg) {
    var errEl = document.getElementById('error-' + field);
    var inputMap = { title: dom.titleInput, project: dom.projectInput, due: dom.dueInput, tags: dom.tagsInput };
    if (errEl) errEl.textContent = msg;
    var input = inputMap[field];
    if (input) input.classList.add('invalid');
  }

  function clearFormErrors() {
    ['title', 'project', 'due', 'tags'].forEach(function (f) {
      var errEl = document.getElementById('error-' + f);
      if (errEl) errEl.textContent = '';
    });
    [dom.titleInput, dom.projectInput, dom.dueInput, dom.tagsInput].forEach(function (el) {
      el.classList.remove('invalid');
    });
  }

  // ---------------------------------------------------------------------
  // Modal lifecycle
  // ---------------------------------------------------------------------

  function getFocusableIn(container) {
    var nodes = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    return Array.prototype.filter.call(nodes, function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
  }

  function showModal() {
    lastFocusedElement = document.activeElement;
    dom.modalOverlay.hidden = false;
    try { dom.appRoot.setAttribute('inert', ''); } catch (e) { /* ignore */ }
    dom.titleInput.focus();
  }

  function closeModal() {
    dom.modalOverlay.hidden = true;
    dom.appRoot.removeAttribute('inert');
    if (lastFocusedElement && document.body.contains(lastFocusedElement)) {
      lastFocusedElement.focus();
    } else {
      dom.createTaskBtn.focus();
    }
  }

  function openCreateForm() {
    if (blockedByConflict()) return;
    editingId = null;
    dom.formTitle.textContent = 'New task';
    dom.taskForm.reset();
    dom.taskId.value = '';
    dom.statusSelect.value = 'todo';
    dom.prioritySelect.value = 'medium';
    clearFormErrors();
    showModal();
  }

  function openEditForm(task) {
    if (blockedByConflict()) return;
    editingId = task.id;
    dom.formTitle.textContent = 'Edit task';
    dom.taskId.value = task.id;
    dom.titleInput.value = task.title;
    dom.projectInput.value = task.project;
    dom.statusSelect.value = task.status;
    dom.prioritySelect.value = task.priority;
    dom.dueInput.value = task.dueDate;
    dom.tagsInput.value = task.tags.join(', ');
    clearFormErrors();
    showModal();
  }

  // ---------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------

  function handleFormSubmit(e) {
    e.preventDefault();
    if (blockedByConflict()) return;
    clearFormErrors();

    var hasError = false;
    var title = dom.titleInput.value.trim();
    if (!title) { setFieldError('title', 'Title is required.'); hasError = true; }
    else if (title.length > 120) { setFieldError('title', 'Title must be 120 characters or fewer.'); hasError = true; }

    var project = dom.projectInput.value.trim();
    if (!project) { setFieldError('project', 'Project is required.'); hasError = true; }
    else if (project.length > 80) { setFieldError('project', 'Project must be 80 characters or fewer.'); hasError = true; }

    var status = dom.statusSelect.value;
    var priority = dom.prioritySelect.value;

    var dueDate = dom.dueInput.value.trim();
    if (dueDate !== '' && !isValidDateString(dueDate)) {
      setFieldError('due', 'Enter a valid calendar date (YYYY-MM-DD).');
      hasError = true;
    }

    var tagsResult = normalizeTags(dom.tagsInput.value);
    if (tagsResult.error) { setFieldError('tags', tagsResult.error); hasError = true; }

    if (STATUSES.indexOf(status) === -1 || PRIORITIES.indexOf(priority) === -1) hasError = true;

    if (hasError) return;

    var isEdit = !!editingId;
    var id = isEdit ? editingId : genId();
    var record = { id: id, title: title, project: project, status: status, priority: priority, dueDate: dueDate, tags: tagsResult.tags };

    var nextTasks = isEdit
      ? state.tasks.map(function (t) { return t.id === id ? record : t; })
      : state.tasks.concat([record]);

    var ok = persist(nextTasks);
    if (!ok) {
      showToast('Could not save — storage error. Your entry is kept in this form; please try again.', 'error');
      return;
    }
    state.tasks = nextTasks;
    closeModal();
    renderAll();
    showToast(isEdit ? 'Task updated.' : 'Task created.', 'success');
  }

  function handleDelete(id) {
    if (blockedByConflict()) return;
    var idx = state.tasks.findIndex(function (t) { return t.id === id; });
    if (idx === -1) return;
    var removed = state.tasks[idx];
    var nextTasks = state.tasks.slice(0, idx).concat(state.tasks.slice(idx + 1));
    var ok = persist(nextTasks);
    if (!ok) {
      showToast('Could not delete — storage error. No changes were saved.', 'error');
      return;
    }
    state.tasks = nextTasks;
    renderAll();
    showToast('Deleted "' + removed.title + '".', 'info', {
      actionLabel: 'Undo',
      actionTestId: 'undo-delete',
      duration: 8000,
      onAction: function () { restoreTask(removed, idx); }
    });
  }

  function restoreTask(removed, idx) {
    if (blockedByConflict()) return;
    if (state.tasks.some(function (t) { return t.id === removed.id; })) {
      showToast('Cannot undo — a task with that id already exists.', 'error');
      return;
    }
    var nextTasks = state.tasks.slice();
    var insertAt = Math.min(idx, nextTasks.length);
    nextTasks.splice(insertAt, 0, removed);
    var ok = persist(nextTasks);
    if (!ok) {
      showToast('Could not restore — storage error. Try again.', 'error');
      return;
    }
    state.tasks = nextTasks;
    renderAll();
    showToast('Task restored.', 'success');
  }

  function handleStatusChange(id, newStatus, selEl) {
    if (blockedByConflict()) {
      var current = state.tasks.find(function (t) { return t.id === id; });
      if (current) selEl.value = current.status;
      return;
    }
    if (STATUSES.indexOf(newStatus) === -1) return;
    var idx = state.tasks.findIndex(function (t) { return t.id === id; });
    if (idx === -1) return;
    var prevStatus = state.tasks[idx].status;
    var nextTasks = state.tasks.slice();
    nextTasks[idx] = Object.assign({}, nextTasks[idx], { status: newStatus });
    var ok = persist(nextTasks);
    if (!ok) {
      selEl.value = prevStatus;
      showToast('Could not update status — storage error.', 'error');
      return;
    }
    state.tasks = nextTasks;
    renderAll();
    focusStatusSelect(id);
  }

  // ---------------------------------------------------------------------
  // Import / export
  // ---------------------------------------------------------------------

  function handleExport() {
    var doc = { schemaVersion: 1, tasks: state.tasks };
    downloadText('fieldnote-board-' + todayStamp() + '.json', JSON.stringify(doc, null, 2), 'application/json');
    showToast('Board exported.', 'success');
  }

  function handleImportFile(file) {
    if (blockedByConflict()) return;
    if (file.size > MAX_IMPORT_BYTES) {
      showToast('Import failed: file exceeds the 1 MiB size limit.', 'error');
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () {
      showToast('Import failed: could not read the file.', 'error');
    };
    reader.onload = function () {
      var text = String(reader.result);
      if (text.length > MAX_IMPORT_BYTES) {
        showToast('Import failed: file exceeds the 1 MiB size limit.', 'error');
        return;
      }
      var doc;
      try {
        doc = JSON.parse(text);
      } catch (err) {
        showToast('Import failed: the file is not valid JSON.', 'error');
        return;
      }
      var issue = validateBoardDocument(doc);
      if (issue) {
        showToast('Import failed: ' + issue, 'error');
        return;
      }
      var cleanTasks = doc.tasks.map(function (t) {
        return {
          id: t.id,
          title: t.title.trim(),
          project: t.project.trim(),
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          tags: t.tags.map(function (x) { return x.trim(); })
        };
      });
      var confirmMsg = 'Import ' + cleanTasks.length + ' task(s) and replace the current board of ' +
        state.tasks.length + ' task(s)? This cannot be undone.';
      if (!window.confirm(confirmMsg)) return;
      var ok = persist(cleanTasks);
      if (!ok) {
        showToast('Import validated but could not be saved (storage error). The board was not changed.', 'error');
        return;
      }
      state.tasks = cleanTasks;
      renderAll();
      showToast('Imported ' + cleanTasks.length + ' task(s).', 'success');
    };
    reader.readAsText(file);
  }

  // ---------------------------------------------------------------------
  // Storage recovery actions
  // ---------------------------------------------------------------------

  function handleDownloadCorrupt() {
    downloadText('fieldnote-board-corrupt-backup.txt', state.corruptRaw || '', 'text/plain');
  }

  function handleResetStorage() {
    var sure = window.confirm('This will permanently discard the unreadable data and start a fresh board. This cannot be undone. Continue?');
    if (!sure) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      showToast('Could not reset storage (storage error).', 'error');
      return;
    }
    var seeded = seedTasks();
    var ok = persist(seeded);
    state.tasks = seeded;
    state.mode = 'normal';
    state.corruptRaw = null;
    if (!ok) {
      showToast('Board reset, but could not save (storage error). Changes this session will not persist.', 'error');
    } else {
      showToast('Board reset to a fresh starter set.', 'success');
    }
    renderRecoveryPanel();
    renderAll();
  }

  // ---------------------------------------------------------------------
  // Event wiring
  // ---------------------------------------------------------------------

  function wireEvents() {
    dom.createTaskBtn.addEventListener('click', openCreateForm);
    dom.modalCloseBtn.addEventListener('click', closeModal);
    dom.cancelFormBtn.addEventListener('click', closeModal);
    dom.taskForm.addEventListener('submit', handleFormSubmit);

    document.addEventListener('keydown', function (e) {
      if (dom.modalOverlay.hidden) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.key === 'Tab') {
        var focusables = getFocusableIn(dom.modalOverlay);
        if (focusables.length === 0) return;
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    dom.board.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var card = btn.closest('.task-card');
      if (!card) return;
      var id = card.getAttribute('data-task-id');
      var action = btn.getAttribute('data-action');
      if (action === 'edit') {
        var task = state.tasks.find(function (t) { return t.id === id; });
        if (task) openEditForm(task);
      } else if (action === 'delete') {
        handleDelete(id);
      }
    });

    dom.board.addEventListener('change', function (e) {
      var sel = e.target.closest('[data-action="status"]');
      if (!sel) return;
      var card = sel.closest('.task-card');
      if (!card) return;
      handleStatusChange(card.getAttribute('data-task-id'), sel.value, sel);
    });

    dom.searchInput.addEventListener('input', renderBoardOnly);
    dom.filterStatus.addEventListener('change', renderBoardOnly);
    dom.filterProject.addEventListener('change', renderBoardOnly);
    dom.filterPriority.addEventListener('change', renderBoardOnly);

    dom.exportBtn.addEventListener('click', handleExport);
    dom.importBtn.addEventListener('click', function () { dom.importFile.click(); });
    dom.importFile.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      dom.importFile.value = '';
      if (!file) return;
      handleImportFile(file);
    });

    dom.downloadCorruptBtn.addEventListener('click', handleDownloadCorrupt);
    dom.resetStorageBtn.addEventListener('click', handleResetStorage);

    window.addEventListener('storage', function (e) {
      if (e.key !== STORAGE_KEY) return;
      if (e.storageArea && e.storageArea !== localStorage) return;
      state.conflictPending = true;
      renderConflictNotice();
    });
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------

  function init() {
    cacheDom();
    wireEvents();
    loadBoard();
    renderRecoveryPanel();
    renderStorageUnavailableNotice();
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
