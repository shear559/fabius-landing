(function () {
  'use strict';

  var STORAGE_KEY = 'fieldnote-board:v1';
  var MAX_IMPORT_BYTES = 1024 * 1024; // 1 MiB
  var STATUSES = ['todo', 'doing', 'done'];
  var PRIORITIES = ['low', 'medium', 'high'];
  var STATUS_LABELS = { todo: 'To do', doing: 'Doing', done: 'Done' };
  var PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };

  var state = {
    tasks: [],
    corruptRaw: null,
    lastDeleted: null,
    conflictPending: false,
    filters: { status: 'all', project: 'all', priority: 'all', search: '' },
    editingId: null,
    previousFocus: null
  };

  // ---------- DOM refs ----------
  var el = {
    exportBtn: document.getElementById('export-btn'),
    importFile: document.getElementById('import-file'),
    createTaskBtn: document.getElementById('create-task-btn'),
    emptyCreateBtn: document.getElementById('empty-create-btn'),
    corruptNotice: document.getElementById('corrupt-notice'),
    downloadCorruptBtn: document.getElementById('download-corrupt-btn'),
    resetCorruptBtn: document.getElementById('reset-corrupt-btn'),
    conflictNotice: document.getElementById('conflict-notice'),
    reloadConflictBtn: document.getElementById('reload-conflict-btn'),
    saveErrorNotice: document.getElementById('save-error-notice'),
    saveErrorDetail: document.getElementById('save-error-detail'),
    importNotice: document.getElementById('import-notice'),
    importNoticeMessage: document.getElementById('import-notice-message'),
    undoNotice: document.getElementById('undo-notice'),
    undoMessage: document.getElementById('undo-message'),
    undoDeleteBtn: document.getElementById('undo-delete-btn'),
    searchInput: document.getElementById('search-input'),
    filterStatus: document.getElementById('filter-status'),
    filterProject: document.getElementById('filter-project'),
    filterPriority: document.getElementById('filter-priority'),
    resultCount: document.getElementById('result-count'),
    boardMain: document.getElementById('board-main'),
    emptyState: document.getElementById('empty-state'),
    noResultsState: document.getElementById('no-results-state'),
    clearFiltersBtn: document.getElementById('clear-filters-btn'),
    taskList: document.getElementById('task-list'),
    toolbar: document.querySelector('.toolbar'),
    dialog: document.getElementById('task-dialog'),
    dialogTitle: document.getElementById('task-dialog-title'),
    form: document.getElementById('task-form'),
    cancelTaskBtn: document.getElementById('cancel-task-btn'),
    projectSuggestions: document.getElementById('project-suggestions'),
    fields: {
      title: document.getElementById('task-title'),
      project: document.getElementById('task-project'),
      status: document.getElementById('task-status'),
      priority: document.getElementById('task-priority'),
      dueDate: document.getElementById('task-dueDate'),
      tags: document.getElementById('task-tags')
    },
    errors: {
      title: document.getElementById('error-title'),
      project: document.getElementById('error-project'),
      dueDate: document.getElementById('error-dueDate'),
      tags: document.getElementById('error-tags')
    }
  };

  // ---------- validation helpers ----------
  function isTrimmedNonEmpty(s, max) {
    return typeof s === 'string' && s.trim().length > 0 && s.trim().length <= max;
  }

  function isValidId(s) {
    return typeof s === 'string' && s.length > 0 && s.length <= 80;
  }

  function isValidDateStr(s) {
    if (s === '') return true;
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var parts = s.split('-');
    var y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2]);
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  function isValidTagsArray(tags) {
    if (!Array.isArray(tags) || tags.length > 8) return false;
    for (var i = 0; i < tags.length; i++) {
      var t = tags[i];
      if (typeof t !== 'string') return false;
      if (t !== t.trim() || t.length === 0 || t.length > 24) return false;
    }
    return true;
  }

  function validateTaskObject(t, seenIds) {
    if (!t || typeof t !== 'object') return 'not an object';
    if (!isValidId(t.id)) return 'invalid id';
    if (seenIds && seenIds.has(t.id)) return 'duplicate id';
    if (!isTrimmedNonEmpty(t.title, 120)) return 'invalid title';
    if (!isTrimmedNonEmpty(t.project, 80)) return 'invalid project';
    if (STATUSES.indexOf(t.status) === -1) return 'invalid status';
    if (PRIORITIES.indexOf(t.priority) === -1) return 'invalid priority';
    if (typeof t.dueDate !== 'string' || !isValidDateStr(t.dueDate)) return 'invalid dueDate';
    if (!isValidTagsArray(t.tags)) return 'invalid tags';
    return null;
  }

  function generateId() {
    var existing = {};
    state.tasks.forEach(function (t) { existing[t.id] = true; });
    var id;
    do {
      var rand = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
      id = ('t-' + rand).slice(0, 80);
    } while (existing[id]);
    return id;
  }

  function parseTagsInput(raw) {
    if (!raw) return [];
    var parts = raw.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    var seen = {};
    var out = [];
    parts.forEach(function (p) {
      var key = p.toLowerCase();
      if (!seen[key]) { seen[key] = true; out.push(p); }
    });
    return out;
  }

  // ---------- seed data ----------
  function seedTasks() {
    var today = new Date();
    function iso(daysFromNow) {
      var d = new Date(today.getTime() + daysFromNow * 86400000);
      return d.toISOString().slice(0, 10);
    }
    return [
      { id: generateSeedId('a'), title: 'Draft trailhead signage copy', project: 'Ridgeline Trail Refresh', status: 'todo', priority: 'high', dueDate: iso(3), tags: ['copy', 'signage'] },
      { id: generateSeedId('b'), title: 'Survey creek crossing damage', project: 'Ridgeline Trail Refresh', status: 'doing', priority: 'high', dueDate: iso(1), tags: ['field', 'survey'] },
      { id: generateSeedId('c'), title: 'Order replacement waymarkers', project: 'Ridgeline Trail Refresh', status: 'todo', priority: 'medium', dueDate: iso(10), tags: ['procurement'] },
      { id: generateSeedId('d'), title: 'Compile volunteer hours for Q3', project: 'Community Garden Rebuild', status: 'done', priority: 'low', dueDate: iso(-2), tags: ['admin', 'reporting'] },
      { id: generateSeedId('e'), title: 'Repair raised bed irrigation', project: 'Community Garden Rebuild', status: 'doing', priority: 'medium', dueDate: iso(5), tags: ['field'] },
      { id: generateSeedId('f'), title: 'Plan spring planting schedule', project: 'Community Garden Rebuild', status: 'todo', priority: 'low', dueDate: '', tags: ['planning'] },
      { id: generateSeedId('g'), title: 'Publish weekly fieldnote digest', project: 'Community Garden Rebuild', status: 'done', priority: 'medium', dueDate: iso(-7), tags: ['comms'] }
    ];
  }

  function generateSeedId(suffix) {
    return 't-seed-' + suffix + '-' + Math.random().toString(36).slice(2, 8);
  }

  // ---------- storage ----------
  function tryParseBoard(raw) {
    try {
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || data.schemaVersion !== 1 || !Array.isArray(data.tasks)) {
        return { ok: false };
      }
      var seen = new Set();
      for (var i = 0; i < data.tasks.length; i++) {
        var err = validateTaskObject(data.tasks[i], seen);
        if (err) return { ok: false };
        seen.add(data.tasks[i].id);
      }
      return { ok: true, tasks: data.tasks };
    } catch (e) {
      return { ok: false };
    }
  }

  function saveBoard(tasks) {
    try {
      var payload = JSON.stringify({ schemaVersion: 1, tasks: tasks });
      localStorage.setItem(STORAGE_KEY, payload);
      state.tasks = tasks;
      hideSaveError();
      return true;
    } catch (e) {
      showSaveError(e && e.message ? e.message : 'Storage write failed.');
      return false;
    }
  }

  function showSaveError(detail) {
    el.saveErrorDetail.textContent = detail;
    el.saveErrorNotice.hidden = false;
  }
  function hideSaveError() {
    el.saveErrorNotice.hidden = true;
  }

  // ---------- init ----------
  function init() {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }

    if (raw === null) {
      var seeded = seedTasks();
      saveBoard(seeded);
    } else {
      var result = tryParseBoard(raw);
      if (result.ok) {
        state.tasks = result.tasks;
      } else {
        state.corruptRaw = raw;
        showCorruptNotice();
      }
    }

    wireEvents();
    render();
  }

  function showCorruptNotice() {
    el.corruptNotice.hidden = false;
    setBoardDisabled(true);
  }

  function setBoardDisabled(disabled) {
    el.exportBtn.disabled = disabled;
    el.importFile.disabled = disabled;
    el.createTaskBtn.disabled = disabled;
    el.searchInput.disabled = disabled;
    el.filterStatus.disabled = disabled;
    el.filterProject.disabled = disabled;
    el.filterPriority.disabled = disabled;
    el.toolbar.hidden = disabled;
    el.boardMain.hidden = disabled;
    el.resultCount.hidden = disabled;
  }

  // ---------- conflict guard ----------
  function guardConflict() {
    if (state.conflictPending) {
      el.conflictNotice.scrollIntoView({ block: 'nearest' });
      el.conflictNotice.focus && el.conflictNotice.focus();
      return false;
    }
    return true;
  }

  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY && !state.corruptRaw) {
      state.conflictPending = true;
      el.conflictNotice.hidden = false;
    }
  });

  // ---------- rendering ----------
  function getDistinctProjects() {
    var set = {};
    state.tasks.forEach(function (t) { set[t.project] = true; });
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b); });
  }

  function syncProjectFilterOptions() {
    var projects = getDistinctProjects();
    var current = el.filterProject.value || 'all';
    el.filterProject.textContent = '';
    var allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All projects';
    el.filterProject.appendChild(allOpt);
    projects.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      el.filterProject.appendChild(opt);
    });
    el.filterProject.value = projects.indexOf(current) !== -1 || current === 'all' ? current : 'all';
    state.filters.project = el.filterProject.value;

    el.projectSuggestions.textContent = '';
    projects.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p;
      el.projectSuggestions.appendChild(opt);
    });
  }

  function getFilteredTasks() {
    var f = state.filters;
    var q = f.search.trim().toLowerCase();
    return state.tasks.filter(function (t) {
      if (f.status !== 'all' && t.status !== f.status) return false;
      if (f.project !== 'all' && t.project !== f.project) return false;
      if (f.priority !== 'all' && t.priority !== f.priority) return false;
      if (q) {
        var hay = (t.title + ' ' + t.project + ' ' + t.tags.join(' ')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function formatDueDate(dueDate) {
    if (!dueDate) return 'No due date';
    return 'Due ' + dueDate;
  }

  function createTaskCard(task) {
    var li = document.createElement('li');
    li.className = 'task-card';
    li.setAttribute('data-testid', 'task-card');
    li.setAttribute('data-task-id', task.id);

    var top = document.createElement('div');
    top.className = 'task-card__top';

    var title = document.createElement('h3');
    title.className = 'task-card__title';
    title.textContent = task.title;
    top.appendChild(title);

    var priority = document.createElement('span');
    priority.className = 'task-card__priority';
    priority.setAttribute('data-priority', task.priority);
    priority.textContent = PRIORITY_LABELS[task.priority];
    top.appendChild(priority);

    li.appendChild(top);

    var meta = document.createElement('p');
    meta.className = 'task-card__meta';
    var projectSpan = document.createElement('span');
    projectSpan.textContent = task.project;
    var dueSpan = document.createElement('span');
    dueSpan.textContent = formatDueDate(task.dueDate);
    meta.appendChild(projectSpan);
    meta.appendChild(dueSpan);
    li.appendChild(meta);

    if (task.tags && task.tags.length) {
      var tagsList = document.createElement('ul');
      tagsList.className = 'task-card__tags';
      task.tags.forEach(function (tag) {
        var tli = document.createElement('li');
        tli.textContent = tag;
        tagsList.appendChild(tli);
      });
      li.appendChild(tagsList);
    }

    var controls = document.createElement('div');
    controls.className = 'task-card__controls';

    var statusLabel = document.createElement('label');
    var statusLabelText = document.createElement('span');
    statusLabelText.className = 'visually-hidden';
    statusLabelText.textContent = 'Status for ' + task.title;
    statusLabel.appendChild(statusLabelText);
    var statusSelect = document.createElement('select');
    statusSelect.setAttribute('data-action', 'status');
    statusSelect.setAttribute('aria-label', 'Status for ' + task.title);
    STATUSES.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s;
      opt.textContent = STATUS_LABELS[s];
      if (s === task.status) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    statusLabel.appendChild(statusSelect);
    controls.appendChild(statusLabel);

    var buttons = document.createElement('div');
    buttons.className = 'task-card__buttons';

    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn--ghost btn--small';
    editBtn.setAttribute('data-action', 'edit');
    editBtn.setAttribute('aria-label', 'Edit ' + task.title);
    editBtn.textContent = 'Edit';
    buttons.appendChild(editBtn);

    var deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn--danger btn--small';
    deleteBtn.setAttribute('data-action', 'delete');
    deleteBtn.setAttribute('aria-label', 'Delete ' + task.title);
    deleteBtn.textContent = 'Delete';
    buttons.appendChild(deleteBtn);

    controls.appendChild(buttons);
    li.appendChild(controls);

    return li;
  }

  function render() {
    if (state.corruptRaw) return;

    syncProjectFilterOptions();
    var filtered = getFilteredTasks();

    el.resultCount.textContent = filtered.length + ' of ' + state.tasks.length + ' tasks shown';

    el.taskList.textContent = '';
    if (state.tasks.length === 0) {
      el.emptyState.hidden = false;
      el.noResultsState.hidden = true;
      el.taskList.hidden = true;
    } else if (filtered.length === 0) {
      el.emptyState.hidden = true;
      el.noResultsState.hidden = false;
      el.taskList.hidden = true;
    } else {
      el.emptyState.hidden = true;
      el.noResultsState.hidden = true;
      el.taskList.hidden = false;
      filtered.forEach(function (t) {
        el.taskList.appendChild(createTaskCard(t));
      });
    }
  }

  // ---------- dialog ----------
  function clearFormErrors() {
    Object.keys(el.errors).forEach(function (k) {
      el.errors[k].hidden = true;
      el.errors[k].textContent = '';
    });
  }

  function openDialogForCreate() {
    state.editingId = null;
    state.previousFocus = document.activeElement;
    el.dialogTitle.textContent = 'New task';
    el.form.reset();
    el.fields.status.value = 'todo';
    el.fields.priority.value = 'medium';
    clearFormErrors();
    el.dialog.showModal();
    el.fields.title.focus();
  }

  function openDialogForEdit(task) {
    state.editingId = task.id;
    state.previousFocus = document.activeElement;
    el.dialogTitle.textContent = 'Edit task';
    el.fields.title.value = task.title;
    el.fields.project.value = task.project;
    el.fields.status.value = task.status;
    el.fields.priority.value = task.priority;
    el.fields.dueDate.value = task.dueDate;
    el.fields.tags.value = task.tags.join(', ');
    clearFormErrors();
    el.dialog.showModal();
    el.fields.title.focus();
  }

  function closeDialog() {
    if (el.dialog.open) el.dialog.close();
  }

  el.dialog.addEventListener('close', function () {
    clearFormErrors();
    state.editingId = null;
    if (state.previousFocus && typeof state.previousFocus.focus === 'function') {
      state.previousFocus.focus();
    }
  });

  function showFieldError(name, message) {
    var target = el.errors[name];
    if (!target) return;
    target.textContent = message;
    target.hidden = false;
  }

  function handleFormSubmit(evt) {
    evt.preventDefault();
    if (!guardConflict()) return;

    clearFormErrors();
    var titleRaw = el.fields.title.value;
    var projectRaw = el.fields.project.value;
    var status = el.fields.status.value;
    var priority = el.fields.priority.value;
    var dueDate = el.fields.dueDate.value;
    var tagsRaw = el.fields.tags.value;

    var tags = parseTagsInput(tagsRaw);
    var hasError = false;

    if (!isTrimmedNonEmpty(titleRaw, 120)) {
      showFieldError('title', titleRaw.trim().length === 0 ? 'Title is required.' : 'Title must be 120 characters or fewer.');
      hasError = true;
    }
    if (!isTrimmedNonEmpty(projectRaw, 80)) {
      showFieldError('project', projectRaw.trim().length === 0 ? 'Project is required.' : 'Project must be 80 characters or fewer.');
      hasError = true;
    }
    if (!isValidDateStr(dueDate)) {
      showFieldError('dueDate', 'Enter a real calendar date (YYYY-MM-DD) or leave it blank.');
      hasError = true;
    }
    if (tags.length > 8) {
      showFieldError('tags', 'Use at most 8 tags.');
      hasError = true;
    } else {
      var overlong = tags.some(function (t) { return t.length > 24; });
      if (overlong) {
        showFieldError('tags', 'Each tag must be 24 characters or fewer.');
        hasError = true;
      }
    }

    if (hasError) {
      var firstInvalid = ['title', 'project', 'dueDate', 'tags'].find(function (k) { return !el.errors[k].hidden; });
      if (firstInvalid) el.fields[firstInvalid].focus();
      return;
    }

    var nextTasks;
    if (state.editingId) {
      nextTasks = state.tasks.map(function (t) {
        if (t.id !== state.editingId) return t;
        return {
          id: t.id,
          title: titleRaw.trim(),
          project: projectRaw.trim(),
          status: status,
          priority: priority,
          dueDate: dueDate,
          tags: tags
        };
      });
    } else {
      var newTask = {
        id: generateId(),
        title: titleRaw.trim(),
        project: projectRaw.trim(),
        status: status,
        priority: priority,
        dueDate: dueDate,
        tags: tags
      };
      nextTasks = state.tasks.concat([newTask]);
    }

    var ok = saveBoard(nextTasks);
    if (ok) {
      closeDialog();
      render();
    }
  }

  // ---------- card actions ----------
  function handleListClick(evt) {
    var actionEl = evt.target.closest('[data-action]');
    if (!actionEl) return;
    var card = evt.target.closest('.task-card');
    if (!card) return;
    var taskId = card.getAttribute('data-task-id');
    var action = actionEl.getAttribute('data-action');

    if (action === 'edit') {
      var task = state.tasks.find(function (t) { return t.id === taskId; });
      if (task) openDialogForEdit(task);
    } else if (action === 'delete') {
      if (!guardConflict()) return;
      deleteTask(taskId);
    }
  }

  function handleListChange(evt) {
    var actionEl = evt.target.closest('[data-action="status"]');
    if (!actionEl) return;
    if (!guardConflict()) { render(); return; }
    var card = evt.target.closest('.task-card');
    var taskId = card.getAttribute('data-task-id');
    var newStatus = actionEl.value;
    var nextTasks = state.tasks.map(function (t) {
      return t.id === taskId ? Object.assign({}, t, { status: newStatus }) : t;
    });
    saveBoard(nextTasks);
    render();
  }

  function deleteTask(taskId) {
    var index = state.tasks.findIndex(function (t) { return t.id === taskId; });
    if (index === -1) return;
    var task = state.tasks[index];
    var nextTasks = state.tasks.slice(0, index).concat(state.tasks.slice(index + 1));
    var ok = saveBoard(nextTasks);
    if (!ok) return;
    state.lastDeleted = { task: task, index: index };
    el.undoMessage.textContent = 'Deleted "' + task.title + '".';
    el.undoNotice.hidden = false;
    render();
  }

  function undoDelete() {
    if (!state.lastDeleted) return;
    var entry = state.lastDeleted;
    var idx = Math.min(entry.index, state.tasks.length);
    var nextTasks = state.tasks.slice(0, idx).concat([entry.task], state.tasks.slice(idx));
    var ok = saveBoard(nextTasks);
    if (ok) {
      state.lastDeleted = null;
      el.undoNotice.hidden = true;
      render();
    }
  }

  // ---------- corrupt recovery ----------
  function downloadCorruptBytes() {
    if (state.corruptRaw === null) return;
    var blob = new Blob([state.corruptRaw], { type: 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'fieldnote-board-corrupt-backup.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function resetCorruptBoard() {
    var confirmed = window.confirm('Reset the board? The unreadable data will remain replaced by a fresh sample board. Download a backup first if you need it.');
    if (!confirmed) return;
    var seeded = seedTasks();
    var ok = saveBoard(seeded);
    if (ok) {
      state.corruptRaw = null;
      el.corruptNotice.hidden = true;
      setBoardDisabled(false);
      render();
    }
  }

  // ---------- conflict reload ----------
  function reloadFromStorage() {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
    state.conflictPending = false;
    el.conflictNotice.hidden = true;

    if (raw === null) {
      state.tasks = [];
    } else {
      var result = tryParseBoard(raw);
      if (result.ok) {
        state.corruptRaw = null;
        setBoardDisabled(false);
        state.tasks = result.tasks;
      } else {
        state.corruptRaw = raw;
        showCorruptNotice();
        return;
      }
    }
    state.lastDeleted = null;
    el.undoNotice.hidden = true;
    render();
  }

  // ---------- export / import ----------
  function exportBoard() {
    var payload = JSON.stringify({ schemaVersion: 1, tasks: state.tasks }, null, 2);
    var blob = new Blob([payload], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'fieldnote-board-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function showImportError(message) {
    el.importNoticeMessage.textContent = message;
    el.importNotice.hidden = false;
  }
  function hideImportError() {
    el.importNotice.hidden = true;
  }

  function validateImportedDocument(text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { ok: false, error: 'That file is not valid JSON.' };
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, error: 'That file is not a valid Fieldnote Board document.' };
    }
    if (data.schemaVersion !== 1) {
      return { ok: false, error: 'Unsupported schema version. Only schemaVersion 1 is accepted.' };
    }
    if (!Array.isArray(data.tasks)) {
      return { ok: false, error: 'The document is missing a valid task list.' };
    }
    var seen = new Set();
    for (var i = 0; i < data.tasks.length; i++) {
      var err = validateTaskObject(data.tasks[i], seen);
      if (err) {
        return { ok: false, error: 'Task ' + (i + 1) + ' is invalid (' + err + '). No changes were made.' };
      }
      seen.add(data.tasks[i].id);
    }
    return { ok: true, tasks: data.tasks };
  }

  function handleImportFile(evt) {
    var file = evt.target.files && evt.target.files[0];
    el.importFile.value = '';
    if (!file) return;
    hideImportError();

    if (!guardConflict()) return;

    if (file.size > MAX_IMPORT_BYTES) {
      showImportError('That file is larger than 1 MiB and was not imported.');
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result);
      if (new Blob([text]).size > MAX_IMPORT_BYTES) {
        showImportError('That file is larger than 1 MiB and was not imported.');
        return;
      }
      var validation = validateImportedDocument(text);
      if (!validation.ok) {
        showImportError(validation.error);
        return;
      }
      var confirmed = window.confirm('Replace the current board with ' + validation.tasks.length + ' task(s) from "' + file.name + '"? This cannot be undone.');
      if (!confirmed) return;

      var ok = saveBoard(validation.tasks);
      if (ok) {
        hideImportError();
        state.lastDeleted = null;
        el.undoNotice.hidden = true;
        render();
      }
    };
    reader.onerror = function () {
      showImportError('The file could not be read.');
    };
    reader.readAsText(file);
  }

  // ---------- filters/search ----------
  function clearFiltersAndSearch() {
    state.filters = { status: 'all', project: 'all', priority: 'all', search: '' };
    el.searchInput.value = '';
    el.filterStatus.value = 'all';
    el.filterProject.value = 'all';
    el.filterPriority.value = 'all';
    render();
  }

  // ---------- wiring ----------
  function wireEvents() {
    el.createTaskBtn.addEventListener('click', openDialogForCreate);
    el.emptyCreateBtn.addEventListener('click', openDialogForCreate);
    el.cancelTaskBtn.addEventListener('click', function () { closeDialog(); });
    el.form.addEventListener('submit', handleFormSubmit);

    el.taskList.addEventListener('click', handleListClick);
    el.taskList.addEventListener('change', handleListChange);

    el.undoDeleteBtn.addEventListener('click', undoDelete);
    el.downloadCorruptBtn.addEventListener('click', downloadCorruptBytes);
    el.resetCorruptBtn.addEventListener('click', resetCorruptBoard);
    el.reloadConflictBtn.addEventListener('click', reloadFromStorage);

    el.exportBtn.addEventListener('click', exportBoard);
    el.importFile.addEventListener('change', handleImportFile);

    el.searchInput.addEventListener('input', function () {
      state.filters.search = el.searchInput.value;
      render();
    });
    el.filterStatus.addEventListener('change', function () {
      state.filters.status = el.filterStatus.value;
      render();
    });
    el.filterProject.addEventListener('change', function () {
      state.filters.project = el.filterProject.value;
      render();
    });
    el.filterPriority.addEventListener('change', function () {
      state.filters.priority = el.filterPriority.value;
      render();
    });
    el.clearFiltersBtn.addEventListener('click', clearFiltersAndSearch);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
