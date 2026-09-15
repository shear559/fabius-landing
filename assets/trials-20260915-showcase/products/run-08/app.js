(function () {
  'use strict';

  var STORAGE_KEY = 'fieldnote-board:v1';
  var STATUSES = ['todo', 'doing', 'done'];
  var PRIORITIES = ['low', 'medium', 'high'];
  var STATUS_LABEL = { todo: 'To do', doing: 'Doing', done: 'Done' };
  var PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };
  var PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
  var MAX_IMPORT_BYTES = 1024 * 1024;
  var UNDO_WINDOW_MS = 8000;

  var state = {
    tasks: [],
    view: 'board',
    search: '',
    filterStatus: 'all',
    filterProject: 'all',
    filterPriority: 'all',
    editingId: null,
    lastFocused: null,
    pendingDelete: null,
    conflict: false,
    corrupt: false,
    corruptRaw: null,
    saveError: null,
    storageUnavailable: false,
    lastPersisted: null
  };

  var els = {};
  var undoTimer = null;

  // ---------------- helpers ----------------

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function isValidDateStr(s) {
    if (s === '') return true;
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var parts = s.split('-').map(Number);
    var y = parts[0], m = parts[1], d = parts[2];
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  function formatDate(s) {
    var parts = s.split('-').map(Number);
    var dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  function genId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 't-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function parseTagsInput(raw) {
    var parts = raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.length > 24) return { error: 'Tag "' + p + '" is too long (max 24 characters).' };
      var key = p.toLowerCase();
      if (!seen[key]) { seen[key] = true; out.push(p); }
    }
    if (out.length > 8) return { error: 'Too many tags (max 8 after removing duplicates).' };
    return { tags: out };
  }

  function validateTaskFields(f) {
    var errors = {};
    var title = (f.title || '').trim();
    var project = (f.project || '').trim();
    if (!title) errors.title = 'Title is required.';
    else if (title.length > 120) errors.title = 'Title must be 120 characters or fewer.';
    if (!project) errors.project = 'Project is required.';
    else if (project.length > 80) errors.project = 'Project must be 80 characters or fewer.';
    if (STATUSES.indexOf(f.status) === -1) errors.status = 'Choose a valid status.';
    if (PRIORITIES.indexOf(f.priority) === -1) errors.priority = 'Choose a valid priority.';
    if (!isValidDateStr(f.dueDate)) errors.dueDate = 'Enter a valid date (YYYY-MM-DD) or leave blank.';
    return errors;
  }

  function isValidStoredTask(t) {
    if (!t || typeof t !== 'object') return false;
    if (typeof t.id !== 'string' || !t.id.trim() || t.id.length > 80) return false;
    if (typeof t.title !== 'string' || !t.title.trim() || t.title.length > 120) return false;
    if (typeof t.project !== 'string' || !t.project.trim() || t.project.length > 80) return false;
    if (STATUSES.indexOf(t.status) === -1) return false;
    if (PRIORITIES.indexOf(t.priority) === -1) return false;
    if (typeof t.dueDate !== 'string' || !isValidDateStr(t.dueDate)) return false;
    if (!Array.isArray(t.tags) || t.tags.length > 8) return false;
    for (var i = 0; i < t.tags.length; i++) {
      var tag = t.tags[i];
      if (typeof tag !== 'string' || !tag.trim() || tag.length > 24) return false;
    }
    return true;
  }

  function validateBoardShape(parsed) {
    if (!parsed || typeof parsed !== 'object') return false;
    if (parsed.schemaVersion !== 1) return false;
    if (!Array.isArray(parsed.tasks)) return false;
    var ids = Object.create(null);
    for (var i = 0; i < parsed.tasks.length; i++) {
      var t = parsed.tasks[i];
      if (!isValidStoredTask(t)) return false;
      if (ids[t.id]) return false;
      ids[t.id] = true;
    }
    return true;
  }

  function seedTasks() {
    return [
      { id: 'seed-reef-1', title: 'Digitize field notebooks from March transects', project: 'Reef Resilience Study', status: 'done', priority: 'medium', dueDate: '2026-08-20', tags: ['fieldwork', 'data-entry'] },
      { id: 'seed-reef-2', title: 'Cross-check coral cover counts against photo quadrats', project: 'Reef Resilience Study', status: 'doing', priority: 'high', dueDate: '2026-09-18', tags: ['qa', 'data'] },
      { id: 'seed-reef-3', title: 'Reconcile species ID discrepancies with lab reference set', project: 'Reef Resilience Study', status: 'doing', priority: 'high', dueDate: '', tags: ['taxonomy'] },
      { id: 'seed-reef-4', title: 'Archive raw sensor logs to lab drive', project: 'Reef Resilience Study', status: 'done', priority: 'low', dueDate: '2026-08-05', tags: ['archive'] },
      { id: 'seed-pub-1', title: 'Draft methods section for water temperature logging', project: 'Manuscript Production', status: 'todo', priority: 'medium', dueDate: '2026-09-25', tags: ['writing'] },
      { id: 'seed-pub-2', title: 'Request co-author review of results figures', project: 'Manuscript Production', status: 'todo', priority: 'high', dueDate: '2026-09-22', tags: ['review', 'figures'] },
      { id: 'seed-pub-3', title: 'Format citations to journal style guide', project: 'Manuscript Production', status: 'todo', priority: 'low', dueDate: '2026-10-01', tags: ['formatting', 'references'] }
    ];
  }

  function serialize(tasks) {
    return JSON.stringify({ schemaVersion: 1, tasks: tasks });
  }

  function persist(tasks) {
    try {
      var str = serialize(tasks);
      localStorage.setItem(STORAGE_KEY, str);
      state.lastPersisted = str;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  function describeStorageError(e) {
    if (e && e.name === 'QuotaExceededError') return 'The browser storage quota is full.';
    return 'The browser blocked saving to local storage.';
  }

  // ---------------- startup load ----------------

  function loadInitial() {
    var raw = null;
    var getFailed = false;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { getFailed = true; }

    if (getFailed) {
      state.storageUnavailable = true;
      state.tasks = seedTasks();
      return;
    }
    if (raw === null) {
      state.tasks = seedTasks();
      var res = persist(state.tasks);
      if (!res.ok) state.storageUnavailable = true;
      return;
    }
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = undefined; }
    if (parsed !== undefined && validateBoardShape(parsed)) {
      state.tasks = parsed.tasks;
      state.lastPersisted = raw;
    } else {
      state.corrupt = true;
      state.corruptRaw = raw;
      state.tasks = [];
    }
  }

  // ---------------- derived data ----------------

  function getFilteredTasks() {
    var q = state.search.trim().toLowerCase();
    return state.tasks.filter(function (t) {
      if (state.filterStatus !== 'all' && t.status !== state.filterStatus) return false;
      if (state.filterProject !== 'all' && t.project !== state.filterProject) return false;
      if (state.filterPriority !== 'all' && t.priority !== state.filterPriority) return false;
      if (q) {
        var hay = (t.title + ' ' + t.project + ' ' + t.tags.join(' ')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function sortTasks(list) {
    return list.slice().sort(function (a, b) {
      if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      var ad = a.dueDate || '9999-99-99';
      var bd = b.dueDate || '9999-99-99';
      if (ad !== bd) return ad < bd ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
  }

  // ---------------- rendering ----------------

  function updateProjectOptions() {
    var projects = Array.from(new Set(state.tasks.map(function (t) { return t.project; }))).sort(function (a, b) { return a.localeCompare(b); });
    var current = state.filterProject;
    els.filterProject.innerHTML = '<option value="all">All projects</option>' +
      projects.map(function (p) { return '<option value="' + escapeHtml(p) + '">' + escapeHtml(p) + '</option>'; }).join('');
    if (current === 'all' || projects.indexOf(current) !== -1) {
      els.filterProject.value = current;
    } else {
      els.filterProject.value = 'all';
      state.filterProject = 'all';
    }
  }

  function renderCardHTML(t) {
    var tagsHtml = t.tags.map(function (tag) {
      return '<span class="task-tag"><svg class="icon" aria-hidden="true"><use href="#icon-tag"/></svg>' + escapeHtml(tag) + '</span>';
    }).join('');
    var dueHtml = t.dueDate
      ? '<span class="meta-item"><svg class="icon" aria-hidden="true"><use href="#icon-calendar"/></svg>' + escapeHtml(formatDate(t.dueDate)) + '</span>'
      : '<span class="meta-item">No due date</span>';
    var safeId = escapeHtml(t.id);
    var safeTitle = escapeHtml(t.title);
    var statusOptions = STATUSES.map(function (s) {
      return '<option value="' + s + '"' + (s === t.status ? ' selected' : '') + '>' + STATUS_LABEL[s] + '</option>';
    }).join('');
    return (
      '<article class="task-card" data-testid="task-card" data-task-id="' + safeId + '" data-priority="' + t.priority + '">' +
        '<div class="task-card-top">' +
          '<div>' +
            '<h3 class="task-title">' + safeTitle + '</h3>' +
            '<p class="task-project">' + escapeHtml(t.project) + '</p>' +
          '</div>' +
          '<div class="task-card-actions">' +
            '<button type="button" class="icon-btn" data-action="edit" aria-label="Edit ' + safeTitle + '">' +
              '<svg class="icon" aria-hidden="true"><use href="#icon-edit"/></svg></button>' +
            '<button type="button" class="icon-btn" data-action="delete" aria-label="Delete ' + safeTitle + '">' +
              '<svg class="icon" aria-hidden="true"><use href="#icon-trash"/></svg></button>' +
          '</div>' +
        '</div>' +
        '<div class="task-meta">' +
          '<span class="priority-pill" data-priority="' + t.priority + '">' + PRIORITY_LABEL[t.priority] + '</span>' +
          dueHtml +
        '</div>' +
        (t.tags.length ? '<div class="task-tags">' + tagsHtml + '</div>' : '') +
        '<div class="task-status-row">' +
          '<label for="status-' + safeId + '">Status</label>' +
          '<select id="status-' + safeId + '" data-action="status" aria-label="Change status for ' + safeTitle + '">' + statusOptions + '</select>' +
        '</div>' +
      '</article>'
    );
  }

  function renderBoard(filtered) {
    els.boardView.innerHTML = STATUSES.map(function (s) {
      var list = sortTasks(filtered.filter(function (t) { return t.status === s; }));
      return (
        '<section class="board-column" aria-label="' + STATUS_LABEL[s] + ' tasks">' +
          '<div class="board-column-head">' +
            '<span class="board-column-title">' + STATUS_LABEL[s] + '</span>' +
            '<span class="board-column-count">' + list.length + '</span>' +
          '</div>' +
          '<div class="board-column-body">' +
            (list.length ? list.map(renderCardHTML).join('') : '<p class="column-empty">No matching tasks</p>') +
          '</div>' +
        '</section>'
      );
    }).join('');
  }

  function renderList(filtered) {
    els.listView.innerHTML = sortTasks(filtered).map(renderCardHTML).join('');
  }

  function renderNotices() {
    var parts = [];
    if (state.corrupt) {
      parts.push(
        '<div class="notice notice-recovery" role="alert">' +
          '<svg class="icon" aria-hidden="true"><use href="#icon-warning"/></svg>' +
          '<div class="notice-body">' +
            '<p class="notice-title">Saved board data could not be read</p>' +
            '<p>The board stored in this browser is corrupted or in an unrecognized format. Nothing has been overwritten or seeded. You can download the original bytes for inspection, or reset to start a fresh board.</p>' +
            '<div class="notice-actions">' +
              '<button type="button" class="btn btn-ghost btn-small" id="download-corrupt-btn"><svg class="icon" aria-hidden="true"><use href="#icon-download"/></svg><span>Download original bytes</span></button>' +
              '<button type="button" class="btn btn-primary btn-small" id="reset-board-btn">Reset board</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }
    if (state.conflict) {
      parts.push(
        '<div class="notice notice-conflict" role="alert">' +
          '<svg class="icon" aria-hidden="true"><use href="#icon-sync"/></svg>' +
          '<div class="notice-body">' +
            '<p class="notice-title">Board changed in another tab</p>' +
            '<p>Another tab saved changes to this board. To avoid overwriting them, editing, deleting and status changes are paused here until you reload.</p>' +
            '<div class="notice-actions"><button type="button" class="btn btn-primary btn-small" id="reload-board-btn">Reload board</button></div>' +
          '</div>' +
        '</div>'
      );
    }
    if (state.saveError) {
      parts.push(
        '<div class="notice notice-error" role="alert">' +
          '<svg class="icon" aria-hidden="true"><use href="#icon-warning"/></svg>' +
          '<div class="notice-body"><p class="notice-title">Change not saved</p><p>' + escapeHtml(state.saveError) + ' Your last change was not persisted to this browser.</p></div>' +
        '</div>'
      );
    }
    if (state.storageUnavailable) {
      parts.push(
        '<div class="notice notice-error" role="alert">' +
          '<svg class="icon" aria-hidden="true"><use href="#icon-warning"/></svg>' +
          '<div class="notice-body"><p class="notice-title">Local storage unavailable</p><p>This browser is blocking local storage, so changes will only last for this page view.</p></div>' +
        '</div>'
      );
    }
    els.notices.innerHTML = parts.join('');
    var dl = document.getElementById('download-corrupt-btn'); if (dl) dl.addEventListener('click', downloadCorruptBytes);
    var rb = document.getElementById('reset-board-btn'); if (rb) rb.addEventListener('click', onResetBoard);
    var rl = document.getElementById('reload-board-btn'); if (rl) rl.addEventListener('click', onReloadBoard);
  }

  function render() {
    renderNotices();

    var corrupt = state.corrupt;
    document.querySelector('.toolbar').hidden = corrupt;
    els.taskCount.hidden = corrupt;
    els.boardRegion.hidden = corrupt;
    if (corrupt) return;

    updateProjectOptions();
    var filtered = getFilteredTasks();
    var hasAnyTasks = state.tasks.length > 0;

    els.emptyState.hidden = hasAnyTasks;
    els.noResultsState.hidden = !(hasAnyTasks && filtered.length === 0);

    var showLists = hasAnyTasks && filtered.length > 0;
    els.boardView.hidden = !(showLists && state.view === 'board');
    els.listView.hidden = !(showLists && state.view === 'list');
    if (showLists) {
      if (state.view === 'board') renderBoard(filtered); else renderList(filtered);
    } else {
      els.boardView.innerHTML = '';
      els.listView.innerHTML = '';
    }

    els.taskCount.textContent = filtered.length + ' of ' + state.tasks.length + ' task' + (state.tasks.length === 1 ? '' : 's') + ' shown';

    var destructive = document.querySelectorAll('[data-action="delete"], [data-action="status"]');
    for (var i = 0; i < destructive.length; i++) destructive[i].disabled = state.conflict;
    els.createTaskBtn.disabled = state.conflict;
  }

  // ---------------- mutations ----------------

  function changeStatus(id, newStatus) {
    var idx = state.tasks.findIndex(function (t) { return t.id === id; });
    if (idx === -1) return;
    var updated = state.tasks.map(function (t) { return t.id === id ? Object.assign({}, t, { status: newStatus }) : t; });
    var res = persist(updated);
    if (!res.ok) { state.saveError = describeStorageError(res.error); render(); return; }
    state.saveError = null;
    state.tasks = updated;
    render();
  }

  function deleteTask(id) {
    var idx = state.tasks.findIndex(function (t) { return t.id === id; });
    if (idx === -1) return;
    var task = state.tasks[idx];
    var updated = state.tasks.slice(0, idx).concat(state.tasks.slice(idx + 1));
    var res = persist(updated);
    if (!res.ok) { state.saveError = describeStorageError(res.error); render(); return; }
    state.saveError = null;
    state.tasks = updated;
    state.pendingDelete = { task: task, index: idx };
    showUndoToast(task);
    render();
  }

  function undoDelete() {
    if (!state.pendingDelete) return;
    var task = state.pendingDelete.task;
    var index = state.pendingDelete.index;
    var updated = state.tasks.slice();
    var insertAt = Math.min(index, updated.length);
    updated.splice(insertAt, 0, task);
    var res = persist(updated);
    if (!res.ok) { state.saveError = describeStorageError(res.error); render(); return; }
    state.saveError = null;
    state.tasks = updated;
    state.pendingDelete = null;
    hideUndoToast();
    render();
  }

  function showUndoToast(task) {
    els.undoToastText.textContent = 'Deleted "' + task.title + '".';
    els.undoToast.hidden = false;
    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = setTimeout(hideUndoToast, UNDO_WINDOW_MS);
    var btn = els.undoToast.querySelector('[data-testid="undo-delete"]');
    if (btn) btn.focus();
  }

  function hideUndoToast() {
    els.undoToast.hidden = true;
    if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
  }

  // ---------------- form / dialog ----------------

  function clearFormErrors() {
    var errs = document.querySelectorAll('.field-error');
    for (var i = 0; i < errs.length; i++) { errs[i].hidden = true; errs[i].textContent = ''; }
    var inputs = els.form.querySelectorAll('input, select');
    for (var j = 0; j < inputs.length; j++) inputs[j].classList.remove('has-error');
  }

  function showFormErrors(errors) {
    var firstKey = null;
    for (var field in errors) {
      if (!errors[field]) continue;
      if (!firstKey) firstKey = field;
      var p = document.querySelector('[data-error-for="' + field + '"]');
      if (p) { p.hidden = false; p.textContent = errors[field]; }
      var input = document.getElementById('field-' + field);
      if (input) input.classList.add('has-error');
    }
    if (firstKey) {
      var toFocus = document.getElementById('field-' + firstKey);
      if (toFocus) toFocus.focus();
    }
  }

  function showDialogError(msg) {
    var p = document.getElementById('dialog-general-error');
    p.hidden = false;
    p.textContent = msg;
  }

  function hideDialogError() {
    var p = document.getElementById('dialog-general-error');
    p.hidden = true;
    p.textContent = '';
  }

  function openCreateDialog(trigger) {
    state.editingId = null;
    state.lastFocused = trigger || document.activeElement;
    els.dialogTitle.textContent = 'New task';
    els.form.reset();
    document.getElementById('field-status').value = 'todo';
    document.getElementById('field-priority').value = 'medium';
    clearFormErrors();
    hideDialogError();
    els.taskDialog.showModal();
    document.getElementById('field-title').focus();
  }

  function openEditDialog(id, trigger) {
    var task = state.tasks.find(function (t) { return t.id === id; });
    if (!task) return;
    state.editingId = id;
    state.lastFocused = trigger || document.activeElement;
    els.dialogTitle.textContent = 'Edit task';
    document.getElementById('field-title').value = task.title;
    document.getElementById('field-project').value = task.project;
    document.getElementById('field-status').value = task.status;
    document.getElementById('field-priority').value = task.priority;
    document.getElementById('field-dueDate').value = task.dueDate;
    document.getElementById('field-tags').value = task.tags.join(', ');
    clearFormErrors();
    hideDialogError();
    els.taskDialog.showModal();
    document.getElementById('field-title').focus();
  }

  function onFormSubmit(e) {
    e.preventDefault();
    var fd = new FormData(els.form);
    var title = fd.get('title') || '';
    var project = fd.get('project') || '';
    var status = fd.get('status');
    var priority = fd.get('priority');
    var dueDate = fd.get('dueDate') || '';
    var tagsRaw = fd.get('tags') || '';

    clearFormErrors();
    hideDialogError();

    var errors = validateTaskFields({ title: title, project: project, status: status, priority: priority, dueDate: dueDate });
    var tagResult = parseTagsInput(tagsRaw);
    if (tagResult.error) errors.tags = tagResult.error;

    if (Object.keys(errors).length) { showFormErrors(errors); return; }

    if (state.conflict) {
      showDialogError('Board changed in another tab. Reload the board before saving.');
      return;
    }

    var cleanTitle = title.trim();
    var cleanProject = project.trim();
    var tags = tagResult.tags;
    var updatedTasks;

    if (state.editingId) {
      updatedTasks = state.tasks.map(function (t) {
        return t.id === state.editingId
          ? Object.assign({}, t, { title: cleanTitle, project: cleanProject, status: status, priority: priority, dueDate: dueDate, tags: tags })
          : t;
      });
    } else {
      var newTask = { id: genId(), title: cleanTitle, project: cleanProject, status: status, priority: priority, dueDate: dueDate, tags: tags };
      updatedTasks = state.tasks.concat(newTask);
    }

    var res = persist(updatedTasks);
    if (!res.ok) {
      state.saveError = describeStorageError(res.error);
      showDialogError(state.saveError + ' Your entry is still in this form — try again.');
      render();
      return;
    }
    state.saveError = null;
    state.tasks = updatedTasks;
    state.editingId = null;
    els.taskDialog.close();
    render();
  }

  // ---------------- corrupt-state actions ----------------

  function downloadCorruptBytes() {
    var raw = state.corruptRaw || '';
    var blob = new Blob([raw], { type: 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'fieldnote-board-corrupt-backup.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function onResetBoard() {
    var ok = window.confirm('Reset the board? This replaces the unreadable data with a fresh demo board and cannot be undone.');
    if (!ok) return;
    var seeded = seedTasks();
    var res = persist(seeded);
    if (!res.ok) { state.saveError = describeStorageError(res.error); render(); return; }
    state.tasks = seeded;
    state.corrupt = false;
    state.corruptRaw = null;
    state.saveError = null;
    render();
  }

  // ---------------- cross-tab conflict ----------------

  function onStorageEvent(e) {
    if (e.key !== STORAGE_KEY) return;
    if (e.newValue === state.lastPersisted) return;
    state.conflict = true;
    render();
  }

  function onReloadBoard() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
    if (raw === null) {
      state.tasks = [];
      state.corrupt = false;
    } else {
      var parsed;
      try { parsed = JSON.parse(raw); } catch (e) { parsed = undefined; }
      if (parsed !== undefined && validateBoardShape(parsed)) {
        state.tasks = parsed.tasks;
        state.lastPersisted = raw;
        state.corrupt = false;
        state.corruptRaw = null;
      } else {
        state.corrupt = true;
        state.corruptRaw = raw;
      }
    }
    state.conflict = false;
    state.pendingDelete = null;
    hideUndoToast();
    if (els.taskDialog.open) els.taskDialog.close();
    render();
  }

  // ---------------- import / export ----------------

  function showImportError(msg) {
    els.importError.hidden = false;
    els.importError.textContent = msg;
  }
  function hideImportError() {
    els.importError.hidden = true;
    els.importError.textContent = '';
  }

  function onExportClick() {
    var data = serialize(state.tasks);
    var blob = new Blob([data], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'fieldnote-board-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function onImportChange() {
    var file = els.importInput.files && els.importInput.files[0];
    els.importInput.value = '';
    if (!file) return;
    hideImportError();
    if (file.size > MAX_IMPORT_BYTES) { showImportError('Import file is larger than 1 MiB.'); return; }

    var reader = new FileReader();
    reader.onerror = function () { showImportError('Could not read the file.'); };
    reader.onload = function () {
      var text = reader.result;
      if (typeof text !== 'string') { showImportError('Could not read the file.'); return; }
      if (new Blob([text]).size > MAX_IMPORT_BYTES) { showImportError('Import file is larger than 1 MiB.'); return; }
      var parsed;
      try { parsed = JSON.parse(text); } catch (e) { showImportError('That file is not valid JSON.'); return; }
      if (!validateBoardShape(parsed)) { showImportError('That file does not match the expected board format (schemaVersion 1, valid tasks, unique IDs).'); return; }
      if (state.conflict) { showImportError('Board changed in another tab. Reload the board before importing.'); return; }
      var ok = window.confirm('Import ' + parsed.tasks.length + ' task(s) and replace the current board of ' + state.tasks.length + ' task(s)? This cannot be undone.');
      if (!ok) return;
      var res = persist(parsed.tasks);
      if (!res.ok) { state.saveError = describeStorageError(res.error); render(); return; }
      state.saveError = null;
      state.tasks = parsed.tasks;
      state.pendingDelete = null;
      hideUndoToast();
      render();
    };
    reader.readAsText(file);
  }

  // ---------------- wiring ----------------

  function cacheEls() {
    els.notices = document.getElementById('notices');
    els.searchInput = document.getElementById('search-input');
    els.filterStatus = document.getElementById('filter-status');
    els.filterProject = document.getElementById('filter-project');
    els.filterPriority = document.getElementById('filter-priority');
    els.createTaskBtn = document.getElementById('create-task-btn');
    els.taskCount = document.getElementById('task-count');
    els.importError = document.getElementById('import-error');
    els.emptyState = document.getElementById('empty-state');
    els.noResultsState = document.getElementById('no-results-state');
    els.boardView = document.getElementById('board-view');
    els.listView = document.getElementById('list-view');
    els.boardRegion = document.getElementById('board-region');
    els.undoToast = document.getElementById('undo-toast');
    els.undoToastText = document.getElementById('undo-toast-text');
    els.taskDialog = document.getElementById('task-dialog');
    els.dialogTitle = document.getElementById('task-dialog-title');
    els.form = document.getElementById('task-form');
    els.importInput = document.getElementById('import-input');
  }

  function wireEvents() {
    els.searchInput.addEventListener('input', function (e) { state.search = e.target.value; render(); });
    els.filterStatus.addEventListener('change', function (e) { state.filterStatus = e.target.value; render(); });
    els.filterProject.addEventListener('change', function (e) { state.filterProject = e.target.value; render(); });
    els.filterPriority.addEventListener('change', function (e) { state.filterPriority = e.target.value; render(); });

    els.createTaskBtn.addEventListener('click', function () { openCreateDialog(els.createTaskBtn); });
    var emptyBtn = document.getElementById('create-task-empty');
    if (emptyBtn) emptyBtn.addEventListener('click', function (e) { openCreateDialog(e.currentTarget); });

    document.getElementById('clear-filters-btn').addEventListener('click', function () {
      state.search = ''; state.filterStatus = 'all'; state.filterProject = 'all'; state.filterPriority = 'all';
      els.searchInput.value = ''; els.filterStatus.value = 'all'; els.filterProject.value = 'all'; els.filterPriority.value = 'all';
      render();
    });

    var viewBtns = document.querySelectorAll('[data-view-btn]');
    for (var i = 0; i < viewBtns.length; i++) {
      viewBtns[i].addEventListener('click', function (e) {
        var btn = e.currentTarget;
        state.view = btn.dataset.viewBtn;
        for (var j = 0; j < viewBtns.length; j++) viewBtns[j].setAttribute('aria-pressed', String(viewBtns[j] === btn));
        render();
      });
    }

    els.boardRegion.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="edit"], [data-action="delete"]');
      if (!btn) return;
      var card = btn.closest('[data-task-id]');
      var id = card.dataset.taskId;
      if (btn.dataset.action === 'edit') openEditDialog(id, btn);
      else if (btn.dataset.action === 'delete') { if (!state.conflict) deleteTask(id); }
    });
    els.boardRegion.addEventListener('change', function (e) {
      var sel = e.target.closest('[data-action="status"]');
      if (!sel) return;
      var card = sel.closest('[data-task-id]');
      var id = card.dataset.taskId;
      if (state.conflict) { var t = state.tasks.find(function (x) { return x.id === id; }); if (t) sel.value = t.status; return; }
      changeStatus(id, sel.value);
    });

    els.undoToast.querySelector('[data-testid="undo-delete"]').addEventListener('click', undoDelete);

    els.form.addEventListener('submit', onFormSubmit);
    document.getElementById('dialog-close').addEventListener('click', function () { els.taskDialog.close(); });
    document.getElementById('dialog-cancel').addEventListener('click', function () { els.taskDialog.close(); });
    els.taskDialog.addEventListener('close', function () {
      if (state.lastFocused && document.body.contains(state.lastFocused)) state.lastFocused.focus();
      state.lastFocused = null;
    });

    document.querySelector('[data-testid="export"]').addEventListener('click', onExportClick);
    els.importInput.addEventListener('change', onImportChange);

    window.addEventListener('storage', onStorageEvent);
  }

  function init() {
    cacheEls();
    loadInitial();
    wireEvents();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
