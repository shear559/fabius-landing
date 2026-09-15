(function () {
  'use strict';

  var STORAGE_KEY = 'fieldnote-board:v1';
  var MAX_IMPORT_BYTES = 1024 * 1024;
  var STATUSES = ['todo', 'doing', 'done'];
  var PRIORITIES = ['low', 'medium', 'high'];
  var STATUS_LABELS = { todo: 'To do', doing: 'Doing', done: 'Done' };

  // ---------- state ----------
  var tasks = [];
  var isCorrupt = false;
  var corruptRaw = null;
  var conflictActive = false;
  var currentView = 'board';
  var editingId = null;
  var deletedTaskBuffer = null;
  var toastTimer = null;
  var modalTriggerEl = null;

  // ---------- dom refs ----------
  var appRoot = document.getElementById('app');
  var bannerRegion = document.getElementById('banner-region');
  var toastRegion = document.getElementById('toast-region');

  var statTotal = document.getElementById('stat-total');
  var statTodo = document.getElementById('stat-todo');
  var statDoing = document.getElementById('stat-doing');
  var statDone = document.getElementById('stat-done');

  var searchInput = document.getElementById('search');
  var filterStatus = document.getElementById('filter-status');
  var filterProject = document.getElementById('filter-project');
  var filterPriority = document.getElementById('filter-priority');
  var resultCount = document.getElementById('result-count');

  var boardViewEl = document.getElementById('board-view');
  var listViewEl = document.getElementById('list-view');
  var viewBoardBtn = document.getElementById('view-board-btn');
  var viewListBtn = document.getElementById('view-list-btn');

  var createTaskBtn = document.getElementById('create-task-btn');
  var exportBtn = document.getElementById('export-btn');
  var importInput = document.getElementById('import-file');

  var modalBackdrop = document.getElementById('modal-backdrop');
  var modalEl = document.getElementById('task-modal');
  var modalTitleEl = document.getElementById('modal-title');
  var modalCloseBtn = document.getElementById('modal-close-btn');
  var cancelTaskBtn = document.getElementById('cancel-task-btn');
  var taskForm = document.getElementById('task-form');
  var fieldId = document.getElementById('field-id');
  var fieldTitle = document.getElementById('field-title');
  var fieldProject = document.getElementById('field-project');
  var fieldStatus = document.getElementById('field-status');
  var fieldPriority = document.getElementById('field-priority');
  var fieldDueDate = document.getElementById('field-dueDate');
  var fieldTags = document.getElementById('field-tags');
  var projectDatalist = document.getElementById('project-suggestions');

  var taskCardTemplate = document.getElementById('task-card-template');

  var banners = new Map();

  // ---------- helpers ----------
  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function addDaysIso(n) {
    var d = new Date();
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function isValidDateString(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var parts = s.split('-').map(Number);
    var y = parts[0], m = parts[1], d = parts[2];
    if (m < 1 || m > 12) return false;
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  function formatDate(s) {
    var parts = s.split('-').map(Number);
    var dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  function isOverdue(s) {
    return s < todayIso();
  }

  function statusLabel(s) { return STATUS_LABELS[s] || s; }

  function generateId() {
    var id;
    var tries = 0;
    do {
      var rand = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now().toString(36));
      id = ('t-' + rand).slice(0, 80);
      tries++;
    } while (tasks.some(function (t) { return t.id === id; }) && tries < 20);
    return id;
  }

  // ---------- validation ----------
  function validateForm(values) {
    var errors = {};
    var title = values.title.trim();
    if (!title) errors.title = 'Title is required.';
    else if (title.length > 120) errors.title = 'Title must be 120 characters or fewer.';

    var project = values.project.trim();
    if (!project) errors.project = 'Project is required.';
    else if (project.length > 80) errors.project = 'Project must be 80 characters or fewer.';

    var dueDate = values.dueDate.trim();
    if (dueDate && !isValidDateString(dueDate)) errors.dueDate = 'Enter a real date as YYYY-MM-DD.';

    var status = STATUSES.indexOf(values.status) === -1 ? 'todo' : values.status;
    var priority = PRIORITIES.indexOf(values.priority) === -1 ? 'medium' : values.priority;

    var rawTagParts = values.tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    var seen = {};
    var tags = [];
    var tagError = null;
    for (var i = 0; i < rawTagParts.length; i++) {
      var t = rawTagParts[i];
      if (t.length > 24) { tagError = 'Each tag must be 24 characters or fewer.'; break; }
      var key = t.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      tags.push(t);
    }
    if (!tagError && tags.length > 8) tagError = 'Up to 8 tags are allowed.';
    if (tagError) errors.tags = tagError;

    return {
      errors: errors,
      data: { title: title, project: project, status: status, priority: priority, dueDate: dueDate, tags: tags.slice(0, 8) }
    };
  }

  function validateTaskRecord(t) {
    if (!t || typeof t !== 'object' || Array.isArray(t)) return 'A task must be an object.';
    if (typeof t.id !== 'string' || !t.id.trim() || t.id.length > 80) return 'Invalid or missing task id.';
    if (typeof t.title !== 'string' || t.title !== t.title.trim() || !t.title || t.title.length > 120) return 'Invalid title for task "' + t.id + '".';
    if (typeof t.project !== 'string' || t.project !== t.project.trim() || !t.project || t.project.length > 80) return 'Invalid project for task "' + t.id + '".';
    if (STATUSES.indexOf(t.status) === -1) return 'Unsupported status for task "' + t.id + '".';
    if (PRIORITIES.indexOf(t.priority) === -1) return 'Unsupported priority for task "' + t.id + '".';
    if (typeof t.dueDate !== 'string' || (t.dueDate !== '' && !isValidDateString(t.dueDate))) return 'Invalid due date for task "' + t.id + '".';
    if (!Array.isArray(t.tags) || t.tags.length > 8) return 'Invalid tags for task "' + t.id + '".';
    for (var i = 0; i < t.tags.length; i++) {
      var tag = t.tags[i];
      if (typeof tag !== 'string' || tag !== tag.trim() || !tag || tag.length > 24) return 'Invalid tag value for task "' + t.id + '".';
    }
    return null;
  }

  function validateBoardDocument(doc) {
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return { ok: false, error: 'The board data is not a valid document.' };
    if (doc.schemaVersion !== 1) return { ok: false, error: 'Unsupported schema version (expected 1).' };
    if (!Array.isArray(doc.tasks)) return { ok: false, error: 'The document is missing a tasks array.' };
    var seenIds = {};
    var cleanTasks = [];
    for (var i = 0; i < doc.tasks.length; i++) {
      var t = doc.tasks[i];
      var err = validateTaskRecord(t);
      if (err) return { ok: false, error: err };
      if (seenIds[t.id]) return { ok: false, error: 'Duplicate task id: "' + t.id + '".' };
      seenIds[t.id] = true;
      cleanTasks.push({ id: t.id, title: t.title, project: t.project, status: t.status, priority: t.priority, dueDate: t.dueDate, tags: t.tags.slice() });
    }
    return { ok: true, tasks: cleanTasks };
  }

  // ---------- seed data ----------
  function seedTasks() {
    function mk(id, title, project, status, priority, dueDate, tags) {
      return { id: id, title: title, project: project, status: status, priority: priority, dueDate: dueDate, tags: tags };
    }
    return [
      mk('seed-01', 'Draft chapter 2: methodology', 'Trail Data Atlas', 'doing', 'high', addDaysIso(5), ['writing', 'methods']),
      mk('seed-02', 'Collect GPS traces from spring survey', 'Trail Data Atlas', 'done', 'medium', addDaysIso(-10), ['fieldwork', 'gps']),
      mk('seed-03', 'Clean elevation dataset for outliers', 'Trail Data Atlas', 'todo', 'high', addDaysIso(2), ['data-cleaning']),
      mk('seed-04', 'Design cover figure for atlas', 'Trail Data Atlas', 'todo', 'low', '', ['design']),
      mk('seed-05', 'Pilot test trail-condition survey form', 'Survey Instrument Redesign', 'doing', 'medium', addDaysIso(7), ['survey', 'pilot']),
      mk('seed-06', 'Recruit second reviewer for instrument', 'Survey Instrument Redesign', 'todo', 'medium', '', ['review']),
      mk('seed-07', 'Translate consent form to Spanish', 'Community Outreach', 'done', 'medium', addDaysIso(-20), ['translation']),
      mk('seed-08', 'Schedule ranger station briefing', 'Community Outreach', 'todo', 'low', addDaysIso(14), ['outreach', 'scheduling'])
    ];
  }

  // ---------- persistence ----------
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, tasks: tasks }));
      return true;
    } catch (e) {
      return false;
    }
  }

  function enterCorruptState(raw) {
    isCorrupt = true;
    corruptRaw = raw;
    tasks = [];
  }

  function loadFromStorage() {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
    if (raw === null) {
      tasks = seedTasks();
      persist();
      return;
    }
    var doc;
    try {
      doc = JSON.parse(raw);
    } catch (e) {
      enterCorruptState(raw);
      return;
    }
    var result = validateBoardDocument(doc);
    if (!result.ok) {
      enterCorruptState(raw);
      return;
    }
    tasks = result.tasks;
  }

  function reloadFromStorageKey() {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
    if (raw === null) {
      tasks = [];
      isCorrupt = false;
      corruptRaw = null;
      return;
    }
    var doc;
    try {
      doc = JSON.parse(raw);
    } catch (e) {
      enterCorruptState(raw);
      return;
    }
    var result = validateBoardDocument(doc);
    if (!result.ok) {
      enterCorruptState(raw);
      return;
    }
    tasks = result.tasks;
    isCorrupt = false;
    corruptRaw = null;
  }

  function commitTasks(next) {
    tasks = next;
    var ok = persist();
    if (!ok) {
      showToast('This change could not be saved to storage (it may be full or unavailable). It is only in memory and will be lost on reload.', { persistent: true });
    }
    renderAll();
    return ok;
  }

  // ---------- banners ----------
  function setBanner(id, opts) {
    banners.set(id, opts);
    renderBanners();
  }
  function clearBanner(id) {
    banners.delete(id);
    renderBanners();
  }
  function renderBanners() {
    bannerRegion.textContent = '';
    banners.forEach(function (opts, id) {
      var div = document.createElement('div');
      div.className = 'banner' + (opts.type === 'danger' ? ' banner-danger' : opts.type === 'info' ? ' banner-info' : '');
      div.setAttribute('role', opts.type === 'danger' ? 'alert' : 'status');
      div.dataset.bannerId = id;

      var icon = document.createElement('span');
      icon.className = 'banner-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = '<svg width="20" height="20"><use href="#icon-warning"></use></svg>';
      div.appendChild(icon);

      var body = document.createElement('div');
      body.className = 'banner-body';
      var title = document.createElement('p');
      title.className = 'banner-title';
      title.textContent = opts.title;
      var text = document.createElement('p');
      text.className = 'banner-text';
      text.textContent = opts.text;
      body.appendChild(title);
      body.appendChild(text);

      if (opts.actions && opts.actions.length) {
        var actionsWrap = document.createElement('div');
        actionsWrap.className = 'banner-actions';
        opts.actions.forEach(function (a) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn ' + (a.primary ? 'btn-primary' : 'btn-ghost');
          btn.textContent = a.label;
          if (a.testId) btn.setAttribute('data-testid', a.testId);
          btn.addEventListener('click', a.onClick);
          actionsWrap.appendChild(btn);
        });
        body.appendChild(actionsWrap);
      }
      div.appendChild(body);
      bannerRegion.appendChild(div);
    });
  }

  function downloadText(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function showCorruptBanner() {
    setBanner('corrupt', {
      type: 'danger',
      title: "We couldn't read your saved board",
      text: "The data saved in this browser doesn't match the format Fieldnote Board expects. Your original data has not been changed or deleted.",
      actions: [
        { label: 'Download original data', onClick: function () { downloadText('fieldnote-board-corrupt-backup.txt', corruptRaw == null ? '' : corruptRaw, 'text/plain'); } },
        { label: 'Reset board', primary: true, testId: 'reset-board', onClick: handleResetBoard }
      ]
    });
  }

  function handleResetBoard() {
    var confirmed = window.confirm('Reset the board? This permanently discards the unreadable data in storage and starts a fresh sample board.');
    if (!confirmed) return;
    tasks = seedTasks();
    isCorrupt = false;
    corruptRaw = null;
    persist();
    clearBanner('corrupt');
    renderAll();
  }

  function showConflictBanner() {
    setBanner('conflict', {
      type: 'info',
      title: 'Updated in another tab',
      text: 'This board changed in another browser tab or window. Reload to see the latest data before making further edits.',
      actions: [
        { label: 'Reload board', primary: true, testId: 'reload-board', onClick: handleReloadBoard }
      ]
    });
  }

  function handleReloadBoard() {
    reloadFromStorageKey();
    conflictActive = false;
    clearBanner('conflict');
    if (isCorrupt) showCorruptBanner();
    renderAll();
  }

  function showImportErrorBanner(msg) {
    setBanner('import-error', {
      type: 'danger',
      title: 'Import was not applied',
      text: msg,
      actions: [
        { label: 'Dismiss', onClick: function () { clearBanner('import-error'); } }
      ]
    });
  }

  // ---------- toast ----------
  function showToast(message, opts) {
    opts = opts || {};
    toastRegion.textContent = '';
    clearTimeout(toastTimer);
    var div = document.createElement('div');
    div.className = 'toast';
    var span = document.createElement('span');
    span.textContent = message;
    div.appendChild(span);
    if (opts.actionLabel) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn';
      btn.textContent = opts.actionLabel;
      if (opts.testId) btn.setAttribute('data-testid', opts.testId);
      btn.addEventListener('click', function () {
        if (opts.onAction) opts.onAction();
        toastRegion.textContent = '';
      });
      div.appendChild(btn);
    }
    toastRegion.appendChild(div);
    if (!opts.persistent) {
      toastTimer = setTimeout(function () {
        if (toastRegion.contains(div)) toastRegion.textContent = '';
      }, opts.duration || 9000);
    }
  }

  // ---------- filtering / rendering ----------
  function getFilteredTasks() {
    var q = searchInput.value.trim().toLowerCase();
    var fStatus = filterStatus.value;
    var fProject = filterProject.value;
    var fPriority = filterPriority.value;
    return tasks.filter(function (t) {
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

  function updateStats() {
    statTotal.textContent = String(tasks.length);
    statTodo.textContent = String(tasks.filter(function (t) { return t.status === 'todo'; }).length);
    statDoing.textContent = String(tasks.filter(function (t) { return t.status === 'doing'; }).length);
    statDone.textContent = String(tasks.filter(function (t) { return t.status === 'done'; }).length);
  }

  function distinctProjects() {
    var set = {};
    var out = [];
    tasks.forEach(function (t) {
      if (!set[t.project]) { set[t.project] = true; out.push(t.project); }
    });
    out.sort(function (a, b) { return a.localeCompare(b); });
    return out;
  }

  function updateFilterProjectOptions() {
    var current = filterProject.value;
    var projects = distinctProjects();
    filterProject.textContent = '';
    var allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All projects';
    filterProject.appendChild(allOpt);
    projects.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p;
      o.textContent = p;
      filterProject.appendChild(o);
    });
    filterProject.value = projects.indexOf(current) !== -1 ? current : 'all';
  }

  function updateProjectSuggestions() {
    var projects = distinctProjects();
    projectDatalist.textContent = '';
    projects.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p;
      projectDatalist.appendChild(o);
    });
  }

  function updateControlAvailability() {
    createTaskBtn.disabled = isCorrupt || conflictActive;
    exportBtn.disabled = isCorrupt;
    importInput.disabled = isCorrupt || conflictActive;
  }

  function createTaskCardElement(task) {
    var node = taskCardTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.taskId = task.id;

    node.querySelector('.task-title').textContent = task.title;

    var prio = node.querySelector('.priority-badge');
    prio.classList.add('priority-' + task.priority);
    node.querySelector('.priority-text').textContent = task.priority;

    node.querySelector('.task-project').textContent = task.project;

    var dueWrap = node.querySelector('.task-due');
    var dueText = node.querySelector('.due-text');
    if (task.dueDate) {
      dueText.textContent = formatDate(task.dueDate);
      if (task.status !== 'done' && isOverdue(task.dueDate)) dueWrap.classList.add('overdue');
    } else {
      dueText.textContent = 'No due date';
    }

    var tagsList = node.querySelector('.task-tags');
    task.tags.forEach(function (tag) {
      var li = document.createElement('li');
      li.textContent = tag;
      tagsList.appendChild(li);
    });

    var statusSelect = node.querySelector('.status-select');
    STATUSES.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s;
      opt.textContent = statusLabel(s);
      if (s === task.status) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    statusSelect.setAttribute('aria-label', 'Status for ' + task.title);

    var editBtn = node.querySelector('[data-action="edit"]');
    editBtn.setAttribute('aria-label', 'Edit ' + task.title);
    var deleteBtn = node.querySelector('[data-action="delete"]');
    deleteBtn.setAttribute('aria-label', 'Delete ' + task.title);

    if (conflictActive || isCorrupt) {
      statusSelect.disabled = true;
      editBtn.disabled = true;
      deleteBtn.disabled = true;
    }

    return node;
  }

  function buildEmptyState(opts) {
    var div = document.createElement('div');
    div.className = 'empty-state';
    var h3 = document.createElement('h3');
    h3.textContent = opts.heading;
    var p = document.createElement('p');
    p.textContent = opts.text;
    div.appendChild(h3);
    div.appendChild(p);
    if (opts.showCreateCta) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-primary';
      btn.textContent = 'New task';
      btn.disabled = isCorrupt || conflictActive;
      btn.addEventListener('click', openCreateForm);
      div.appendChild(btn);
    }
    if (opts.showClearCta) {
      var btn2 = document.createElement('button');
      btn2.type = 'button';
      btn2.className = 'btn btn-ghost';
      btn2.textContent = 'Clear filters';
      btn2.addEventListener('click', clearFilters);
      div.appendChild(btn2);
    }
    return div;
  }

  function buildRecoveryPlaceholder() {
    return buildEmptyState({ heading: 'Board unavailable', text: 'Resolve the storage recovery notice above to continue.' });
  }

  function clearFilters() {
    searchInput.value = '';
    filterStatus.value = 'all';
    filterProject.value = 'all';
    filterPriority.value = 'all';
    renderAll();
  }

  function renderBoardView(filtered) {
    boardViewEl.textContent = '';
    if (isCorrupt) { boardViewEl.appendChild(buildRecoveryPlaceholder()); return; }
    if (tasks.length === 0) {
      boardViewEl.appendChild(buildEmptyState({ heading: 'No tasks yet', text: 'Create your first task to start tracking the Trail Data Atlas project.', showCreateCta: true }));
      return;
    }
    if (filtered.length === 0) {
      boardViewEl.appendChild(buildEmptyState({ heading: 'No matching tasks', text: 'Try a different search term or clear your filters.', showClearCta: true }));
      return;
    }
    STATUSES.forEach(function (status) {
      var col = document.createElement('div');
      col.className = 'board-column';
      var head = document.createElement('div');
      head.className = 'board-column-head';
      var h2 = document.createElement('h2');
      h2.textContent = statusLabel(status);
      var colTasks = filtered.filter(function (t) { return t.status === status; });
      var count = document.createElement('span');
      count.className = 'column-count';
      count.textContent = String(colTasks.length);
      head.appendChild(h2);
      head.appendChild(count);
      col.appendChild(head);

      var list = document.createElement('div');
      list.className = 'column-list';
      if (colTasks.length === 0) {
        var p = document.createElement('p');
        p.className = 'empty-state';
        p.textContent = 'No tasks.';
        list.appendChild(p);
      } else {
        colTasks.forEach(function (t) { list.appendChild(createTaskCardElement(t)); });
      }
      col.appendChild(list);
      boardViewEl.appendChild(col);
    });
  }

  function renderListView(filtered) {
    listViewEl.textContent = '';
    if (isCorrupt) { listViewEl.appendChild(buildRecoveryPlaceholder()); return; }
    if (tasks.length === 0) {
      listViewEl.appendChild(buildEmptyState({ heading: 'No tasks yet', text: 'Create your first task to start tracking the Trail Data Atlas project.', showCreateCta: true }));
      return;
    }
    if (filtered.length === 0) {
      listViewEl.appendChild(buildEmptyState({ heading: 'No matching tasks', text: 'Try a different search term or clear your filters.', showClearCta: true }));
      return;
    }
    filtered.forEach(function (t) { listViewEl.appendChild(createTaskCardElement(t)); });
  }

  function renderAll() {
    updateStats();
    updateFilterProjectOptions();
    updateProjectSuggestions();
    updateControlAvailability();
    var filtered = getFilteredTasks();
    resultCount.textContent = filtered.length + ' of ' + tasks.length + ' task' + (tasks.length === 1 ? '' : 's');
    if (currentView === 'board') {
      renderBoardView(filtered);
      listViewEl.textContent = '';
    } else {
      renderListView(filtered);
      boardViewEl.textContent = '';
    }
  }

  // ---------- view switch ----------
  function setView(v) {
    currentView = v;
    viewBoardBtn.classList.toggle('is-active', v === 'board');
    viewBoardBtn.setAttribute('aria-pressed', String(v === 'board'));
    viewListBtn.classList.toggle('is-active', v === 'list');
    viewListBtn.setAttribute('aria-pressed', String(v === 'list'));
    boardViewEl.hidden = v !== 'board';
    listViewEl.hidden = v !== 'list';
    renderAll();
  }

  // ---------- card actions ----------
  function onCardClick(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    var card = e.target.closest('.task-card');
    if (!card) return;
    var id = card.dataset.taskId;
    var action = btn.dataset.action;
    if (action === 'edit') openEditForm(id);
    else if (action === 'delete') handleDelete(id);
  }

  function onCardChange(e) {
    var select = e.target.closest('[data-action="status"]');
    if (!select || select.disabled) return;
    var card = e.target.closest('.task-card');
    if (!card) return;
    handleStatusChange(card.dataset.taskId, select.value);
  }

  function handleStatusChange(id, status) {
    if (isCorrupt || conflictActive) return;
    var next = tasks.map(function (t) { return t.id === id ? Object.assign({}, t, { status: status }) : t; });
    commitTasks(next);
  }

  function handleDelete(id) {
    if (isCorrupt || conflictActive) return;
    var index = tasks.findIndex(function (t) { return t.id === id; });
    if (index === -1) return;
    var task = tasks[index];
    var next = tasks.slice(0, index).concat(tasks.slice(index + 1));
    var ok = commitTasks(next);
    if (ok) {
      deletedTaskBuffer = { task: task, index: index };
      showToast('Deleted "' + task.title + '".', { actionLabel: 'Undo', testId: 'undo-delete', onAction: restoreDeleted, duration: 10000 });
    }
  }

  function restoreDeleted() {
    if (!deletedTaskBuffer) return;
    var task = deletedTaskBuffer.task;
    var index = deletedTaskBuffer.index;
    var next = tasks.slice();
    var insertAt = Math.min(index, next.length);
    next.splice(insertAt, 0, task);
    deletedTaskBuffer = null;
    commitTasks(next);
  }

  // ---------- modal / form ----------
  function clearFormErrors() {
    ['title', 'project', 'dueDate', 'tags'].forEach(function (f) {
      var el = document.getElementById('error-' + f);
      if (el) el.textContent = '';
      var input = document.getElementById('field-' + f);
      if (input) input.removeAttribute('aria-invalid');
    });
  }

  function showFormErrors(errors) {
    var firstField = null;
    Object.keys(errors).forEach(function (f) {
      var el = document.getElementById('error-' + f);
      if (el) el.textContent = errors[f];
      var input = document.getElementById('field-' + f);
      if (input) {
        input.setAttribute('aria-invalid', 'true');
        if (!firstField) firstField = input;
      }
    });
    if (firstField) firstField.focus();
  }

  function showModal() {
    modalTriggerEl = document.activeElement;
    modalBackdrop.hidden = false;
    document.addEventListener('keydown', onModalKeydown);
    fieldTitle.focus();
  }

  function hideModal() {
    modalBackdrop.hidden = true;
    document.removeEventListener('keydown', onModalKeydown);
    if (modalTriggerEl && typeof modalTriggerEl.focus === 'function') modalTriggerEl.focus();
    modalTriggerEl = null;
  }

  function onModalKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      hideModal();
      return;
    }
    if (e.key === 'Tab') {
      var focusables = Array.prototype.slice.call(
        modalEl.querySelectorAll('button, input, select, textarea, a[href]')
      ).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
      if (focusables.length === 0) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function openCreateForm() {
    if (isCorrupt || conflictActive) return;
    editingId = null;
    taskForm.reset();
    fieldId.value = '';
    fieldStatus.value = 'todo';
    fieldPriority.value = 'medium';
    clearFormErrors();
    modalTitleEl.textContent = 'New task';
    showModal();
  }

  function openEditForm(id) {
    if (isCorrupt || conflictActive) return;
    var task = tasks.find(function (t) { return t.id === id; });
    if (!task) return;
    editingId = id;
    fieldId.value = task.id;
    fieldTitle.value = task.title;
    fieldProject.value = task.project;
    fieldStatus.value = task.status;
    fieldPriority.value = task.priority;
    fieldDueDate.value = task.dueDate;
    fieldTags.value = task.tags.join(', ');
    clearFormErrors();
    modalTitleEl.textContent = 'Edit task';
    showModal();
  }

  function onFormSubmit(e) {
    e.preventDefault();
    if (isCorrupt || conflictActive) return;
    var values = {
      title: fieldTitle.value || '',
      project: fieldProject.value || '',
      status: fieldStatus.value,
      priority: fieldPriority.value,
      dueDate: fieldDueDate.value || '',
      tags: fieldTags.value || ''
    };
    var result = validateForm(values);
    clearFormErrors();
    if (Object.keys(result.errors).length) {
      showFormErrors(result.errors);
      return;
    }
    if (editingId) {
      var id = editingId;
      var next = tasks.map(function (t) { return t.id === id ? Object.assign({}, t, result.data) : t; });
      commitTasks(next);
    } else {
      var newTask = Object.assign({ id: generateId() }, result.data);
      commitTasks(tasks.concat([newTask]));
    }
    hideModal();
  }

  // ---------- export / import ----------
  function handleExport() {
    var doc = { schemaVersion: 1, tasks: tasks };
    downloadText('fieldnote-board-export.json', JSON.stringify(doc, null, 2), 'application/json');
  }

  function handleImportChange() {
    var file = importInput.files && importInput.files[0];
    if (!file) return;
    if (isCorrupt || conflictActive) { importInput.value = ''; return; }
    if (file.size > MAX_IMPORT_BYTES) {
      showImportErrorBanner('The selected file is larger than 1 MiB and was not imported.');
      importInput.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result || '');
      if (text.length > MAX_IMPORT_BYTES) {
        showImportErrorBanner('The selected file is larger than 1 MiB and was not imported.');
        importInput.value = '';
        return;
      }
      var doc;
      try {
        doc = JSON.parse(text);
      } catch (e) {
        showImportErrorBanner('The file is not valid JSON. The current board was not changed.');
        importInput.value = '';
        return;
      }
      var result = validateBoardDocument(doc);
      if (!result.ok) {
        showImportErrorBanner('Import rejected: ' + result.error + ' The current board was not changed.');
        importInput.value = '';
        return;
      }
      var confirmed = window.confirm(
        'Import ' + result.tasks.length + ' task(s) from "' + file.name + '"?\nThis will replace your current board of ' + tasks.length + ' task(s).'
      );
      if (!confirmed) { importInput.value = ''; return; }
      clearBanner('import-error');
      var ok = commitTasks(result.tasks);
      if (ok) {
        isCorrupt = false;
        corruptRaw = null;
        clearBanner('corrupt');
        showToast('Board imported from "' + file.name + '".');
      }
      importInput.value = '';
    };
    reader.onerror = function () {
      showImportErrorBanner('Could not read the selected file.');
      importInput.value = '';
    };
    reader.readAsText(file);
  }

  // ---------- cross-tab sync ----------
  function onStorageEvent(e) {
    if (e.key !== STORAGE_KEY) return;
    conflictActive = true;
    showConflictBanner();
    renderAll();
  }

  // ---------- init ----------
  function attachEventListeners() {
    createTaskBtn.addEventListener('click', openCreateForm);
    exportBtn.addEventListener('click', handleExport);
    importInput.addEventListener('change', handleImportChange);

    searchInput.addEventListener('input', renderAll);
    filterStatus.addEventListener('change', renderAll);
    filterProject.addEventListener('change', renderAll);
    filterPriority.addEventListener('change', renderAll);

    viewBoardBtn.addEventListener('click', function () { setView('board'); });
    viewListBtn.addEventListener('click', function () { setView('list'); });

    boardViewEl.addEventListener('click', onCardClick);
    boardViewEl.addEventListener('change', onCardChange);
    listViewEl.addEventListener('click', onCardClick);
    listViewEl.addEventListener('change', onCardChange);

    modalCloseBtn.addEventListener('click', hideModal);
    cancelTaskBtn.addEventListener('click', hideModal);
    modalBackdrop.addEventListener('click', function (e) {
      if (e.target === modalBackdrop) hideModal();
    });
    taskForm.addEventListener('submit', onFormSubmit);

    window.addEventListener('storage', onStorageEvent);
  }

  function init() {
    loadFromStorage();
    attachEventListeners();
    if (isCorrupt) showCorruptBanner();
    renderAll();
    appRoot.hidden = false;
  }

  init();
})();
