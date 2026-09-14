(function () {
  "use strict";

  document.body.classList.remove("no-js");

  var STORAGE_KEY = "fieldnote-board:v1";
  var MAX_IMPORT_BYTES = 1024 * 1024;
  var STATUSES = ["todo", "doing", "done"];
  var PRIORITIES = ["low", "medium", "high"];

  var state = {
    tasks: [],
    corrupt: false,
    rawCorrupt: null,
    conflict: false,
    editingId: null,
    lastDeleted: null,
    triggerEl: null,
    lastWrittenSerialized: null
  };

  // ---------- DOM refs ----------
  var el = {
    banners: document.getElementById("banners"),
    board: document.getElementById("board"),
    noResults: document.getElementById("noResults"),
    taskCount: document.getElementById("taskCount"),
    search: document.getElementById("search"),
    filterStatus: document.getElementById("filterStatus"),
    filterProject: document.getElementById("filterProject"),
    filterPriority: document.getElementById("filterPriority"),
    createTaskBtn: document.getElementById("createTaskBtn"),
    exportBtn: document.getElementById("exportBtn"),
    importFile: document.getElementById("importFile"),
    dialog: document.getElementById("taskDialog"),
    form: document.getElementById("taskForm"),
    cancelTaskBtn: document.getElementById("cancelTaskBtn"),
    dialogTitle: document.getElementById("dialogTitle"),
    lists: {
      todo: document.getElementById("list-todo"),
      doing: document.getElementById("list-doing"),
      done: document.getElementById("list-done")
    }
  };

  // ---------- utilities ----------
  function genId() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function isValidDateStr(s) {
    if (s === "") return true;
    if (typeof s !== "string") return false;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return false;
    var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    var dt = new Date(Date.UTC(y, mo - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  }

  function escapeForFile(str) {
    return str.replace(/[^a-z0-9-_]/gi, "_");
  }

  function downloadText(filename, text, mime) {
    var blob = new Blob([text], { type: mime || "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------- validation ----------
  function validateTask(t, seenIds) {
    if (!t || typeof t !== "object") return "Task entry is not an object.";
    if (typeof t.id !== "string" || t.id.length === 0 || t.id.length > 80) {
      return "Task has an invalid id.";
    }
    if (seenIds.has(t.id)) return "Duplicate task id: " + t.id;
    if (typeof t.title !== "string" || t.title.trim() !== t.title || t.title.length === 0 || t.title.length > 120) {
      return "Task " + t.id + " has an invalid title.";
    }
    if (typeof t.project !== "string" || t.project.trim() !== t.project || t.project.length === 0 || t.project.length > 80) {
      return "Task " + t.id + " has an invalid project.";
    }
    if (STATUSES.indexOf(t.status) === -1) return "Task " + t.id + " has an unsupported status.";
    if (PRIORITIES.indexOf(t.priority) === -1) return "Task " + t.id + " has an unsupported priority.";
    if (typeof t.dueDate !== "string" || !isValidDateStr(t.dueDate)) {
      return "Task " + t.id + " has an invalid due date.";
    }
    if (!Array.isArray(t.tags) || t.tags.length > 8) return "Task " + t.id + " has an invalid tags list.";
    for (var i = 0; i < t.tags.length; i++) {
      var tag = t.tags[i];
      if (typeof tag !== "string" || tag.trim() !== tag || tag.length === 0 || tag.length > 24) {
        return "Task " + t.id + " has an invalid tag.";
      }
    }
    return null;
  }

  function validateDocument(doc) {
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
      return { valid: false, error: "File does not contain a Fieldnote Board document." };
    }
    if (doc.schemaVersion !== 1) {
      return { valid: false, error: "Unsupported schema version." };
    }
    if (!Array.isArray(doc.tasks)) {
      return { valid: false, error: "Document is missing a tasks list." };
    }
    var seenIds = new Set();
    var out = [];
    for (var i = 0; i < doc.tasks.length; i++) {
      var t = doc.tasks[i];
      var err = validateTask(t, seenIds);
      if (err) return { valid: false, error: err };
      seenIds.add(t.id);
      out.push({
        id: t.id,
        title: t.title,
        project: t.project,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        tags: t.tags.slice()
      });
    }
    return { valid: true, tasks: out };
  }

  // ---------- seed ----------
  function seedTasks() {
    return [
      { id: "seed-1", title: "Map wetland transect boundaries", project: "Wetland Monitoring", status: "todo", priority: "high", dueDate: "2026-09-22", tags: ["survey", "gps"] },
      { id: "seed-2", title: "Calibrate soil moisture sensors", project: "Wetland Monitoring", status: "todo", priority: "medium", dueDate: "2026-09-25", tags: ["equipment"] },
      { id: "seed-3", title: "Log heron nesting sightings", project: "Wetland Monitoring", status: "doing", priority: "medium", dueDate: "", tags: ["wildlife", "log"] },
      { id: "seed-4", title: "Interview trail volunteers", project: "Riverside Trail Survey", status: "doing", priority: "low", dueDate: "2026-09-18", tags: ["outreach"] },
      { id: "seed-5", title: "Repair washed-out footbridge marker", project: "Riverside Trail Survey", status: "todo", priority: "high", dueDate: "2026-09-16", tags: ["maintenance", "urgent"] },
      { id: "seed-6", title: "Submit Q3 access report", project: "Riverside Trail Survey", status: "done", priority: "medium", dueDate: "2026-09-01", tags: ["report"] },
      { id: "seed-7", title: "Archive August field photos", project: "Wetland Monitoring", status: "done", priority: "low", dueDate: "", tags: ["archive", "photos"] },
      { id: "seed-8", title: "Plan invasive species survey route", project: "Riverside Trail Survey", status: "todo", priority: "medium", dueDate: "2026-10-01", tags: ["planning", "survey"] }
    ];
  }

  // ---------- persistence ----------
  function persist(tasksToWrite) {
    try {
      var payload = JSON.stringify({ schemaVersion: 1, tasks: tasksToWrite });
      window.localStorage.setItem(STORAGE_KEY, payload);
      state.lastWrittenSerialized = payload;
      return true;
    } catch (e) {
      return false;
    }
  }

  function init() {
    var raw = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }

    if (raw === null) {
      state.tasks = seedTasks();
      persist(state.tasks);
    } else {
      var parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        state.corrupt = true;
        state.rawCorrupt = raw;
        render();
        return;
      }
      var result = validateDocument(parsed);
      if (!result.valid) {
        state.corrupt = true;
        state.rawCorrupt = raw;
      } else {
        state.tasks = result.tasks;
        state.lastWrittenSerialized = raw;
      }
    }
    render();
  }

  // ---------- banners ----------
  function clearBannerType(type) {
    var existing = el.banners.querySelectorAll('[data-banner="' + type + '"]');
    existing.forEach(function (n) { n.remove(); });
  }

  function showBanner(type, opts) {
    clearBannerType(type);
    var div = document.createElement("div");
    div.className = "banner banner-" + opts.className;
    div.setAttribute("data-banner", type);
    div.setAttribute("role", opts.role || "status");
    var p = document.createElement("p");
    p.textContent = opts.message;
    div.appendChild(p);
    if (opts.actions) {
      opts.actions.forEach(function (a) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = a.label;
        if (a.testId) btn.setAttribute("data-testid", a.testId);
        btn.addEventListener("click", a.onClick);
        div.appendChild(btn);
      });
    }
    el.banners.appendChild(div);
    return div;
  }

  function showCorruptBanner() {
    showBanner("corrupt", {
      className: "corrupt",
      role: "alert",
      message: "Saved board data could not be read (it looks corrupted). Your original data has been left untouched.",
      actions: [
        {
          label: "Download original data",
          onClick: function () {
            downloadText("fieldnote-board-corrupt-backup.json", state.rawCorrupt || "", "application/octet-stream");
          }
        },
        {
          label: "Reset board",
          onClick: function () {
            var ok = window.confirm("Discard the corrupted data and start a fresh board? This cannot be undone.");
            if (!ok) return;
            state.corrupt = false;
            state.rawCorrupt = null;
            state.tasks = seedTasks();
            persist(state.tasks);
            clearBannerType("corrupt");
            render();
          }
        }
      ]
    });
  }

  function showConflictBanner() {
    showBanner("conflict", {
      className: "conflict",
      role: "alert",
      message: "This board was changed in another tab. Reload to see the latest version before making further changes.",
      actions: [
        { label: "Reload", onClick: function () { window.location.reload(); } }
      ]
    });
  }

  function showErrorBanner(message) {
    var div = showBanner("error", {
      className: "error",
      role: "alert",
      message: message,
      actions: [{ label: "Dismiss", onClick: function () { clearBannerType("error"); } }]
    });
    return div;
  }

  function showUndoToast(task, index) {
    clearBannerType("toast");
    showBanner("toast", {
      className: "toast",
      role: "status",
      message: 'Deleted "' + task.title + '".',
      actions: [
        {
          label: "Undo",
          testId: "undo-delete",
          onClick: function () {
            if (guardConflict()) return;
            var restored = state.tasks.slice();
            restored.splice(Math.min(index, restored.length), 0, task);
            if (persist(restored)) {
              state.tasks = restored;
              state.lastDeleted = null;
              clearBannerType("toast");
              render();
            } else {
              showErrorBanner("Could not undo delete: the browser refused to save (storage error).");
            }
          }
        }
      ]
    });
  }

  function guardConflict() {
    if (state.conflict) {
      showConflictBanner();
      return true;
    }
    return false;
  }

  // ---------- rendering ----------
  function uniqueProjects() {
    var set = new Set();
    state.tasks.forEach(function (t) { set.add(t.project); });
    return Array.from(set).sort(function (a, b) { return a.localeCompare(b); });
  }

  function refreshProjectFilterOptions() {
    var current = el.filterProject.value || "all";
    var projects = uniqueProjects();
    el.filterProject.innerHTML = "";
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
    if (projects.indexOf(current) !== -1 || current === "all") {
      el.filterProject.value = current;
    } else {
      el.filterProject.value = "all";
    }
  }

  function matchesFilters(t) {
    var q = el.search.value.trim().toLowerCase();
    if (q) {
      var haystack = (t.title + " " + t.project + " " + t.tags.join(" ")).toLowerCase();
      if (haystack.indexOf(q) === -1) return false;
    }
    var fs = el.filterStatus.value;
    if (fs !== "all" && t.status !== fs) return false;
    var fp = el.filterProject.value;
    if (fp !== "all" && t.project !== fp) return false;
    var fpr = el.filterPriority.value;
    if (fpr !== "all" && t.priority !== fpr) return false;
    return true;
  }

  function todayStr() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function buildCard(task) {
    var card = document.createElement("article");
    card.className = "task-card";
    card.setAttribute("data-testid", "task-card");
    card.setAttribute("data-task-id", task.id);
    card.setAttribute("data-priority", task.priority);

    var title = document.createElement("div");
    title.className = "title";
    title.textContent = task.title;
    card.appendChild(title);

    var meta = document.createElement("div");
    meta.className = "meta";
    var projectSpan = document.createElement("span");
    projectSpan.textContent = task.project;
    meta.appendChild(projectSpan);

    var prioSpan = document.createElement("span");
    prioSpan.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1) + " priority";
    meta.appendChild(prioSpan);

    if (task.dueDate) {
      var dueSpan = document.createElement("span");
      dueSpan.textContent = "Due " + task.dueDate;
      if (task.dueDate < todayStr() && task.status !== "done") {
        dueSpan.className = "overdue";
        dueSpan.textContent += " (overdue)";
      }
      meta.appendChild(dueSpan);
    }
    card.appendChild(meta);

    if (task.tags.length) {
      var tagList = document.createElement("div");
      tagList.className = "tag-list";
      task.tags.forEach(function (tag) {
        var chip = document.createElement("span");
        chip.className = "tag-chip";
        chip.textContent = tag;
        tagList.appendChild(chip);
      });
      card.appendChild(tagList);
    }

    var actions = document.createElement("div");
    actions.className = "card-actions";

    var statusLabel = document.createElement("label");
    statusLabel.className = "sr-only-inline";
    statusLabel.htmlFor = "status-" + task.id;
    statusLabel.textContent = "Status";
    statusLabel.style.position = "absolute";
    statusLabel.style.left = "-9999px";
    var statusSelect = document.createElement("select");
    statusSelect.id = "status-" + task.id;
    statusSelect.setAttribute("data-action", "status");
    statusSelect.setAttribute("aria-label", "Status for " + task.title);
    STATUSES.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s === "todo" ? "To do" : s.charAt(0).toUpperCase() + s.slice(1);
      if (s === task.status) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    statusSelect.addEventListener("change", function () { onStatusChange(task.id, statusSelect); });
    actions.appendChild(statusLabel);
    actions.appendChild(statusSelect);

    var editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.setAttribute("data-action", "edit");
    editBtn.setAttribute("aria-label", "Edit " + task.title);
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", function () { openDialog(task, editBtn); });
    actions.appendChild(editBtn);

    var deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.setAttribute("data-action", "delete");
    deleteBtn.setAttribute("aria-label", "Delete " + task.title);
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", function () { onDelete(task.id); });
    actions.appendChild(deleteBtn);

    card.appendChild(actions);
    return card;
  }

  function render() {
    var disabled = state.corrupt;
    el.createTaskBtn.disabled = disabled;
    el.exportBtn.disabled = disabled;
    el.importFile.disabled = disabled;

    if (state.corrupt) {
      clearBannerType("conflict");
      showCorruptBanner();
      Object.keys(el.lists).forEach(function (k) { el.lists[k].innerHTML = ""; });
      el.board.hidden = true;
      el.noResults.hidden = true;
      el.taskCount.textContent = "Board unavailable until recovery.";
      return;
    }
    clearBannerType("corrupt");
    el.board.hidden = false;

    refreshProjectFilterOptions();

    var filtered = state.tasks.filter(matchesFilters);

    Object.keys(el.lists).forEach(function (status) {
      var list = el.lists[status];
      list.innerHTML = "";
      var group = filtered.filter(function (t) { return t.status === status; });
      if (group.length === 0) {
        var empty = document.createElement("p");
        empty.className = "column-empty";
        empty.textContent = state.tasks.filter(function (t) { return t.status === status; }).length === 0
          ? "No tasks in this column yet."
          : "No matches in this column.";
        list.appendChild(empty);
      } else {
        group.forEach(function (t) { list.appendChild(buildCard(t)); });
      }
    });

    el.taskCount.textContent = "Showing " + filtered.length + " of " + state.tasks.length + " task" + (state.tasks.length === 1 ? "" : "s");
    el.noResults.hidden = !(state.tasks.length > 0 && filtered.length === 0);
  }

  // ---------- dialog / form ----------
  function clearFormErrors() {
    ["title", "project", "dueDate", "tags"].forEach(function (f) {
      document.getElementById("err-" + f).textContent = "";
    });
    document.getElementById("err-form").textContent = "";
  }

  function openDialog(task, trigger) {
    if (guardConflict()) return;
    state.triggerEl = trigger || document.activeElement;
    state.editingId = task ? task.id : null;
    clearFormErrors();
    el.dialogTitle.textContent = task ? "Edit task" : "New task";
    el.form.elements.title.value = task ? task.title : "";
    el.form.elements.project.value = task ? task.project : "";
    el.form.elements.status.value = task ? task.status : "todo";
    el.form.elements.priority.value = task ? task.priority : "medium";
    el.form.elements.dueDate.value = task ? task.dueDate : "";
    el.form.elements.tags.value = task ? task.tags.join(", ") : "";
    if (typeof el.dialog.showModal === "function") {
      el.dialog.showModal();
    } else {
      el.dialog.setAttribute("open", "");
    }
    el.form.elements.title.focus();
  }

  function closeDialog() {
    if (typeof el.dialog.close === "function" && el.dialog.open) {
      el.dialog.close();
    } else {
      el.dialog.removeAttribute("open");
    }
  }

  el.dialog.addEventListener("close", function () {
    if (state.triggerEl && typeof state.triggerEl.focus === "function") {
      state.triggerEl.focus();
    }
    state.triggerEl = null;
    state.editingId = null;
  });

  function parseTags(raw) {
    var parts = raw.split(",").map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    var seen = new Set();
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var key = parts[i].toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(parts[i]);
      }
    }
    return out;
  }

  function onSubmit(e) {
    e.preventDefault();
    if (guardConflict()) return;
    clearFormErrors();

    var title = el.form.elements.title.value.trim();
    var project = el.form.elements.project.value.trim();
    var status = el.form.elements.status.value;
    var priority = el.form.elements.priority.value;
    var dueDate = el.form.elements.dueDate.value;
    var tagsRaw = el.form.elements.tags.value;

    var hasError = false;
    if (!title) {
      document.getElementById("err-title").textContent = "Title is required.";
      hasError = true;
    } else if (title.length > 120) {
      document.getElementById("err-title").textContent = "Title must be 120 characters or fewer.";
      hasError = true;
    }
    if (!project) {
      document.getElementById("err-project").textContent = "Project is required.";
      hasError = true;
    } else if (project.length > 80) {
      document.getElementById("err-project").textContent = "Project must be 80 characters or fewer.";
      hasError = true;
    }
    if (dueDate && !isValidDateStr(dueDate)) {
      document.getElementById("err-dueDate").textContent = "Enter a real calendar date.";
      hasError = true;
    }
    var tags = parseTags(tagsRaw);
    if (tags.length > 8) {
      document.getElementById("err-tags").textContent = "Use at most 8 tags.";
      hasError = true;
    }
    var overlongTag = tags.find(function (t) { return t.length > 24; });
    if (overlongTag) {
      document.getElementById("err-tags").textContent = "Each tag must be 24 characters or fewer.";
      hasError = true;
    }

    if (hasError) {
      document.getElementById("err-form").textContent = "Please fix the highlighted fields.";
      return;
    }

    var id = state.editingId || genId();
    var newTask = { id: id, title: title, project: project, status: status, priority: priority, dueDate: dueDate, tags: tags };

    var nextTasks;
    if (state.editingId) {
      nextTasks = state.tasks.map(function (t) { return t.id === id ? newTask : t; });
    } else {
      nextTasks = state.tasks.concat([newTask]);
    }

    if (persist(nextTasks)) {
      state.tasks = nextTasks;
      closeDialog();
      render();
    } else {
      document.getElementById("err-form").textContent = "Could not save: the browser refused to store the change (storage error). Your entry is kept in this form.";
    }
  }

  function onDelete(id) {
    if (guardConflict()) return;
    var index = state.tasks.findIndex(function (t) { return t.id === id; });
    if (index === -1) return;
    var task = state.tasks[index];
    var nextTasks = state.tasks.slice();
    nextTasks.splice(index, 1);
    if (persist(nextTasks)) {
      state.tasks = nextTasks;
      state.lastDeleted = { task: task, index: index };
      render();
      showUndoToast(task, index);
    } else {
      showErrorBanner("Could not delete: the browser refused to save (storage error).");
    }
  }

  function onStatusChange(id, selectEl) {
    if (guardConflict()) {
      selectEl.value = state.tasks.find(function (t) { return t.id === id; }).status;
      return;
    }
    var previous = null;
    var nextTasks = state.tasks.map(function (t) {
      if (t.id === id) {
        previous = t.status;
        return Object.assign({}, t, { status: selectEl.value });
      }
      return t;
    });
    if (persist(nextTasks)) {
      state.tasks = nextTasks;
      render();
    } else {
      selectEl.value = previous;
      showErrorBanner("Could not update status: the browser refused to save (storage error).");
    }
  }

  // ---------- export / import ----------
  function onExport() {
    var payload = JSON.stringify({ schemaVersion: 1, tasks: state.tasks }, null, 2);
    downloadText("fieldnote-board-export.json", payload, "application/json");
  }

  function onImportChange(e) {
    var input = e.target;
    var file = input.files && input.files[0];
    if (!file) return;

    if (guardConflict()) {
      input.value = "";
      return;
    }

    if (file.size > MAX_IMPORT_BYTES) {
      showErrorBanner("Import failed: \"" + file.name + "\" is larger than the 1 MiB limit.");
      input.value = "";
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result);
      var parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        showErrorBanner("Import failed: the file is not valid JSON.");
        input.value = "";
        return;
      }
      var result = validateDocument(parsed);
      if (!result.valid) {
        showErrorBanner("Import failed: " + result.error);
        input.value = "";
        return;
      }
      var ok = window.confirm(
        "Replace the current board with " + result.tasks.length + " task(s) from \"" + file.name + "\"? This cannot be undone."
      );
      if (!ok) {
        input.value = "";
        return;
      }
      if (guardConflict()) {
        input.value = "";
        return;
      }
      if (persist(result.tasks)) {
        state.tasks = result.tasks;
        state.lastDeleted = null;
        clearBannerType("toast");
        render();
        showBanner("toast", {
          className: "toast",
          role: "status",
          message: "Board imported: " + result.tasks.length + " task(s) loaded from \"" + file.name + "\".",
          actions: [{ label: "Dismiss", onClick: function () { clearBannerType("toast"); } }]
        });
      } else {
        showErrorBanner("Import validated but could not be saved (storage error).");
      }
      input.value = "";
    };
    reader.onerror = function () {
      showErrorBanner("Import failed: could not read the selected file.");
      input.value = "";
    };
    reader.readAsText(file);
  }

  // ---------- cross-tab conflict ----------
  window.addEventListener("storage", function (e) {
    if (e.key !== STORAGE_KEY) return;
    if (e.newValue === state.lastWrittenSerialized) return;
    state.conflict = true;
    showConflictBanner();
  });

  // ---------- wiring ----------
  el.createTaskBtn.addEventListener("click", function () { openDialog(null, el.createTaskBtn); });
  el.cancelTaskBtn.addEventListener("click", function () { closeDialog(); });
  el.form.addEventListener("submit", onSubmit);
  el.exportBtn.addEventListener("click", onExport);
  el.importFile.addEventListener("change", onImportChange);
  el.search.addEventListener("input", render);
  el.filterStatus.addEventListener("change", render);
  el.filterProject.addEventListener("change", render);
  el.filterPriority.addEventListener("change", render);

  el.dialog.addEventListener("cancel", function (e) {
    // native Escape handling fires 'cancel' then 'close'; let default close proceed.
  });

  init();
})();
