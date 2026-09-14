/* Fieldnote Board — local-first task app. No build step, no network, no dependencies. */
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
    corrupt: null,        // { raw, reason } when saved data cannot be read
    staleExternal: false, // true once another tab has written the storage key
    lastDeleted: null      // { task, index } for undo
  };

  var toasts = {}; // id -> { message, actionLabel, testid, onAction, dismissible }
  var els = {};

  // ---------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------

  function isPlainObject(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
  }

  function isValidDateString(s) {
    if (typeof s !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var parts = s.split('-');
    var y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2]);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function parseTagsInput(raw) {
    if (!raw || !raw.trim()) return { ok: true, tags: [] };
    var parts = raw.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i];
      if (t.length > 24) return { ok: false, error: 'Each tag must be 24 characters or fewer.' };
      var key = t.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      out.push(t);
    }
    if (out.length > 8) return { ok: false, error: 'Up to 8 tags are allowed.' };
    return { ok: true, tags: out };
  }

  // Strict validator used for both startup load and import — a task object must
  // fully match the schema or the whole document is treated as invalid.
  function normalizeAndValidateTask(obj, idx) {
    var label = 'Task ' + (idx + 1);
    if (!isPlainObject(obj)) return { ok: false, error: label + ' is not a valid task object.' };

    if (typeof obj.id !== 'string' || obj.id.length < 1 || obj.id.length > 80) {
      return { ok: false, error: label + ': id must be a string of 1-80 characters.' };
    }
    if (typeof obj.title !== 'string') return { ok: false, error: label + ': title is required.' };
    var title = obj.title.trim();
    if (!title || title.length > 120) return { ok: false, error: label + ': title must be 1-120 characters.' };

    if (typeof obj.project !== 'string') return { ok: false, error: label + ': project is required.' };
    var project = obj.project.trim();
    if (!project || project.length > 80) return { ok: false, error: label + ': project must be 1-80 characters.' };

    if (STATUSES.indexOf(obj.status) === -1) {
      return { ok: false, error: label + ': status "' + obj.status + '" is not supported.' };
    }
    if (PRIORITIES.indexOf(obj.priority) === -1) {
      return { ok: false, error: label + ': priority "' + obj.priority + '" is not supported.' };
    }

    if (typeof obj.dueDate !== 'string') return { ok: false, error: label + ': due date must be a string.' };
    var dueDate = obj.dueDate;
    if (dueDate !== '' && !isValidDateString(dueDate)) {
      return { ok: false, error: label + ': due date is not a real calendar date.' };
    }

    if (!Array.isArray(obj.tags)) return { ok: false, error: label + ': tags must be a list.' };
    var seen = Object.create(null);
    var tags = [];
    for (var i = 0; i < obj.tags.length; i++) {
      var rawTag = obj.tags[i];
      if (typeof rawTag !== 'string') return { ok: false, error: label + ': tags must be strings.' };
      var t = rawTag.trim();
      if (!t) continue;
      if (t.length > 24) return { ok: false, error: label + ': each tag must be 24 characters or fewer.' };
      var key = t.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      tags.push(t);
    }
    if (tags.length > 8) return { ok: false, error: label + ': up to 8 tags are allowed.' };

    return {
      ok: true,
      task: { id: obj.id, title: title, project: project, status: obj.status, priority: obj.priority, dueDate: dueDate, tags: tags }
    };
  }

  function parseAndValidateBoardDocument(text, opts) {
    opts = opts || {};
    if (opts.enforceSizeLimit) {
      var byteLength = new TextEncoder().encode(text).length;
      if (byteLength > MAX_IMPORT_BYTES) return { ok: false, error: 'File is larger than 1 MiB.' };
    }
    var doc;
    try {
      doc = JSON.parse(text);
    } catch (e) {
      return { ok: false, error: 'The data is not valid JSON.' };
    }
    if (!isPlainObject(doc)) return { ok: false, error: 'The document is not a board (expected an object).' };
    if (doc.schemaVersion !== 1) return { ok: false, error: 'Unsupported schema version.' };
    if (!Array.isArray(doc.tasks)) return { ok: false, error: 'The document has no task list.' };

    var seenIds = Object.create(null);
    var normalized = [];
    for (var i = 0; i < doc.tasks.length; i++) {
      var res = normalizeAndValidateTask(doc.tasks[i], i);
      if (!res.ok) return { ok: false, error: res.error };
      if (seenIds[res.task.id]) return { ok: false, error: 'Duplicate task id "' + res.task.id + '".' };
      seenIds[res.task.id] = true;
      normalized.push(res.task);
    }
    return { ok: true, tasks: normalized };
  }

  // ---------------------------------------------------------------------
  // Seed data
  // ---------------------------------------------------------------------

  function seedTasks() {
    var raw = [
      { title: 'Calibrate water-quality sensors', project: 'Riverside Wetland Survey', status: 'todo', priority: 'high', dueDate: '2026-09-18', tags: ['equipment', 'calibration'] },
      { title: 'Recruit volunteer counters for bird survey', project: 'Riverside Wetland Survey', status: 'todo', priority: 'medium', dueDate: '', tags: ['volunteers'] },
      { title: 'Photograph invasive species patches', project: 'Riverside Wetland Survey', status: 'todo', priority: 'low', dueDate: '', tags: ['photography', 'ecology'] },
      { title: 'Map existing trail erosion points', project: 'Canyon Trail Access Study', status: 'doing', priority: 'high', dueDate: '2026-09-16', tags: ['fieldwork', 'mapping'] },
      { title: 'Draft interview questions for trail users', project: 'Canyon Trail Access Study', status: 'doing', priority: 'medium', dueDate: '', tags: ['interviews'] },
      { title: 'Review Q3 budget for field gear', project: 'Canyon Trail Access Study', status: 'doing', priority: 'medium', dueDate: '2026-09-30', tags: ['budget'] },
      { title: 'Digitize week 1 field notes', project: 'Riverside Wetland Survey', status: 'done', priority: 'low', dueDate: '', tags: ['data-entry'] },
      { title: 'Submit access permit renewal', project: 'Canyon Trail Access Study', status: 'done', priority: 'high', dueDate: '2026-09-05', tags: ['permits', 'admin'] }
    ];
    return raw.map(function (t) {
      return { id: generateId(), title: t.title, project: t.project, status: t.status, priority: t.priority, dueDate: t.dueDate, tags: t.tags.slice() };
    });
  }

  // ---------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------

  function persistTasks(tasks, opts) {
    opts = opts || {};
    var payload = JSON.stringify({ schemaVersion: 1, tasks: tasks });
    try {
      localStorage.setItem(STORAGE_KEY, payload);
      state.tasks = tasks;
      return true;
    } catch (e) {
      if (opts.isInitialSeed) state.tasks = tasks; // still usable this session
      return false;
    }
  }

  function loadBoard() {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      state.tasks = [];
      return;
    }
    if (raw === null) {
      var seeded = seedTasks();
      var ok = persistTasks(seeded, { isInitialSeed: true });
      if (!ok) setToast('save-error', { message: 'Could not save the starter board. It is kept only for this session.', dismissible: true });
      return;
    }
    var result = parseAndValidateBoardDocument(raw, { enforceSizeLimit: false });
    if (!result.ok) {
      state.corrupt = { raw: raw, reason: result.error };
      state.tasks = [];
      return;
    }
    state.tasks = result.tasks;
  }

  function resetBoard() {
    var ok = persistTasks([]);
    if (!ok) {
      setToast('save-error', { message: 'Reset failed: storage is unavailable. The original data is unchanged.', dismissible: true });
      return;
    }
    state.corrupt = null;
    renderAll();
  }

  function downloadCorruptBytes() {
    var blob = new Blob([state.corrupt.raw], { type: 'application/octet-stream' });
    triggerDownload(blob, 'fieldnote-board-corrupt-backup.txt');
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------

  function changeStatus(id, status) {
    if (state.staleExternal || STATUSES.indexOf(status) === -1) return;
    var idx = state.tasks.findIndex(function (t) { return t.id === id; });
    if (idx === -1) return;
    var next = state.tasks.slice();
    next[idx] = Object.assign({}, next[idx], { status: status });
    var ok = persistTasks(next);
    if (!ok) { setToast('save-error', { message: 'Not saved: status change was not stored.', dismissible: true }); return; }
    renderAll();
  }

  function deleteTask(id) {
    if (state.staleExternal) return;
    var idx = state.tasks.findIndex(function (t) { return t.id === id; });
    if (idx === -1) return;
    var removed = state.tasks[idx];
    var next = state.tasks.slice(0, idx).concat(state.tasks.slice(idx + 1));
    var ok = persistTasks(next);
    if (!ok) { setToast('save-error', { message: 'Not saved: delete was not stored.', dismissible: true }); return; }
    state.lastDeleted = { task: removed, index: idx };
    renderAll();
    setToast('undo', {
      message: 'Deleted "' + removed.title + '".',
      actionLabel: 'Undo',
      testid: 'undo-delete',
      onAction: undoDelete
    });
  }

  function undoDelete() {
    if (!state.lastDeleted || state.staleExternal) return;
    var task = state.lastDeleted.task;
    var index = state.lastDeleted.index;
    var next = state.tasks.slice();
    var insertAt = Math.min(index, next.length);
    next.splice(insertAt, 0, task);
    var ok = persistTasks(next);
    if (!ok) { setToast('save-error', { message: 'Undo failed: could not be stored.', dismissible: true }); return; }
    state.lastDeleted = null;
    renderAll();
  }

  function handleImportFile(file) {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setToast('import-error', { message: 'Import failed: file is larger than 1 MiB.', dismissible: true });
      resetImportInput();
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result);
      var result = parseAndValidateBoardDocument(text, { enforceSizeLimit: true });
      if (!result.ok) {
        setToast('import-error', { message: 'Import failed: ' + result.error, dismissible: true });
        resetImportInput();
        return;
      }
      var confirmed = window.confirm(
        'Import ' + result.tasks.length + ' task(s) and replace the current board of ' + state.tasks.length + ' task(s)? This cannot be undone.'
      );
      if (!confirmed) { resetImportInput(); return; }
      var ok = persistTasks(result.tasks);
      if (!ok) {
        setToast('import-error', { message: 'Import could not be saved due to a storage error. The previous board is unchanged.', dismissible: true });
      } else {
        state.lastDeleted = null;
        clearToast('undo');
        renderAll();
        setToast('import-success', { message: 'Board replaced with ' + result.tasks.length + ' imported task(s).', dismissible: true });
      }
      resetImportInput();
    };
    reader.onerror = function () {
      setToast('import-error', { message: 'Import failed: could not read the file.', dismissible: true });
      resetImportInput();
    };
    reader.readAsText(file);
  }

  function resetImportInput() {
    els.importFileInput.value = '';
  }

  function exportBoard() {
    var payload = JSON.stringify({ schemaVersion: 1, tasks: state.tasks }, null, 2);
    triggerDownload(new Blob([payload], { type: 'application/json' }), 'fieldnote-board-export.json');
  }

  // ---------------------------------------------------------------------
  // Form (create / edit)
  // ---------------------------------------------------------------------

  function clearFormErrors() {
    ['title', 'project', 'dueDate', 'tags'].forEach(function (f) {
      var el = document.getElementById('err-' + f);
      if (el) el.textContent = '';
    });
    document.getElementById('err-form').textContent = '';
  }

  function showFormErrors(errors) {
    Object.keys(errors).forEach(function (f) {
      var el = document.getElementById('err-' + f);
      if (el) el.textContent = errors[f];
    });
    var firstKey = Object.keys(errors)[0];
    if (firstKey && els.taskForm.elements[firstKey]) els.taskForm.elements[firstKey].focus();
  }

  function openCreateDialog() {
    if (state.staleExternal) return;
    els.taskForm.reset();
    els.taskForm.elements.id.value = '';
    document.getElementById('task-dialog-title').textContent = 'New task';
    clearFormErrors();
    els.lastFocused = document.activeElement;
    els.taskDialog.showModal();
    els.fieldTitle.focus();
  }

  function openEditDialog(id) {
    if (state.staleExternal) return;
    var task = state.tasks.find(function (t) { return t.id === id; });
    if (!task) return;
    els.taskForm.reset();
    els.taskForm.elements.id.value = task.id;
    els.taskForm.elements.title.value = task.title;
    els.taskForm.elements.project.value = task.project;
    els.taskForm.elements.status.value = task.status;
    els.taskForm.elements.priority.value = task.priority;
    els.taskForm.elements.dueDate.value = task.dueDate;
    els.taskForm.elements.tags.value = task.tags.join(', ');
    document.getElementById('task-dialog-title').textContent = 'Edit task';
    clearFormErrors();
    els.lastFocused = document.activeElement;
    els.taskDialog.showModal();
    els.fieldTitle.focus();
  }

  function closeTaskDialog() {
    if (els.taskDialog.open) els.taskDialog.close();
  }

  function onTaskFormSubmit(e) {
    e.preventDefault();
    if (state.staleExternal) {
      document.getElementById('err-form').textContent = 'This board changed in another tab. Reload before saving.';
      return;
    }
    clearFormErrors();
    var fd = new FormData(els.taskForm);
    var id = String(fd.get('id') || '');
    var status = String(fd.get('status') || 'todo');
    var priority = String(fd.get('priority') || 'medium');

    var errors = {};
    var title = String(fd.get('title') || '').trim();
    if (!title) errors.title = 'Title is required.';
    else if (title.length > 120) errors.title = 'Title must be 120 characters or fewer.';

    var project = String(fd.get('project') || '').trim();
    if (!project) errors.project = 'Project is required.';
    else if (project.length > 80) errors.project = 'Project must be 80 characters or fewer.';

    if (STATUSES.indexOf(status) === -1) status = 'todo';
    if (PRIORITIES.indexOf(priority) === -1) priority = 'medium';

    var dueDate = String(fd.get('dueDate') || '').trim();
    if (dueDate !== '' && !isValidDateString(dueDate)) errors.dueDate = 'Enter a real date in YYYY-MM-DD format.';

    var tagsResult = parseTagsInput(String(fd.get('tags') || ''));
    if (!tagsResult.ok) errors.tags = tagsResult.error;

    if (Object.keys(errors).length) {
      showFormErrors(errors);
      return;
    }

    var isEdit = !!id;
    var record = {
      id: isEdit ? id : generateId(),
      title: title, project: project, status: status, priority: priority,
      dueDate: dueDate, tags: tagsResult.tags
    };

    var next;
    if (isEdit) {
      var idx = state.tasks.findIndex(function (t) { return t.id === id; });
      if (idx === -1) {
        document.getElementById('err-form').textContent = 'This task no longer exists. Reload the board.';
        return;
      }
      next = state.tasks.slice();
      next[idx] = record;
    } else {
      next = state.tasks.concat([record]);
    }

    var ok = persistTasks(next);
    if (!ok) {
      document.getElementById('err-form').textContent = 'Could not save: storage is unavailable this session. Your entry is kept in this form.';
      return;
    }
    closeTaskDialog();
    renderAll();
  }

  // ---------------------------------------------------------------------
  // Toasts (undo / transient errors) and sticky banners
  // ---------------------------------------------------------------------

  function setToast(id, cfg) { toasts[id] = cfg; renderToasts(); }
  function clearToast(id) { delete toasts[id]; renderToasts(); }

  function renderToasts() {
    els.toastRegion.innerHTML = '';
    Object.keys(toasts).forEach(function (id) {
      var cfg = toasts[id];
      var div = document.createElement('div');
      div.className = 'toast';
      var span = document.createElement('span');
      span.textContent = cfg.message;
      div.appendChild(span);
      if (cfg.actionLabel) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn--text';
        if (cfg.testid) btn.setAttribute('data-testid', cfg.testid);
        btn.textContent = cfg.actionLabel;
        btn.disabled = !!state.staleExternal && id === 'undo';
        btn.addEventListener('click', function () { cfg.onAction && cfg.onAction(); clearToast(id); });
        div.appendChild(btn);
      }
      if (cfg.dismissible) {
        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn btn--text';
        closeBtn.setAttribute('aria-label', 'Dismiss message');
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', function () { clearToast(id); });
        div.appendChild(closeBtn);
      }
      els.toastRegion.appendChild(div);
    });
  }

  function buildCorruptBanner() {
    var div = document.createElement('div');
    div.className = 'banner banner--danger';
    div.setAttribute('role', 'alert');
    var text = document.createElement('div');
    text.className = 'banner__text';
    var strong = document.createElement('strong');
    strong.textContent = 'Saved board could not be read';
    var p = document.createElement('p');
    p.style.margin = '0';
    p.textContent = 'Your stored data is unreadable (' + state.corrupt.reason + '). It has been left untouched.';
    text.appendChild(strong);
    text.appendChild(p);
    div.appendChild(text);

    var dl = document.createElement('button');
    dl.type = 'button';
    dl.className = 'btn btn--small btn--ghost';
    dl.textContent = 'Download original data';
    dl.addEventListener('click', downloadCorruptBytes);
    div.appendChild(dl);

    var reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'btn btn--small btn--primary';
    reset.textContent = 'Reset board';
    reset.addEventListener('click', function () {
      if (window.confirm('Reset the board? This permanently replaces the unreadable saved data with a new empty board.')) resetBoard();
    });
    div.appendChild(reset);
    return div;
  }

  function buildConflictBanner() {
    var div = document.createElement('div');
    div.className = 'banner banner--warning';
    div.setAttribute('role', 'alert');
    var text = document.createElement('div');
    text.className = 'banner__text';
    var strong = document.createElement('strong');
    strong.textContent = 'Updated in another tab';
    var p = document.createElement('p');
    p.style.margin = '0';
    p.textContent = 'This board changed in another tab or window. Reload to see the latest version before making changes.';
    text.appendChild(strong);
    text.appendChild(p);
    div.appendChild(text);

    var reloadBtn = document.createElement('button');
    reloadBtn.type = 'button';
    reloadBtn.className = 'btn btn--small btn--primary';
    reloadBtn.textContent = 'Reload board';
    reloadBtn.addEventListener('click', function () { window.location.reload(); });
    div.appendChild(reloadBtn);
    return div;
  }

  function renderBanners() {
    els.bannerRegion.innerHTML = '';
    if (state.corrupt) els.bannerRegion.appendChild(buildCorruptBanner());
    if (state.staleExternal) els.bannerRegion.appendChild(buildConflictBanner());
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------

  function updateProjectFilterOptions() {
    var select = els.filterProject;
    var current = select.value || 'all';
    var projects = Array.from(new Set(state.tasks.map(function (t) { return t.project; }))).sort(function (a, b) { return a.localeCompare(b); });
    select.innerHTML = '';
    var allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All projects';
    select.appendChild(allOpt);
    projects.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p;
      o.textContent = p;
      select.appendChild(o);
    });
    select.value = (projects.indexOf(current) !== -1 || current === 'all') ? current : 'all';
  }

  function updateProjectSuggestions() {
    var list = document.getElementById('project-suggestions');
    var projects = Array.from(new Set(state.tasks.map(function (t) { return t.project; })));
    list.innerHTML = '';
    projects.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p;
      list.appendChild(o);
    });
  }

  function getFilteredTasks() {
    var q = (els.search.value || '').trim().toLowerCase();
    var fStatus = els.filterStatus.value;
    var fProject = els.filterProject.value;
    var fPriority = els.filterPriority.value;
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

  function renderTaskCard(task) {
    var card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('data-testid', 'task-card');
    card.setAttribute('data-task-id', task.id);

    var title = document.createElement('p');
    title.className = 'task-card__title';
    title.textContent = task.title;
    card.appendChild(title);

    var meta = document.createElement('div');
    meta.className = 'task-card__meta';

    var projectPill = document.createElement('span');
    projectPill.className = 'pill';
    projectPill.textContent = task.project;
    meta.appendChild(projectPill);

    var priorityPill = document.createElement('span');
    priorityPill.className = 'pill pill--priority-' + task.priority;
    priorityPill.textContent = PRIORITY_LABELS[task.priority] + ' priority';
    meta.appendChild(priorityPill);

    if (task.dueDate) {
      var overdue = task.status !== 'done' && task.dueDate < todayISO();
      var duePill = document.createElement('span');
      duePill.className = 'pill' + (overdue ? ' pill--due-overdue' : '');
      duePill.textContent = (overdue ? 'Overdue · ' : 'Due ') + task.dueDate;
      meta.appendChild(duePill);
    }
    card.appendChild(meta);

    if (task.tags.length) {
      var tagList = document.createElement('div');
      tagList.className = 'tag-list';
      task.tags.forEach(function (tag) {
        var t = document.createElement('span');
        t.className = 'pill tag-pill';
        t.textContent = tag;
        tagList.appendChild(t);
      });
      card.appendChild(tagList);
    }

    var row = document.createElement('div');
    row.className = 'task-card__row';

    var statusSelect = document.createElement('select');
    statusSelect.className = 'status-select';
    statusSelect.setAttribute('data-action', 'status');
    statusSelect.setAttribute('aria-label', 'Status for ' + task.title);
    STATUSES.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s;
      opt.textContent = STATUS_LABELS[s];
      if (s === task.status) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    row.appendChild(statusSelect);

    var controls = document.createElement('div');
    controls.className = 'task-card__controls';

    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn--small btn--ghost';
    editBtn.setAttribute('data-action', 'edit');
    editBtn.setAttribute('aria-label', 'Edit ' + task.title);
    editBtn.textContent = 'Edit';
    controls.appendChild(editBtn);

    var deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn--small btn--ghost';
    deleteBtn.setAttribute('data-action', 'delete');
    deleteBtn.setAttribute('aria-label', 'Delete ' + task.title);
    deleteBtn.textContent = 'Delete';
    controls.appendChild(deleteBtn);

    row.appendChild(controls);
    card.appendChild(row);
    return card;
  }

  function applyStaleDisabling() {
    var disable = !!state.staleExternal;
    els.createTaskBtn.disabled = disable;
    els.importFileInput.disabled = disable;
    els.board.querySelectorAll('[data-action]').forEach(function (el) { el.disabled = disable; });
    els.app.classList.toggle('is-stale', disable);
  }

  function renderAll() {
    renderBanners();
    updateProjectFilterOptions();
    updateProjectSuggestions();

    var filtered = getFilteredTasks();
    var byStatus = { todo: [], doing: [], done: [] };
    filtered.forEach(function (t) { byStatus[t.status].push(t); });

    STATUSES.forEach(function (status) {
      var list = document.querySelector('[data-list-for="' + status + '"]');
      list.innerHTML = '';
      var items = byStatus[status];
      if (!items.length) {
        var empty = document.createElement('p');
        empty.className = 'column-empty';
        empty.textContent = state.tasks.length === 0 ? 'No tasks yet.' : 'No matching tasks.';
        list.appendChild(empty);
      } else {
        items.forEach(function (t) { list.appendChild(renderTaskCard(t)); });
      }
      document.querySelector('[data-count-for="' + status + '"]').textContent = String(items.length);
    });

    els.board.hidden = filtered.length === 0;
    if (filtered.length === 0) {
      els.emptyState.hidden = false;
      els.emptyState.textContent = state.tasks.length === 0
        ? 'No tasks yet — click "New task" to add your first one.'
        : 'No tasks match your search and filters.';
    } else {
      els.emptyState.hidden = true;
    }

    els.resultCount.textContent = 'Showing ' + filtered.length + ' of ' + state.tasks.length + ' task' + (state.tasks.length === 1 ? '' : 's') + '.';

    renderToasts();
    applyStaleDisabling();
  }

  // ---------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------

  function cacheEls() {
    els.app = document.getElementById('app');
    els.bannerRegion = document.getElementById('banner-region');
    els.toastRegion = document.getElementById('toast-region');
    els.board = document.getElementById('board');
    els.emptyState = document.getElementById('empty-state');
    els.resultCount = document.getElementById('result-count');
    els.search = document.getElementById('search-input');
    els.filterStatus = document.getElementById('filter-status');
    els.filterProject = document.getElementById('filter-project');
    els.filterPriority = document.getElementById('filter-priority');
    els.clearFiltersBtn = document.getElementById('clear-filters-btn');
    els.createTaskBtn = document.getElementById('create-task-btn');
    els.exportBtn = document.getElementById('export-btn');
    els.importFileInput = document.getElementById('import-file');
    els.taskDialog = document.getElementById('task-dialog');
    els.taskForm = document.getElementById('task-form');
    els.cancelTaskBtn = document.getElementById('cancel-task-btn');
    els.fieldTitle = document.getElementById('field-title');
  }

  function bindEvents() {
    els.search.addEventListener('input', renderAll);
    els.filterStatus.addEventListener('change', renderAll);
    els.filterProject.addEventListener('change', renderAll);
    els.filterPriority.addEventListener('change', renderAll);
    els.clearFiltersBtn.addEventListener('click', function () {
      els.search.value = '';
      els.filterStatus.value = 'all';
      els.filterProject.value = 'all';
      els.filterPriority.value = 'all';
      renderAll();
    });

    els.createTaskBtn.addEventListener('click', openCreateDialog);
    els.cancelTaskBtn.addEventListener('click', closeTaskDialog);
    els.taskForm.addEventListener('submit', onTaskFormSubmit);
    els.taskDialog.addEventListener('close', function () {
      if (els.lastFocused && typeof els.lastFocused.focus === 'function') els.lastFocused.focus();
    });
    els.taskDialog.addEventListener('click', function (e) {
      if (e.target === els.taskDialog) closeTaskDialog();
    });

    els.board.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn || btn.tagName !== 'BUTTON') return;
      var card = e.target.closest('[data-task-id]');
      if (!card) return;
      var id = card.getAttribute('data-task-id');
      var action = btn.getAttribute('data-action');
      if (action === 'edit') openEditDialog(id);
      else if (action === 'delete') deleteTask(id);
    });

    els.board.addEventListener('change', function (e) {
      var sel = e.target.closest('[data-action="status"]');
      if (!sel) return;
      var card = e.target.closest('[data-task-id]');
      if (!card) return;
      changeStatus(card.getAttribute('data-task-id'), sel.value);
    });

    els.exportBtn.addEventListener('click', exportBoard);
    els.importFileInput.addEventListener('change', function (e) {
      if (state.staleExternal) {
        setToast('import-error', { message: 'Reload the board before importing — it changed in another tab.', dismissible: true });
        e.target.value = '';
        return;
      }
      handleImportFile(e.target.files && e.target.files[0]);
    });

    window.addEventListener('storage', function (e) {
      if (e.key !== null && e.key !== STORAGE_KEY) return;
      state.staleExternal = true;
      renderAll();
    });
  }

  function init() {
    try {
      cacheEls();
      loadBoard();
      bindEvents();
      renderAll();
      els.app.hidden = false;
    } catch (err) {
      document.body.innerHTML = '<p style="margin:24px;font:16px system-ui,sans-serif;">Fieldnote Board could not start. Please reload the page.</p>';
      /* eslint-disable-next-line no-console */
      console.error('Fieldnote Board failed to initialize:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
