/* Fieldnote Board — app.js
 * Vanilla JS, no build step, no dependencies, no network calls.
 * All persistence goes through localStorage under STORAGE_KEY.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "fieldnote-board:v1";
  var MAX_IMPORT_BYTES = 1024 * 1024; // 1 MiB
  var STATUSES = ["todo", "doing", "done"];
  var PRIORITIES = ["low", "medium", "high"];
  var STATUS_LABELS = { todo: "To do", doing: "Doing", done: "Done" };
  var PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High" };

  // ---------------------------------------------------------------------
  // Application state (in-memory working copy)
  // ---------------------------------------------------------------------
  var state = {
    tasks: [],
    mode: "normal", // "normal" | "corrupt" | "conflict"
    corruptRaw: null,
    saveError: false,
    lastDeleted: null, // { task, index }
    lastWrittenRaw: null,
    filters: { search: "", status: "all", project: "all", priority: "all" },
    modalOpener: null,
    editingTaskId: null
  };

  // ---------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------

  function byteLength(str) {
    return new TextEncoder().encode(str).length;
  }

  function genId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function isRealCalendarDate(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (!m) return false;
    var y = parseInt(m[1], 10);
    var mo = parseInt(m[2], 10);
    var d = parseInt(m[3], 10);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
    var dt = new Date(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
  }

  function escapeForAttr(str) {
    // Used only for building strings passed via setAttribute / textContent,
    // never innerHTML, so this is a defensive no-op kept for clarity.
    return String(str);
  }

  function normalizeTagsFromInput(text) {
    if (!text) return { tags: [], error: null };
    var raw = text.split(",").map(function (t) { return t.trim(); }).filter(function (t) { return t.length > 0; });
    var seen = {};
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var t = raw[i];
      if (t.length > 24) {
        return { tags: null, error: "Tags must be 24 characters or fewer." };
      }
      var key = t.toLowerCase();
      if (!seen[key]) {
        seen[key] = true;
        out.push(t);
      }
    }
    if (out.length > 8) {
      return { tags: null, error: "Up to 8 tags are allowed." };
    }
    return { tags: out, error: null };
  }

  // ---------------------------------------------------------------------
  // Validation shared by: startup load, import, and (loosely) form save
  // ---------------------------------------------------------------------

  function validateTaskShape(task, idSet) {
    if (!task || typeof task !== "object") return "Task is not an object.";
    if (typeof task.id !== "string" || task.id.trim() === "" || task.id.length > 80) {
      return "Task id must be a non-empty string of at most 80 characters.";
    }
    if (idSet.has(task.id)) return "Duplicate task id: " + task.id;
    if (typeof task.title !== "string" || task.title.trim() === "" || task.title.length > 120) {
      return "Task \"" + task.id + "\" has an invalid title.";
    }
    if (typeof task.project !== "string" || task.project.trim() === "" || task.project.length > 80) {
      return "Task \"" + task.id + "\" has an invalid project.";
    }
    if (STATUSES.indexOf(task.status) === -1) {
      return "Task \"" + task.id + "\" has an invalid status.";
    }
    if (PRIORITIES.indexOf(task.priority) === -1) {
      return "Task \"" + task.id + "\" has an invalid priority.";
    }
    if (typeof task.dueDate !== "string" || (task.dueDate !== "" && !isRealCalendarDate(task.dueDate))) {
      return "Task \"" + task.id + "\" has an invalid due date.";
    }
    if (!Array.isArray(task.tags) || task.tags.length > 8) {
      return "Task \"" + task.id + "\" has an invalid tags list.";
    }
    for (var i = 0; i < task.tags.length; i++) {
      var tag = task.tags[i];
      if (typeof tag !== "string" || tag.trim() === "" || tag.length > 24) {
        return "Task \"" + task.id + "\" has an invalid tag.";
      }
    }
    return null;
  }

  function normalizeTask(task) {
    return {
      id: task.id,
      title: task.title.trim(),
      project: task.project.trim(),
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      tags: task.tags.map(function (t) { return t.trim(); })
    };
  }

  // Parses+validates a raw board document string. Returns { ok, tasks, error }.
  function parseBoardDocument(raw, maxBytes) {
    if (maxBytes != null && byteLength(raw) > maxBytes) {
      return { ok: false, error: "File is larger than the 1 MiB limit." };
    }
    var doc;
    try {
      doc = JSON.parse(raw);
    } catch (e) {
      return { ok: false, error: "The data is not valid JSON." };
    }
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
      return { ok: false, error: "The document is not a valid board object." };
    }
    if (doc.schemaVersion !== 1) {
      return { ok: false, error: "Unsupported schema version." };
    }
    if (!Array.isArray(doc.tasks)) {
      return { ok: false, error: "The document has no valid tasks list." };
    }
    var idSet = new Set();
    var tasks = [];
    for (var i = 0; i < doc.tasks.length; i++) {
      var err = validateTaskShape(doc.tasks[i], idSet);
      if (err) {
        return { ok: false, error: "Task " + (i + 1) + ": " + err };
      }
      idSet.add(doc.tasks[i].id);
      tasks.push(normalizeTask(doc.tasks[i]));
    }
    return { ok: true, tasks: tasks };
  }

  // ---------------------------------------------------------------------
  // Seed data (used only when storage is genuinely empty)
  // ---------------------------------------------------------------------

  function buildSeedTasks() {
    var seeds = [
      { title: "Draft interview guide for river-site survey", project: "Riverbank Survey", status: "todo", priority: "high", dueDate: "2026-09-18", tags: ["fieldwork", "interviews"] },
      { title: "Digitize week 1 fieldnotes", project: "Riverbank Survey", status: "doing", priority: "medium", dueDate: "2026-09-16", tags: ["notes"] },
      { title: "Calibrate water-quality sensors", project: "Riverbank Survey", status: "todo", priority: "medium", dueDate: "", tags: ["equipment"] },
      { title: "Order replacement sample bottles", project: "Riverbank Survey", status: "done", priority: "low", dueDate: "2026-09-05", tags: ["equipment", "supplies"] },
      { title: "Send consent forms to participants", project: "Community Outreach", status: "done", priority: "high", dueDate: "2026-09-10", tags: ["admin", "outreach"] },
      { title: "Schedule outreach meeting with village council", project: "Community Outreach", status: "doing", priority: "high", dueDate: "2026-09-20", tags: ["outreach", "scheduling"] },
      { title: "Summarize interim findings for stakeholders", project: "Community Outreach", status: "todo", priority: "low", dueDate: "", tags: ["reporting"] }
    ];
    return seeds.map(function (s) {
      return {
        id: genId(),
        title: s.title,
        project: s.project,
        status: s.status,
        priority: s.priority,
        dueDate: s.dueDate,
        tags: s.tags
      };
    });
  }

  // ---------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------

  function serializeBoard(tasks) {
    return JSON.stringify({ schemaVersion: 1, tasks: tasks });
  }

  // Attempts to write tasks to storage. Returns true on success.
  // On failure, flips state.saveError so the UI can say "not saved".
  function persist(tasks) {
    var raw = serializeBoard(tasks);
    try {
      localStorage.setItem(STORAGE_KEY, raw);
      state.lastWrittenRaw = raw;
      state.saveError = false;
      return true;
    } catch (e) {
      state.saveError = true;
      return false;
    }
  }

  function loadInitial() {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      // localStorage entirely unavailable (e.g. some private modes) — behave
      // like empty storage but flag that saves will not work.
      state.tasks = buildSeedTasks();
      state.mode = "normal";
      state.saveError = true;
      return;
    }

    if (raw === null) {
      var seed = buildSeedTasks();
      state.tasks = seed;
      state.mode = "normal";
      persist(seed);
      return;
    }

    var parsed = parseBoardDocument(raw, null);
    if (parsed.ok) {
      state.tasks = parsed.tasks;
      state.mode = "normal";
      state.lastWrittenRaw = raw;
    } else {
      state.mode = "corrupt";
      state.corruptRaw = raw;
      state.tasks = [];
    }
  }

  // ---------------------------------------------------------------------
  // Write guard — corrupt / conflict states block all persisted mutation
  // ---------------------------------------------------------------------

  function guardMessage() {
    if (state.mode === "corrupt") {
      return "Saved data could not be read. Resolve this using the notice above (download or reset) before making changes.";
    }
    if (state.mode === "conflict") {
      return "This board changed in another tab. Reload to continue before making changes.";
    }
    return null;
  }

  function canWrite() {
    return state.mode === "normal";
  }

  // ---------------------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------------------

  var el = {};

  function cacheDom() {
    el.app = document.getElementById("app");
    el.banners = document.getElementById("banners");
    el.board = document.getElementById("board");
    el.resultCount = document.getElementById("result-count");
    el.search = document.getElementById("search-input");
    el.filterStatus = document.getElementById("filter-status");
    el.filterProject = document.getElementById("filter-project");
    el.filterPriority = document.getElementById("filter-priority");
    el.createBtn = document.getElementById("create-task-btn");
    el.exportBtn = document.getElementById("export-btn");
    el.importInput = document.getElementById("import-file-input");
    el.modalRoot = document.getElementById("modal-root");
    el.formTemplate = document.getElementById("task-form-template");
  }

  // ---------------------------------------------------------------------
  // Banners
  // ---------------------------------------------------------------------

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function makeBanner(kind, message, actions) {
    var div = document.createElement("div");
    div.className = "banner banner--" + kind;
    div.setAttribute("role", kind === "danger" || kind === "warn" ? "alert" : "status");
    var p = document.createElement("p");
    p.textContent = message;
    div.appendChild(p);
    if (actions && actions.length) {
      var wrap = document.createElement("div");
      wrap.className = "banner-actions";
      actions.forEach(function (a) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn " + (a.className || "btn-secondary");
        if (a.testId) btn.setAttribute("data-testid", a.testId);
        btn.textContent = a.label;
        btn.addEventListener("click", a.onClick);
        wrap.appendChild(btn);
      });
      div.appendChild(wrap);
    }
    return div;
  }

  function renderBanners() {
    clearNode(el.banners);

    if (state.mode === "corrupt") {
      el.banners.appendChild(makeBanner(
        "danger",
        "Saved board data on this device could not be read. Nothing has been overwritten — your original data is preserved.",
        [
          { label: "Download original data", testId: "download-corrupt", onClick: downloadCorruptBytes },
          { label: "Reset board", className: "btn-danger", testId: "reset-board", onClick: onResetBoard }
        ]
      ));
    }

    if (state.mode === "conflict") {
      el.banners.appendChild(makeBanner(
        "warn",
        "This board was changed in another tab. Reload to see the latest version before making changes.",
        [{ label: "Reload board", testId: "reload-board", onClick: function () { window.location.reload(); } }]
      ));
    }

    if (state.saveError) {
      el.banners.appendChild(makeBanner(
        "danger",
        "Your changes are not being saved to this device right now. They exist only in this session and will be lost on reload."
      ));
    }

    if (state.lastDeleted) {
      var title = state.lastDeleted.task.title;
      el.banners.appendChild(makeBanner(
        "neutral",
        "Deleted “" + title + "”.",
        [
          { label: "Undo", className: "btn-primary", testId: "undo-delete", onClick: onUndoDelete },
          { label: "Dismiss", testId: "dismiss-undo", onClick: function () { state.lastDeleted = null; renderBanners(); } }
        ]
      ));
    }
  }

  function downloadCorruptBytes() {
    if (state.corruptRaw == null) return;
    triggerDownload("fieldnote-board-corrupt-backup.json", state.corruptRaw);
  }

  function triggerDownload(filename, text) {
    var blob = new Blob([text], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function onResetBoard() {
    var ok = window.confirm("Reset the board? This replaces the unreadable saved data with a fresh sample board. This cannot be undone.");
    if (!ok) return;
    var seed = buildSeedTasks();
    state.tasks = seed;
    state.mode = "normal";
    state.corruptRaw = null;
    persist(seed);
    renderAll();
  }

  function onUndoDelete() {
    if (!canWrite()) { renderBanners(); return; }
    if (!state.lastDeleted) return;
    var record = state.lastDeleted;
    var newTasks = state.tasks.slice();
    var insertAt = Math.min(record.index, newTasks.length);
    newTasks.splice(insertAt, 0, record.task);
    state.tasks = newTasks;
    state.lastDeleted = null;
    persist(state.tasks);
    renderAll();
  }

  // ---------------------------------------------------------------------
  // Filtering + rendering
  // ---------------------------------------------------------------------

  function getProjectList() {
    var set = {};
    state.tasks.forEach(function (t) { set[t.project] = true; });
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b); });
  }

  function syncProjectFilterOptions() {
    var projects = getProjectList();
    var current = el.filterProject.value || "all";
    clearNode(el.filterProject);
    var allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "All projects";
    el.filterProject.appendChild(allOpt);
    projects.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      el.filterProject.appendChild(opt);
    });
    if (current !== "all" && projects.indexOf(current) === -1) {
      current = "all";
      state.filters.project = "all";
    }
    el.filterProject.value = current;
  }

  function matchesFilters(task) {
    var f = state.filters;
    if (f.status !== "all" && task.status !== f.status) return false;
    if (f.project !== "all" && task.project !== f.project) return false;
    if (f.priority !== "all" && task.priority !== f.priority) return false;
    if (f.search) {
      var q = f.search.toLowerCase();
      var haystack = (task.title + " " + task.project + " " + task.tags.join(" ")).toLowerCase();
      if (haystack.indexOf(q) === -1) return false;
    }
    return true;
  }

  function isOverdue(task) {
    if (!task.dueDate || task.status === "done") return false;
    var today = new Date();
    var todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    return task.dueDate < todayStr;
  }

  function buildTaskCard(task) {
    var card = document.createElement("article");
    card.className = "task-card";
    card.setAttribute("data-testid", "task-card");
    card.setAttribute("data-task-id", task.id);

    var top = document.createElement("div");
    top.className = "task-card-top";

    var title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title;
    top.appendChild(title);

    var actions = document.createElement("div");
    actions.className = "task-card-actions";

    var editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "icon-btn";
    editBtn.setAttribute("data-action", "edit");
    editBtn.setAttribute("aria-label", "Edit \"" + task.title + "\"");
    editBtn.textContent = "✎";
    editBtn.addEventListener("click", function () { openTaskForm(task, editBtn); });
    actions.appendChild(editBtn);

    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-btn";
    delBtn.setAttribute("data-action", "delete");
    delBtn.setAttribute("aria-label", "Delete \"" + task.title + "\"");
    delBtn.textContent = "🗑";
    delBtn.addEventListener("click", function () { onDeleteTask(task.id); });
    actions.appendChild(delBtn);

    top.appendChild(actions);
    card.appendChild(top);

    var meta = document.createElement("div");
    meta.className = "task-meta";

    var projectChip = document.createElement("span");
    projectChip.className = "chip";
    projectChip.textContent = task.project;
    meta.appendChild(projectChip);

    var prioChip = document.createElement("span");
    prioChip.className = "chip chip--priority-" + task.priority;
    prioChip.textContent = PRIORITY_LABELS[task.priority] + " priority";
    meta.appendChild(prioChip);

    if (task.dueDate) {
      var dueChip = document.createElement("span");
      dueChip.className = "chip" + (isOverdue(task) ? " chip--due-overdue" : "");
      dueChip.textContent = (isOverdue(task) ? "Overdue: " : "Due ") + task.dueDate;
      meta.appendChild(dueChip);
    }
    card.appendChild(meta);

    if (task.tags.length) {
      var tagList = document.createElement("div");
      tagList.className = "tag-list";
      task.tags.forEach(function (t) {
        var tagEl = document.createElement("span");
        tagEl.className = "tag";
        tagEl.textContent = "#" + t;
        tagList.appendChild(tagEl);
      });
      card.appendChild(tagList);
    }

    var bottom = document.createElement("div");
    bottom.className = "task-card-bottom";

    var statusLabel = document.createElement("label");
    statusLabel.className = "sr-only-inline";
    var statusLabelId = "status-label-" + task.id;
    statusLabel.id = statusLabelId;
    statusLabel.textContent = "Status for \"" + task.title + "\"";
    statusLabel.style.position = "absolute";
    statusLabel.style.left = "-9999px";

    var statusSelect = document.createElement("select");
    statusSelect.className = "status-select";
    statusSelect.setAttribute("data-action", "status");
    statusSelect.setAttribute("aria-label", "Status for \"" + task.title + "\"");
    STATUSES.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s;
      opt.textContent = STATUS_LABELS[s];
      if (s === task.status) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    statusSelect.addEventListener("change", function () {
      onStatusChange(task.id, statusSelect.value, statusSelect);
    });
    bottom.appendChild(statusLabel);
    bottom.appendChild(statusSelect);
    card.appendChild(bottom);

    return card;
  }

  function renderBoard() {
    clearNode(el.board);
    var visible = state.tasks.filter(matchesFilters);

    el.resultCount.textContent = "Showing " + visible.length + " of " + state.tasks.length + " task" + (state.tasks.length === 1 ? "" : "s");

    if (state.tasks.length === 0) {
      var empty = document.createElement("div");
      empty.className = "board-empty";
      var msg = document.createElement("p");
      msg.textContent = state.mode === "corrupt"
        ? "No tasks to show while the saved data issue above is unresolved."
        : "No tasks yet. Create your first task to get started.";
      empty.appendChild(msg);
      if (state.mode === "normal") {
        var cta = document.createElement("button");
        cta.type = "button";
        cta.className = "btn btn-primary";
        cta.textContent = "+ New task";
        cta.addEventListener("click", function () { openTaskForm(null, cta); });
        empty.appendChild(cta);
      }
      el.board.appendChild(empty);
      return;
    }

    if (visible.length === 0) {
      var noResults = document.createElement("div");
      noResults.className = "board-empty";
      var p1 = document.createElement("p");
      p1.textContent = "No tasks match your search and filters.";
      noResults.appendChild(p1);
      var clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "btn btn-secondary";
      clearBtn.textContent = "Clear filters";
      clearBtn.addEventListener("click", clearFilters);
      noResults.appendChild(clearBtn);
      el.board.appendChild(noResults);
      return;
    }

    STATUSES.forEach(function (status) {
      var column = document.createElement("section");
      column.className = "column";
      column.setAttribute("aria-label", STATUS_LABELS[status] + " column");

      var header = document.createElement("div");
      header.className = "column-header";
      var h2 = document.createElement("h2");
      h2.className = "column-title";
      h2.textContent = STATUS_LABELS[status];
      header.appendChild(h2);

      var colTasks = visible.filter(function (t) { return t.status === status; });
      var count = document.createElement("span");
      count.className = "column-count";
      count.textContent = String(colTasks.length);
      header.appendChild(count);
      column.appendChild(header);

      var list = document.createElement("div");
      list.className = "card-list";
      if (colTasks.length === 0) {
        var colEmpty = document.createElement("p");
        colEmpty.className = "empty-state";
        colEmpty.textContent = "No matching tasks.";
        list.appendChild(colEmpty);
      } else {
        colTasks.forEach(function (t) { list.appendChild(buildTaskCard(t)); });
      }
      column.appendChild(list);
      el.board.appendChild(column);
    });
  }

  function clearFilters() {
    state.filters = { search: "", status: "all", project: "all", priority: "all" };
    el.search.value = "";
    el.filterStatus.value = "all";
    el.filterProject.value = "all";
    el.filterPriority.value = "all";
    renderBoard();
  }

  function renderAll() {
    renderBanners();
    syncProjectFilterOptions();
    renderBoard();
  }

  // ---------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------

  function onDeleteTask(id) {
    if (!canWrite()) { renderBanners(); return; }
    var index = state.tasks.findIndex(function (t) { return t.id === id; });
    if (index === -1) return;
    var task = state.tasks[index];
    var newTasks = state.tasks.slice();
    newTasks.splice(index, 1);
    state.tasks = newTasks;
    state.lastDeleted = { task: task, index: index };
    persist(state.tasks);
    renderAll();
  }

  function onStatusChange(id, newStatus, selectEl) {
    if (!canWrite()) {
      renderBanners();
      selectEl.value = state.tasks.find(function (t) { return t.id === id; }).status;
      return;
    }
    var newTasks = state.tasks.map(function (t) {
      return t.id === id ? Object.assign({}, t, { status: newStatus }) : t;
    });
    state.tasks = newTasks;
    persist(state.tasks);
    renderAll();
  }

  function applySavedTask(task, isEdit) {
    var newTasks;
    if (isEdit) {
      newTasks = state.tasks.map(function (t) { return t.id === task.id ? task : t; });
    } else {
      newTasks = state.tasks.concat([task]);
    }
    state.tasks = newTasks;
    persist(state.tasks);
    renderAll();
  }

  // ---------------------------------------------------------------------
  // Modal: create / edit task
  // ---------------------------------------------------------------------

  var modalState = null; // { overlay, form, focusables, opener }

  function getFocusable(container) {
    return Array.prototype.slice.call(
      container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
  }

  function openTaskForm(existingTask, opener) {
    if (!canWrite()) {
      renderBanners();
      return;
    }
    var frag = el.formTemplate.content.cloneNode(true);
    var overlay = frag.querySelector("[data-modal-overlay]");
    var heading = overlay.querySelector("#task-form-heading");
    var form = overlay.querySelector('[data-testid="task-form"]');

    state.editingTaskId = existingTask ? existingTask.id : null;
    heading.textContent = existingTask ? "Edit task" : "New task";

    if (existingTask) {
      form.elements.title.value = existingTask.title;
      form.elements.project.value = existingTask.project;
      form.elements.status.value = existingTask.status;
      form.elements.priority.value = existingTask.priority;
      form.elements.dueDate.value = existingTask.dueDate;
      form.elements.tags.value = existingTask.tags.join(", ");
    }

    el.modalRoot.appendChild(overlay);
    var overlayNode = el.modalRoot.lastElementChild;

    modalState = {
      overlay: overlayNode,
      form: form,
      opener: opener || null
    };

    overlayNode.addEventListener("click", function (e) {
      if (e.target === overlayNode) closeTaskForm();
    });
    overlayNode.querySelectorAll('[data-action="close-modal"]').forEach(function (btn) {
      btn.addEventListener("click", closeTaskForm);
    });
    overlayNode.addEventListener("keydown", onModalKeydown);
    form.addEventListener("submit", onFormSubmit);

    var titleInput = form.elements.title;
    titleInput.focus();
  }

  function onModalKeydown(e) {
    if (!modalState) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeTaskForm();
      return;
    }
    if (e.key === "Tab") {
      var focusables = getFocusable(modalState.overlay);
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

  function closeTaskForm() {
    if (!modalState) return;
    var opener = modalState.opener;
    modalState.overlay.removeEventListener("keydown", onModalKeydown);
    clearNode(el.modalRoot);
    modalState = null;
    state.editingTaskId = null;
    if (opener && document.contains(opener)) {
      opener.focus();
    } else if (el.createBtn) {
      el.createBtn.focus();
    }
  }

  function setFieldError(form, fieldName, message) {
    var errEl = form.querySelector('[data-error-for="' + fieldName + '"]');
    var inputEl = form.elements[fieldName];
    if (errEl) errEl.textContent = message || "";
    if (inputEl) {
      if (message) inputEl.classList.add("invalid");
      else inputEl.classList.remove("invalid");
    }
  }

  function onFormSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var formErrorEl = form.querySelector("[data-form-error]");
    formErrorEl.hidden = true;
    formErrorEl.textContent = "";

    ["title", "project", "dueDate", "tags"].forEach(function (f) { setFieldError(form, f, null); });

    if (!canWrite()) {
      formErrorEl.textContent = guardMessage();
      formErrorEl.hidden = false;
      renderBanners();
      return;
    }

    var titleVal = form.elements.title.value.trim();
    var projectVal = form.elements.project.value.trim();
    var statusVal = form.elements.status.value;
    var priorityVal = form.elements.priority.value;
    var dueDateVal = form.elements.dueDate.value.trim();
    var tagsRaw = form.elements.tags.value;

    var hasError = false;
    var firstInvalid = null;

    if (titleVal === "") {
      setFieldError(form, "title", "Title is required.");
      hasError = true; firstInvalid = firstInvalid || form.elements.title;
    } else if (titleVal.length > 120) {
      setFieldError(form, "title", "Title must be 120 characters or fewer.");
      hasError = true; firstInvalid = firstInvalid || form.elements.title;
    }

    if (projectVal === "") {
      setFieldError(form, "project", "Project is required.");
      hasError = true; firstInvalid = firstInvalid || form.elements.project;
    } else if (projectVal.length > 80) {
      setFieldError(form, "project", "Project must be 80 characters or fewer.");
      hasError = true; firstInvalid = firstInvalid || form.elements.project;
    }

    if (dueDateVal !== "" && !isRealCalendarDate(dueDateVal)) {
      setFieldError(form, "dueDate", "Enter a valid date.");
      hasError = true; firstInvalid = firstInvalid || form.elements.dueDate;
    }

    var tagsResult = normalizeTagsFromInput(tagsRaw);
    if (tagsResult.error) {
      setFieldError(form, "tags", tagsResult.error);
      hasError = true; firstInvalid = firstInvalid || form.elements.tags;
    }

    if (hasError) {
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    var isEdit = !!state.editingTaskId;
    var task = {
      id: isEdit ? state.editingTaskId : genId(),
      title: titleVal,
      project: projectVal,
      status: statusVal,
      priority: priorityVal,
      dueDate: dueDateVal,
      tags: tagsResult.tags
    };

    applySavedTask(task, isEdit);
    closeTaskForm();
  }

  // ---------------------------------------------------------------------
  // Export / Import
  // ---------------------------------------------------------------------

  function onExport() {
    var text = serializeBoard(state.tasks);
    triggerDownload("fieldnote-board-export.json", text);
  }

  function onImportFileChange(e) {
    var input = e.target;
    var file = input.files && input.files[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_BYTES) {
      showTransientError("Import failed: file is larger than the 1 MiB limit.");
      input.value = "";
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      var raw = String(reader.result || "");
      var parsed = parseBoardDocument(raw, MAX_IMPORT_BYTES);
      if (!parsed.ok) {
        showTransientError("Import failed: " + parsed.error);
        input.value = "";
        return;
      }
      if (!canWrite()) {
        showTransientError(guardMessage());
        input.value = "";
        return;
      }
      var confirmMsg = "Import will replace all " + state.tasks.length + " current task(s) with " + parsed.tasks.length + " task(s) from this file. Continue?";
      var ok = window.confirm(confirmMsg);
      input.value = "";
      if (!ok) return;
      state.tasks = parsed.tasks;
      state.lastDeleted = null;
      persist(state.tasks);
      renderAll();
    };
    reader.onerror = function () {
      showTransientError("Import failed: could not read the file.");
      input.value = "";
    };
    reader.readAsText(file);
  }

  function showTransientError(message) {
    var banner = makeBanner("danger", message, [
      { label: "Dismiss", onClick: function () { banner.remove(); } }
    ]);
    el.banners.appendChild(banner);
  }

  // ---------------------------------------------------------------------
  // Cross-tab conflict detection
  // ---------------------------------------------------------------------

  function onStorageEvent(e) {
    if (e.key !== STORAGE_KEY) return;
    if (e.newValue === state.lastWrittenRaw) return; // benign echo
    state.mode = "conflict";
    renderBanners();
  }

  // ---------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------

  function wireEvents() {
    el.createBtn.addEventListener("click", function () { openTaskForm(null, el.createBtn); });
    el.exportBtn.addEventListener("click", onExport);
    el.importInput.addEventListener("change", onImportFileChange);

    el.search.addEventListener("input", function () {
      state.filters.search = el.search.value;
      renderBoard();
    });
    el.filterStatus.addEventListener("change", function () {
      state.filters.status = el.filterStatus.value;
      renderBoard();
    });
    el.filterProject.addEventListener("change", function () {
      state.filters.project = el.filterProject.value;
      renderBoard();
    });
    el.filterPriority.addEventListener("change", function () {
      state.filters.priority = el.filterPriority.value;
      renderBoard();
    });

    window.addEventListener("storage", onStorageEvent);
  }

  function init() {
    cacheDom();
    loadInitial();
    wireEvents();
    renderAll();
    el.app.hidden = false;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
