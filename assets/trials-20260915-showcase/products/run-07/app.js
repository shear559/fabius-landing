(function () {
  'use strict';

  var STORAGE_KEY = 'fieldnote-board:v1';
  var MAX_ID = 80;
  var MAX_TITLE = 120;
  var MAX_PROJECT = 80;
  var MAX_TAG = 24;
  var MAX_TAGS = 8;
  var MAX_IMPORT_BYTES = 1024 * 1024;
  var STATUSES = ['todo', 'doing', 'done'];
  var PRIORITIES = ['low', 'medium', 'high'];
  var STATUS_LABELS = { todo: 'To do', doing: 'Doing', done: 'Done' };
  var PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };

  var ICONS = {
    logo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4"/><path d="M8 12.2l2.4 2.4L16 9"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1-4.2L15.8 5 19 8.2 8.2 19z"/><path d="M13.2 6.8L17.2 10.8"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/><path d="M10 11v6M14 11v6"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10H4V6"/><path d="M4.6 15A8 8 0 1 0 6 8.4L4 10"/></svg>',
    board: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="4.5" height="16" rx="1"/><rect x="9.75" y="4" width="4.5" height="10" rx="1"/><rect x="16.5" y="4" width="4.5" height="13" rx="1"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M7 8l5-5 5 5"/><path d="M4 19h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v4"/><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v5"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h6l2 2h10v11H3z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v18"/><path d="M6 4h11l-2.5 4L17 12H6"/></svg>',
    searchEmpty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="6"/><path d="M15 15l5 5"/></svg>',
    boxEmpty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5z"/><path d="M3 8v9l9 5 9-5V8"/><path d="M12 13v9"/></svg>'
  };

  function injectIcons(root) {
    var nodes = root.querySelectorAll('[data-icon]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-icon');
      if (ICONS[key]) nodes[i].innerHTML = ICONS[key];
    }
  }

  // ---------- Validation helpers ----------

  function isTrimmedString(v, max) {
    return typeof v === 'string' && v.length > 0 && v.length <= max && v.trim() === v;
  }

  function isValidDateString(s) {
    if (typeof s !== 'string') return false;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return false;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
    var dt = new Date(Date.UTC(y, mo - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  }

  function isValidTaskShape(t) {
    if (!t || typeof t !== 'object') return false;
    if (!isTrimmedString(t.id, MAX_ID)) return false;
    if (!isTrimmedString(t.title, MAX_TITLE)) return false;
    if (!isTrimmedString(t.project, MAX_PROJECT)) return false;
    if (STATUSES.indexOf(t.status) === -1) return false;
    if (PRIORITIES.indexOf(t.priority) === -1) return false;
    if (t.dueDate !== '' && !isValidDateString(t.dueDate)) return false;
    if (!Array.isArray(t.tags) || t.tags.length > MAX_TAGS) return false;
    for (var i = 0; i < t.tags.length; i++) {
      if (!isTrimmedString(t.tags[i], MAX_TAG)) return false;
    }
    return true;
  }

  function isBoardValid(parsed) {
    if (!parsed || typeof parsed !== 'object') return false;
    if (parsed.schemaVersion !== 1) return false;
    if (!Array.isArray(parsed.tasks)) return false;
    var ids = Object.create(null);
    for (var i = 0; i < parsed.tasks.length; i++) {
      var t = parsed.tasks[i];
      if (!isValidTaskShape(t)) return false;
      if (ids[t.id]) return false;
      ids[t.id] = true;
    }
    return true;
  }

  function normalizeTags(raw) {
    var parts = raw.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var key = parts[i].toLowerCase();
      if (!seen[key]) { seen[key] = true; out.push(parts[i]); }
    }
    return out;
  }

  function generateId(existingTasks) {
    var uuid = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));
    var id = ('task-' + uuid).slice(0, MAX_ID);
    var taken = {};
    existingTasks.forEach(function (t) { taken[t.id] = true; });
    while (taken[id]) {
      id = ('task-' + Math.random().toString(36).slice(2, 10)).slice(0, MAX_ID);
    }
    return id;
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function formatDueDate(iso) {
    var parts = iso.split('-');
    var d = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  // ---------- Seed data ----------

  function seedTasks() {
    return [
      { id: 'seed-1', title: 'Draft introduction section', project: 'Reef Resilience Manuscript', status: 'doing', priority: 'high', dueDate: '2026-09-18', tags: ['writing', 'draft'] },
      { id: 'seed-2', title: 'Collect coral bleaching survey data', project: 'Reef Resilience Manuscript', status: 'done', priority: 'medium', dueDate: '2026-08-30', tags: ['data', 'fieldwork'] },
      { id: 'seed-3', title: 'Run statistical analysis on transect data', project: 'Reef Resilience Manuscript', status: 'doing', priority: 'high', dueDate: '2026-09-10', tags: ['stats', 'analysis'] },
      { id: 'seed-4', title: 'Design figures for results section', project: 'Reef Resilience Manuscript', status: 'todo', priority: 'medium', dueDate: '2026-09-25', tags: ['figures', 'design'] },
      { id: 'seed-5', title: 'Select target journal and format references', project: 'Reef Resilience Manuscript', status: 'todo', priority: 'low', dueDate: '', tags: ['submission'] },
      { id: 'seed-6', title: 'Compile budget summary for Q3', project: 'Spring Grant Report', status: 'done', priority: 'medium', dueDate: '2026-09-01', tags: ['budget', 'reporting'] },
      { id: 'seed-7', title: 'Write progress narrative for funder', project: 'Spring Grant Report', status: 'doing', priority: 'high', dueDate: '2026-09-16', tags: ['writing', 'funder'] },
      { id: 'seed-8', title: 'Get co-author sign-off on final draft', project: 'Spring Grant Report', status: 'todo', priority: 'high', dueDate: '2026-09-12', tags: ['review', 'signoff'] }
    ];
  }

  // ---------- State ----------

  var state = {
    tasks: [],
    filters: { search: '', status: 'all', project: 'all', priority: 'all' },
    view: 'board',
    lastDeleted: null,
    corrupt: null,
    saveFailed: false,
    conflict: false
  };

  var lastWrittenRaw = null;
  var modalTrigger = null;

  // ---------- Storage ----------

  function writeStorage(raw) {
    try {
      window.localStorage.setItem(STORAGE_KEY, raw);
      lastWrittenRaw = raw;
      state.saveFailed = false;
      return true;
    } catch (e) {
      state.saveFailed = true;
      return false;
    }
  }

  function persist() {
    var raw = JSON.stringify({ schemaVersion: 1, tasks: state.tasks });
    return writeStorage(raw);
  }

  function loadBoard() {
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
    if (raw === null) {
      state.tasks = seedTasks();
      persist();
      return;
    }
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      state.corrupt = { raw: raw, reason: 'The saved data is not valid JSON.' };
      return;
    }
    if (!isBoardValid(parsed)) {
      state.corrupt = { raw: raw, reason: 'The saved data does not match the expected board format.' };
      return;
    }
    state.tasks = parsed.tasks;
    lastWrittenRaw = raw;
  }

  // ---------- DOM refs ----------

  var appEl = document.getElementById('app');
  var recoveryEl = document.getElementById('recovery-screen');
  var bannerRegion = document.getElementById('banner-region');
  var mainRegion = document.getElementById('main-region');
  var countLine = document.getElementById('count-line');
  var searchInput = document.getElementById('search');
  var filterStatus = document.getElementById('filter-status');
  var filterProject = document.getElementById('filter-project');
  var filterPriority = document.getElementById('filter-priority');
  var createTaskBtn = document.querySelector('[data-testid="create-task"]');
  var viewBoardBtn = document.querySelector('[data-testid="view-board"]');
  var viewListBtn = document.querySelector('[data-testid="view-list"]');
  var exportBtn = document.querySelector('[data-testid="export"]');
  var importInput = document.querySelector('[data-testid="import-file"]');
  var modalOverlay = document.getElementById('modal-overlay');
  var taskForm = document.querySelector('[data-testid="task-form"]');
  var formTitleEl = document.getElementById('form-title');
  var closeFormBtn = document.querySelector('[data-testid="close-form"]');
  var cancelTaskBtn = document.querySelector('[data-testid="cancel-task"]');
  var projectSuggestions = document.getElementById('project-suggestions');
  var cardTemplate = document.getElementById('task-card-template');

  // ---------- Banners ----------

  function clearBanners() {
    bannerRegion.innerHTML = '';
  }

  function addBanner(kind, iconKey, message, actions) {
    var div = document.createElement('div');
    div.className = 'banner banner-' + kind;
    if (kind === 'error') div.setAttribute('role', 'alert'); else div.setAttribute('role', 'status');
    var icon = document.createElement('span');
    icon.className = 'icon banner-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = ICONS[iconKey] || ICONS.info;
    div.appendChild(icon);
    var p = document.createElement('p');
    p.textContent = message;
    div.appendChild(p);
    if (actions) {
      actions.forEach(function (a) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-secondary';
        btn.textContent = a.label;
        if (a.testId) btn.setAttribute('data-testid', a.testId);
        btn.addEventListener('click', a.onClick);
        div.appendChild(btn);
      });
    }
    bannerRegion.appendChild(div);
    return div;
  }

  function renderBanners() {
    clearBanners();

    if (state.conflict) {
      addBanner('warn', 'info', 'This board was updated in another tab. Reload to see the latest data before making changes.', [
        { label: 'Reload board', testId: 'reload-board', onClick: onReloadBoard }
      ]);
    }

    if (state.saveFailed) {
      addBanner('error', 'alert', "Your last change could not be saved to this browser's storage. It is kept in memory only and will be lost on reload.", []);
    }

    if (state.lastDeleted) {
      addBanner('info', 'undo', 'Deleted "' + state.lastDeleted.task.title + '".', [
        { label: 'Undo', testId: 'undo-delete', onClick: onUndoDelete }
      ]);
    }

    if (state.importNotice) {
      addBanner(state.importNotice.kind, state.importNotice.kind === 'error' ? 'alert' : 'info', state.importNotice.message, []);
    }
  }

  function onReloadBoard() {
    state.conflict = false;
    state.corrupt = null;
    loadBoard();
    render();
  }

  function onUndoDelete() {
    if (!state.lastDeleted) return;
    var idx = Math.min(state.lastDeleted.index, state.tasks.length);
    state.tasks.splice(idx, 0, state.lastDeleted.task);
    var restoredId = state.lastDeleted.task.id;
    state.lastDeleted = null;
    persist();
    render();
    var editBtn = mainRegion.querySelector('[data-task-id="' + cssEscape(restoredId) + '"] [data-action="edit"]');
    if (editBtn) editBtn.focus(); else createTaskBtn.focus();
  }

  function cssEscape(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/["\\]/g, '\\$&');
  }

  // ---------- Overview stats ----------

  function renderOverviewStats() {
    var total = state.tasks.length;
    var todo = 0, doing = 0, done = 0, overdue = 0;
    var today = todayISO();
    state.tasks.forEach(function (t) {
      if (t.status === 'todo') todo++;
      else if (t.status === 'doing') doing++;
      else if (t.status === 'done') done++;
      if (t.dueDate && t.dueDate < today && t.status !== 'done') overdue++;
    });
    setStat('total', total);
    setStat('todo', todo);
    setStat('doing', doing);
    setStat('done', done);
    setStat('overdue', overdue);
  }

  function setStat(key, value) {
    var el = document.querySelector('.stat-tile[data-stat="' + key + '"] .stat-value');
    if (el) el.textContent = String(value);
  }

  // ---------- Filters ----------

  function getUniqueProjects() {
    var seen = Object.create(null);
    var out = [];
    state.tasks.forEach(function (t) {
      if (!seen[t.project]) { seen[t.project] = true; out.push(t.project); }
    });
    out.sort(function (a, b) { return a.localeCompare(b); });
    return out;
  }

  function updateProjectFilterOptions() {
    var projects = getUniqueProjects();
    var current = filterProject.value || 'all';
    filterProject.innerHTML = '';
    var allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All projects';
    filterProject.appendChild(allOpt);
    projects.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      filterProject.appendChild(opt);
    });
    if (current !== 'all' && projects.indexOf(current) === -1) {
      current = 'all';
      state.filters.project = 'all';
    }
    filterProject.value = current;

    projectSuggestions.innerHTML = '';
    projects.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p;
      projectSuggestions.appendChild(opt);
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
        var haystack = (t.title + ' ' + t.project + ' ' + t.tags.join(' ')).toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function renderCounts(filteredCount) {
    var total = state.tasks.length;
    if (total === 0) {
      countLine.textContent = 'No tasks yet.';
    } else {
      countLine.textContent = 'Showing ' + filteredCount + ' of ' + total + ' task' + (total === 1 ? '' : 's') + '.';
    }
  }

  function hasActiveFilters() {
    var f = state.filters;
    return f.search.trim() !== '' || f.status !== 'all' || f.project !== 'all' || f.priority !== 'all';
  }

  function clearFilters() {
    state.filters = { search: '', status: 'all', project: 'all', priority: 'all' };
    searchInput.value = '';
    filterStatus.value = 'all';
    filterPriority.value = 'all';
    render();
  }

  // ---------- Card building ----------

  function buildCardElement(task) {
    var frag = cardTemplate.content.cloneNode(true);
    var article = frag.querySelector('.task-card');
    article.setAttribute('data-task-id', task.id);
    article.classList.add('priority-' + task.priority);

    article.querySelector('.task-title').textContent = task.title;

    var flag = article.querySelector('.priority-flag');
    flag.innerHTML = ICONS.flag;
    var flagLabel = document.createElement('span');
    flagLabel.className = 'visually-hidden';
    flagLabel.textContent = 'Priority: ' + PRIORITY_LABELS[task.priority];
    flag.parentNode.insertBefore(flagLabel, flag.nextSibling);

    article.querySelector('.task-project-name').textContent = task.project;
    article.querySelector('[data-icon="folder"]').innerHTML = ICONS.folder;
    article.querySelector('[data-icon="calendar"]').innerHTML = ICONS.calendar;

    var dueTextEl = article.querySelector('.task-due-text');
    var dueWrap = article.querySelector('.task-due');
    var today = todayISO();
    if (task.dueDate === '') {
      dueTextEl.textContent = 'No due date';
    } else {
      var isOverdue = task.dueDate < today && task.status !== 'done';
      dueTextEl.textContent = (isOverdue ? 'Overdue: ' : 'Due ') + formatDueDate(task.dueDate);
      if (isOverdue) dueWrap.classList.add('overdue');
    }

    var tagsList = article.querySelector('.task-tags');
    task.tags.forEach(function (tag) {
      var li = document.createElement('li');
      li.textContent = tag;
      tagsList.appendChild(li);
    });

    var statusSelect = article.querySelector('[data-action="status"]');
    STATUSES.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s;
      opt.textContent = STATUS_LABELS[s];
      if (s === task.status) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    statusSelect.setAttribute('aria-label', 'Status for ' + task.title);

    var editBtn = article.querySelector('[data-action="edit"]');
    var deleteBtn = article.querySelector('[data-action="delete"]');
    editBtn.setAttribute('aria-label', 'Edit ' + task.title);
    deleteBtn.setAttribute('aria-label', 'Delete ' + task.title);

    if (state.conflict) {
      article.setAttribute('data-conflict-locked', 'true');
      statusSelect.disabled = true;
      editBtn.disabled = true;
      deleteBtn.disabled = true;
    }

    injectIcons(article);
    return article;
  }

  function sortForBoard(tasks) {
    var order = { high: 0, medium: 1, low: 2 };
    return tasks.slice().sort(function (a, b) {
      if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
      return a.title.localeCompare(b.title);
    });
  }

  function sortForList(tasks) {
    return tasks.slice().sort(function (a, b) {
      var da = a.dueDate || '9999-99-99';
      var db = b.dueDate || '9999-99-99';
      if (da !== db) return da < db ? -1 : 1;
      var order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
  }

  function renderEmptyState() {
    var div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML =
      '<span class="icon" aria-hidden="true">' + ICONS.boxEmpty + '</span>' +
      '<h2>No tasks on this board yet</h2>' +
      '<p>Create your first task to start tracking the publication.</p>';
    mainRegion.appendChild(div);
  }

  function renderNoResults() {
    var div = document.createElement('div');
    div.className = 'no-results';
    div.innerHTML =
      '<span class="icon" aria-hidden="true">' + ICONS.searchEmpty + '</span>' +
      '<h2>No matching tasks</h2>' +
      '<p>Try a different search term or clear filters to see all tasks.</p>';
    var clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn btn-secondary';
    clearBtn.style.marginTop = '12px';
    clearBtn.textContent = 'Clear filters';
    clearBtn.addEventListener('click', clearFilters);
    div.appendChild(clearBtn);
    mainRegion.appendChild(div);
  }

  function renderMain() {
    mainRegion.innerHTML = '';
    var filtered = getFilteredTasks();
    renderCounts(filtered.length);

    if (state.tasks.length === 0) {
      renderEmptyState();
      return;
    }
    if (filtered.length === 0) {
      renderNoResults();
      return;
    }

    if (state.view === 'board') {
      var columns = document.createElement('div');
      columns.className = 'board-columns';
      STATUSES.forEach(function (statusKey) {
        var colTasks = sortForBoard(filtered.filter(function (t) { return t.status === statusKey; }));
        var col = document.createElement('section');
        col.className = 'board-column';
        col.setAttribute('aria-label', STATUS_LABELS[statusKey] + ' column');
        var head = document.createElement('div');
        head.className = 'board-column-head';
        head.innerHTML = '<h2>' + STATUS_LABELS[statusKey] + '</h2><span class="column-count">' + colTasks.length + '</span>';
        col.appendChild(head);
        var body = document.createElement('div');
        body.className = 'board-column-body';
        if (colTasks.length === 0) {
          var none = document.createElement('p');
          none.className = 'hint';
          none.style.margin = '0';
          none.style.padding = '0 8px';
          none.textContent = 'No tasks here.';
          body.appendChild(none);
        } else {
          colTasks.forEach(function (t) { body.appendChild(buildCardElement(t)); });
        }
        col.appendChild(body);
        columns.appendChild(col);
      });
      mainRegion.appendChild(columns);
    } else {
      var rows = document.createElement('div');
      rows.className = 'list-rows';
      sortForList(filtered).forEach(function (t) { rows.appendChild(buildCardElement(t)); });
      mainRegion.appendChild(rows);
    }
  }

  // ---------- Recovery screen ----------

  function renderRecovery() {
    appEl.hidden = true;
    recoveryEl.hidden = false;
    document.getElementById('recovery-message').textContent = state.corrupt.reason + ' Nothing has been changed or overwritten.';
  }

  function downloadCorruptBackup() {
    var blob = new Blob([state.corrupt.raw], { type: 'text/plain' });
    triggerDownload(blob, 'fieldnote-board-corrupt-backup.txt');
  }

  function resetBoard() {
    var ok = window.confirm('Reset the board? This discards the unreadable saved data and starts a new local board. This cannot be undone.');
    if (!ok) return;
    state.corrupt = null;
    state.tasks = seedTasks();
    persist();
    render();
  }

  // ---------- Render orchestration ----------

  function render() {
    if (state.corrupt) {
      renderRecovery();
      return;
    }
    recoveryEl.hidden = true;
    appEl.hidden = false;

    createTaskBtn.disabled = state.conflict;
    importInput.disabled = state.conflict;

    renderBanners();
    renderOverviewStats();
    updateProjectFilterOptions();
    renderMain();
  }

  // ---------- Modal / form ----------

  function openForm(task) {
    modalTrigger = document.activeElement;
    taskForm.reset();
    clearFormErrors();
    if (task) {
      formTitleEl.textContent = 'Edit task';
      taskForm.elements.id.value = task.id;
      taskForm.elements.title.value = task.title;
      taskForm.elements.project.value = task.project;
      taskForm.elements.status.value = task.status;
      taskForm.elements.priority.value = task.priority;
      taskForm.elements.dueDate.value = task.dueDate;
      taskForm.elements.tags.value = task.tags.join(', ');
    } else {
      formTitleEl.textContent = 'New task';
      taskForm.elements.id.value = '';
      taskForm.elements.priority.value = 'medium';
      taskForm.elements.status.value = 'todo';
    }
    modalOverlay.hidden = false;
    document.addEventListener('keydown', onModalKeydown, true);
    taskForm.elements.title.focus();
  }

  function closeForm() {
    modalOverlay.hidden = true;
    document.removeEventListener('keydown', onModalKeydown, true);
    if (modalTrigger && typeof modalTrigger.focus === 'function') modalTrigger.focus();
    modalTrigger = null;
  }

  function onModalKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeForm();
      return;
    }
    if (e.key === 'Tab') {
      var focusable = modalOverlay.querySelectorAll('button, input, select, textarea, [href]');
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function clearFormErrors() {
    ['title', 'project', 'dueDate', 'tags'].forEach(function (name) {
      var err = document.getElementById('err-' + name);
      if (err) err.textContent = '';
      var row = err ? err.closest('.form-row') : null;
      if (row) row.classList.remove('has-error');
    });
  }

  function setFieldError(name, message) {
    var err = document.getElementById('err-' + name);
    if (!err) return;
    err.textContent = message;
    var row = err.closest('.form-row');
    if (row) row.classList.add('has-error');
  }

  function onFormSubmit(e) {
    e.preventDefault();
    if (blockedByConflict()) return;
    clearFormErrors();

    var fd = new FormData(taskForm);
    var id = String(fd.get('id') || '').trim();
    var title = String(fd.get('title') || '').trim();
    var project = String(fd.get('project') || '').trim();
    var status = String(fd.get('status') || '');
    var priority = String(fd.get('priority') || '');
    var dueDate = String(fd.get('dueDate') || '').trim();
    var tagsRaw = String(fd.get('tags') || '');

    var hasError = false;
    var firstInvalid = null;

    if (title === '') {
      setFieldError('title', 'Title is required.');
      hasError = true; firstInvalid = firstInvalid || taskForm.elements.title;
    } else if (title.length > MAX_TITLE) {
      setFieldError('title', 'Title must be ' + MAX_TITLE + ' characters or fewer.');
      hasError = true; firstInvalid = firstInvalid || taskForm.elements.title;
    }

    if (project === '') {
      setFieldError('project', 'Project is required.');
      hasError = true; firstInvalid = firstInvalid || taskForm.elements.project;
    } else if (project.length > MAX_PROJECT) {
      setFieldError('project', 'Project must be ' + MAX_PROJECT + ' characters or fewer.');
      hasError = true; firstInvalid = firstInvalid || taskForm.elements.project;
    }

    if (dueDate !== '' && !isValidDateString(dueDate)) {
      setFieldError('dueDate', 'Enter a real calendar date (YYYY-MM-DD).');
      hasError = true; firstInvalid = firstInvalid || taskForm.elements.dueDate;
    }

    var tags = normalizeTags(tagsRaw);
    var overlongTag = tags.find(function (t) { return t.length > MAX_TAG; });
    if (overlongTag) {
      setFieldError('tags', 'Each tag must be ' + MAX_TAG + ' characters or fewer.');
      hasError = true; firstInvalid = firstInvalid || taskForm.elements.tags;
    } else if (tags.length > MAX_TAGS) {
      setFieldError('tags', 'Use up to ' + MAX_TAGS + ' tags.');
      hasError = true; firstInvalid = firstInvalid || taskForm.elements.tags;
    }

    if (STATUSES.indexOf(status) === -1) status = 'todo';
    if (PRIORITIES.indexOf(priority) === -1) priority = 'medium';

    if (hasError) {
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    if (id) {
      var existing = state.tasks.find(function (t) { return t.id === id; });
      if (existing) {
        existing.title = title;
        existing.project = project;
        existing.status = status;
        existing.priority = priority;
        existing.dueDate = dueDate;
        existing.tags = tags;
      }
    } else {
      state.tasks.push({
        id: generateId(state.tasks),
        title: title,
        project: project,
        status: status,
        priority: priority,
        dueDate: dueDate,
        tags: tags
      });
    }

    state.lastDeleted = null;
    state.importNotice = null;
    persist();
    closeForm();
    render();
  }

  // ---------- Delete / status ----------

  function blockedByConflict() {
    if (!state.conflict) return false;
    var btn = document.querySelector('[data-testid="reload-board"]');
    if (btn) btn.focus();
    return true;
  }

  function handleDelete(taskId) {
    if (blockedByConflict()) return;
    var idx = state.tasks.findIndex(function (t) { return t.id === taskId; });
    if (idx === -1) return;
    var removed = state.tasks.splice(idx, 1)[0];
    state.lastDeleted = { task: removed, index: idx };
    state.importNotice = null;
    persist();
    render();
    var undoBtn = document.querySelector('[data-testid="undo-delete"]');
    if (undoBtn) undoBtn.focus();
  }

  function handleStatusChange(taskId, newStatus) {
    if (blockedByConflict()) return;
    if (STATUSES.indexOf(newStatus) === -1) return;
    var t = state.tasks.find(function (x) { return x.id === taskId; });
    if (!t) return;
    t.status = newStatus;
    persist();
    render();
    var sel = mainRegion.querySelector('[data-task-id="' + cssEscape(taskId) + '"] [data-action="status"]');
    if (sel) sel.focus();
  }

  mainRegion.addEventListener('click', function (e) {
    var editBtn = e.target.closest('[data-action="edit"]');
    var delBtn = e.target.closest('[data-action="delete"]');
    if (editBtn) {
      var card = editBtn.closest('.task-card');
      var taskId = card.getAttribute('data-task-id');
      var task = state.tasks.find(function (t) { return t.id === taskId; });
      if (task) openForm(task);
      return;
    }
    if (delBtn) {
      var card2 = delBtn.closest('.task-card');
      handleDelete(card2.getAttribute('data-task-id'));
    }
  });

  mainRegion.addEventListener('change', function (e) {
    var select = e.target.closest('[data-action="status"]');
    if (!select) return;
    var card = select.closest('.task-card');
    handleStatusChange(card.getAttribute('data-task-id'), select.value);
  });

  // ---------- Export / Import ----------

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

  exportBtn.addEventListener('click', function () {
    var payload = JSON.stringify({ schemaVersion: 1, tasks: state.tasks }, null, 2);
    var blob = new Blob([payload], { type: 'application/json' });
    triggerDownload(blob, 'fieldnote-board-export.json');
  });

  document.querySelector('[data-testid="download-corrupt-backup"]').addEventListener('click', downloadCorruptBackup);
  document.querySelector('[data-testid="reset-board"]').addEventListener('click', resetBoard);

  function setImportNotice(kind, message) {
    state.importNotice = { kind: kind, message: message };
    renderBanners();
  }

  importInput.addEventListener('change', function () {
    var file = importInput.files && importInput.files[0];
    if (!file) return;

    if (blockedByConflict()) {
      importInput.value = '';
      return;
    }

    if (file.size > MAX_IMPORT_BYTES) {
      setImportNotice('error', 'Import failed: file is larger than 1 MiB.');
      importInput.value = '';
      return;
    }

    var reader = new FileReader();
    reader.onerror = function () {
      setImportNotice('error', 'Import failed: could not read the file.');
      importInput.value = '';
    };
    reader.onload = function () {
      var text = String(reader.result);
      var parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        setImportNotice('error', 'Import failed: the file is not valid JSON.');
        importInput.value = '';
        return;
      }
      if (!isBoardValid(parsed)) {
        setImportNotice('error', 'Import failed: the file does not match the expected board format (schema version, task fields, enums, dates, tags or duplicate IDs).');
        importInput.value = '';
        return;
      }
      var incoming = parsed.tasks;
      var ok = window.confirm('Import ' + incoming.length + ' task(s) and replace the current board of ' + state.tasks.length + ' task(s)? This cannot be undone.');
      if (!ok) {
        importInput.value = '';
        return;
      }
      state.tasks = incoming;
      state.lastDeleted = null;
      persist();
      setImportNotice('info', 'Import succeeded: board replaced with ' + incoming.length + ' task(s).');
      render();
      importInput.value = '';
    };
    reader.readAsText(file);
  });

  // ---------- Toolbar events ----------

  searchInput.addEventListener('input', function () {
    state.filters.search = searchInput.value;
    renderMain();
    renderCounts(getFilteredTasks().length);
  });
  filterStatus.addEventListener('change', function () {
    state.filters.status = filterStatus.value;
    renderMain();
  });
  filterProject.addEventListener('change', function () {
    state.filters.project = filterProject.value;
    renderMain();
  });
  filterPriority.addEventListener('change', function () {
    state.filters.priority = filterPriority.value;
    renderMain();
  });

  function setView(view) {
    state.view = view;
    viewBoardBtn.setAttribute('aria-pressed', String(view === 'board'));
    viewListBtn.setAttribute('aria-pressed', String(view === 'list'));
    renderMain();
  }
  viewBoardBtn.addEventListener('click', function () { setView('board'); });
  viewListBtn.addEventListener('click', function () { setView('list'); });

  createTaskBtn.addEventListener('click', function () {
    if (blockedByConflict()) return;
    openForm(null);
  });
  closeFormBtn.addEventListener('click', closeForm);
  cancelTaskBtn.addEventListener('click', closeForm);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeForm();
  });
  taskForm.addEventListener('submit', onFormSubmit);

  // ---------- Cross-tab conflict ----------

  window.addEventListener('storage', function (e) {
    if (e.key !== STORAGE_KEY) return;
    if (e.newValue === lastWrittenRaw) return;
    state.conflict = true;
    render();
  });

  // ---------- Init ----------

  loadBoard();
  injectIcons(document);
  render();
})();
