(function () {
  "use strict";

  var STORAGE_KEY = "fieldnote-board:v1";
  var MAX_IMPORT_BYTES = 1024 * 1024;
  var STATUSES = ["todo", "doing", "done"];
  var PRIORITIES = ["low", "medium", "high"];

  // ---- state -------------------------------------------------------------
  var tasks = [];
  var corruptMode = false;
  var rawCorruptText = "";
  var conflictMode = false;
  var editingTaskId = null;
  var lastFocusedElement = null;
  var pendingDelete = null; // { task, index }

  // ---- dom refs ------------------------------------------------------------
  var el = {};
  function cacheEls() {
    [
      "createTaskBtn", "storageBanner", "storageBannerText", "downloadCorruptBtn", "resetBoardBtn",
      "conflictBanner", "reloadBoardBtn", "saveErrorBanner", "saveErrorText",
      "importBanner", "importBannerText",
      "searchInput", "filterStatus", "filterProject", "filterPriority",
      "exportBtn", "importFile", "resultsCount", "taskList", "emptyState",
      "undoBar", "undoText", "undoBtn",
      "modalOverlay", "modalTitle", "taskForm", "titleInput", "projectInput",
      "statusInput", "priorityInput", "dueDateInput", "tagsInput",
      "titleError", "projectError", "dueDateError", "tagsError",
      "cancelFormBtn", "projectSuggestions"
    ].forEach(function (id) { el[id] = document.getElementById(id); });
  }

  // ---- utilities -----------------------------------------------------------
  function genId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "task-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function isValidDateString(s) {
    if (s === "") return true;
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var parts = s.split("-").map(Number);
    var y = parts[0], m = parts[1], d = parts[2];
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  function seedTasks() {
    return [
      { id: "seed-1", title: "Calibrate soil moisture sensors", project: "Riverside Trailhead", status: "todo", priority: "high", dueDate: "2026-09-20", tags: ["sensors", "fieldwork"] },
      { id: "seed-2", title: "Draft trail erosion report", project: "Riverside Trailhead", status: "doing", priority: "medium", dueDate: "2026-09-25", tags: ["report"] },
      { id: "seed-3", title: "Photograph wildflower bloom", project: "Riverside Trailhead", status: "done", priority: "low", dueDate: "", tags: ["photos", "botany"] },
      { id: "seed-4", title: "Order replacement rain gauges", project: "Riverside Trailhead", status: "todo", priority: "low", dueDate: "", tags: ["equipment"] },
      { id: "seed-5", title: "Interview local beekeepers", project: "Harvest Almanac", status: "todo", priority: "medium", dueDate: "2026-09-30", tags: ["interviews"] },
      { id: "seed-6", title: "Compile rainfall archive", project: "Harvest Almanac", status: "doing", priority: "high", dueDate: "2026-09-18", tags: ["data", "archive"] },
      { id: "seed-7", title: "Publish September almanac issue", project: "Harvest Almanac", status: "done", priority: "high", dueDate: "2026-09-10", tags: ["publishing"] }
    ];
  }

  // ---- validation ------------------------------------------------------------
  function validateTaskShape(t, seenIds) {
    var errors = [];
    if (!t || typeof t !== "object") return ["not an object"];
    if (typeof t.id !== "string" || !t.id.trim() || t.id.length > 80) errors.push("invalid id");
    else if (seenIds.has(t.id)) errors.push("duplicate id");
    if (typeof t.title !== "string" || !t.title.trim() || t.title.trim().length > 120) errors.push("invalid title");
    if (typeof t.project !== "string" || !t.project.trim() || t.project.trim().length > 80) errors.push("invalid project");
    if (STATUSES.indexOf(t.status) === -1) errors.push("invalid status");
    if (PRIORITIES.indexOf(t.priority) === -1) errors.push("invalid priority");
    if (typeof t.dueDate !== "string" || !isValidDateString(t.dueDate)) errors.push("invalid dueDate");
    if (!Array.isArray(t.tags) || t.tags.length > 8 ||
        t.tags.some(function (tag) { return typeof tag !== "string" || !tag.trim() || tag.trim().length > 24; })) {
      errors.push("invalid tags");
    }
    return errors;
  }

  function validateBoardDocument(doc) {
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) return { ok: false, error: "Top-level value must be a JSON object." };
    if (doc.schemaVersion !== 1) return { ok: false, error: "Unsupported or missing schemaVersion (expected 1)." };
    if (!Array.isArray(doc.tasks)) return { ok: false, error: "Missing or invalid \"tasks\" array." };
    var seen = new Set();
    for (var i = 0; i < doc.tasks.length; i++) {
      var t = doc.tasks[i];
      var errs = validateTaskShape(t, seen);
      if (errs.length) {
        var label = (t && (t.title || t.id)) || ("#" + (i + 1));
        return { ok: false, error: "Task \"" + label + "\" is invalid: " + errs.join(", ") + "." };
      }
      seen.add(t.id);
    }
    return { ok: true };
  }

  // ---- persistence ------------------------------------------------------------
  function persist(newTasks) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, tasks: newTasks }));
      hideSaveError();
      return true;
    } catch (e) {
      showSaveError("Your change could not be saved to this browser's storage" +
        (e && e.message ? " (" + e.message + ")" : "") +
        ". It has not been persisted. Keep this tab open and try again.");
      return false;
    }
  }

  function commitTasks(newTasks) {
    var ok = persist(newTasks);
    if (ok) tasks = newTasks;
    render();
    return ok;
  }

  function loadBoard() {
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      corruptMode = false;
      tasks = [];
      showSaveError("This browser's storage is unavailable, so tasks cannot be saved right now.");
      return;
    }
    if (raw === null) {
      corruptMode = false;
      tasks = seedTasks();
      persist(tasks);
      return;
    }
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      enterCorruptMode(raw, "the saved data is not valid JSON");
      return;
    }
    var result = validateBoardDocument(parsed);
    if (!result.ok) {
      enterCorruptMode(raw, result.error);
      return;
    }
    corruptMode = false;
    tasks = parsed.tasks;
  }

  function enterCorruptMode(raw, reason) {
    corruptMode = true;
    rawCorruptText = raw;
    tasks = [];
    showStorageBanner("Saved board data could not be loaded (" + reason + "). It has been left untouched in storage.");
  }

  // ---- banners -----------------------------------------------------------
  function showStorageBanner(msg) {
    el.storageBannerText.textContent = msg;
    el.storageBanner.hidden = false;
    updateControlsAvailability();
  }
  function hideStorageBanner() {
    el.storageBanner.hidden = true;
    updateControlsAvailability();
  }
  function showConflictBanner() {
    el.conflictBanner.hidden = false;
    updateControlsAvailability();
  }
  function hideConflictBanner() {
    el.conflictBanner.hidden = true;
    updateControlsAvailability();
  }
  function showSaveError(msg) {
    el.saveErrorText.textContent = msg;
    el.saveErrorBanner.hidden = false;
  }
  function hideSaveError() {
    el.saveErrorBanner.hidden = true;
  }
  function showImportBanner(msg, isError) {
    el.importBannerText.textContent = msg;
    el.importBanner.hidden = false;
    el.importBanner.classList.toggle("banner-danger", !!isError);
    el.importBanner.setAttribute("role", isError ? "alert" : "status");
  }
  function hideImportBanner() {
    el.importBanner.hidden = true;
  }

  function updateControlsAvailability() {
    var blocked = corruptMode || conflictMode;
    el.createTaskBtn.disabled = blocked;
    el.importFile.disabled = blocked;
  }

  function blockedMessage() {
    if (corruptMode) return "Resolve the corrupted board data above (download or reset) before making changes.";
    return "This board changed in another tab. Reload the board before making changes.";
  }

  // ---- rendering -----------------------------------------------------------
  function uniqueProjects() {
    var set = new Set();
    tasks.forEach(function (t) { set.add(t.project); });
    return Array.from(set).sort(function (a, b) { return a.localeCompare(b); });
  }

  function populateProjectOptions() {
    var projects = uniqueProjects();
    var currentFilter = el.filterProject.value || "all";
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
    el.filterProject.value = projects.indexOf(currentFilter) !== -1 || currentFilter === "all" ? currentFilter : "all";

    el.projectSuggestions.innerHTML = "";
    projects.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p;
      el.projectSuggestions.appendChild(opt);
    });
  }

  function getFilteredTasks() {
    var q = el.searchInput.value.trim().toLowerCase();
    var fStatus = el.filterStatus.value;
    var fProject = el.filterProject.value;
    var fPriority = el.filterPriority.value;
    return tasks.filter(function (t) {
      if (fStatus !== "all" && t.status !== fStatus) return false;
      if (fProject !== "all" && t.project !== fProject) return false;
      if (fPriority !== "all" && t.priority !== fPriority) return false;
      if (q) {
        var hay = (t.title + " " + t.project + " " + t.tags.join(" ")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  var STATUS_LABELS = { todo: "To do", doing: "Doing", done: "Done" };
  var PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High" };

  function buildCard(task) {
    var card = document.createElement("article");
    card.className = "task-card";
    card.setAttribute("data-testid", "task-card");
    card.setAttribute("data-task-id", task.id);

    var top = document.createElement("div");
    top.className = "task-card-top";

    var titleWrap = document.createElement("div");
    var title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title;
    var project = document.createElement("p");
    project.className = "task-project";
    project.textContent = task.project;
    titleWrap.appendChild(title);
    titleWrap.appendChild(project);

    var badge = document.createElement("span");
    badge.className = "priority-badge priority-" + task.priority;
    badge.textContent = PRIORITY_LABELS[task.priority];

    top.appendChild(titleWrap);
    top.appendChild(badge);
    card.appendChild(top);

    var metaRow = document.createElement("div");
    metaRow.className = "task-meta-row";
    var due = document.createElement("span");
    due.textContent = task.dueDate ? ("Due " + task.dueDate) : "No due date";
    metaRow.appendChild(due);
    card.appendChild(metaRow);

    if (task.tags.length) {
      var tagList = document.createElement("ul");
      tagList.className = "task-tags";
      tagList.setAttribute("aria-label", "Tags");
      task.tags.forEach(function (tag) {
        var li = document.createElement("li");
        li.textContent = tag;
        tagList.appendChild(li);
      });
      card.appendChild(tagList);
    }

    var controls = document.createElement("div");
    controls.className = "task-controls";

    var statusLabel = document.createElement("label");
    statusLabel.className = "visually-hidden-file";
    statusLabel.setAttribute("for", "status-" + task.id);
    statusLabel.textContent = "Status for " + task.title;
    var statusSelect = document.createElement("select");
    statusSelect.id = "status-" + task.id;
    statusSelect.setAttribute("data-action", "status");
    statusSelect.setAttribute("aria-label", "Status for " + task.title);
    STATUSES.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s;
      opt.textContent = STATUS_LABELS[s];
      if (s === task.status) opt.selected = true;
      statusSelect.appendChild(opt);
    });

    var editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn";
    editBtn.setAttribute("data-action", "edit");
    editBtn.setAttribute("aria-label", "Edit " + task.title);
    editBtn.textContent = "Edit";

    var deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-danger";
    deleteBtn.setAttribute("data-action", "delete");
    deleteBtn.setAttribute("aria-label", "Delete " + task.title);
    deleteBtn.textContent = "Delete";

    controls.appendChild(statusLabel);
    controls.appendChild(statusSelect);
    controls.appendChild(editBtn);
    controls.appendChild(deleteBtn);
    card.appendChild(controls);

    return card;
  }

  function render() {
    populateProjectOptions();
    var filtered = getFilteredTasks();
    el.taskList.innerHTML = "";

    if (tasks.length === 0) {
      el.taskList.hidden = true;
      el.emptyState.hidden = false;
      el.emptyState.textContent = corruptMode
        ? "No tasks are loaded because the saved board could not be read. Use the notice above to recover."
        : "No tasks yet. Create your first task to get started.";
    } else if (filtered.length === 0) {
      el.taskList.hidden = true;
      el.emptyState.hidden = false;
      el.emptyState.textContent = "No tasks match your search and filters. Try clearing them.";
    } else {
      el.emptyState.hidden = true;
      el.taskList.hidden = false;
      filtered.forEach(function (t) { el.taskList.appendChild(buildCard(t)); });
    }

    el.resultsCount.textContent = filtered.length + " of " + tasks.length + " tasks shown";
    updateControlsAvailability();
  }

  // ---- mutations -----------------------------------------------------------
  function handleDelete(id) {
    if (corruptMode || conflictMode) { showSaveError(blockedMessage()); return; }
    var idx = tasks.findIndex(function (t) { return t.id === id; });
    if (idx === -1) return;
    var removed = tasks[idx];
    var newTasks = tasks.slice(0, idx).concat(tasks.slice(idx + 1));
    var ok = commitTasks(newTasks);
    if (ok) {
      pendingDelete = { task: removed, index: idx };
      el.undoText.textContent = "Deleted \"" + removed.title + "\".";
      el.undoBar.hidden = false;
    }
  }

  function handleUndo() {
    if (!pendingDelete) return;
    if (corruptMode || conflictMode) { showSaveError(blockedMessage()); return; }
    var index = Math.min(pendingDelete.index, tasks.length);
    var newTasks = tasks.slice();
    newTasks.splice(index, 0, pendingDelete.task);
    var ok = commitTasks(newTasks);
    if (ok) {
      pendingDelete = null;
      el.undoBar.hidden = true;
    }
  }

  function handleStatusChange(id, newStatus) {
    if (corruptMode || conflictMode) { showSaveError(blockedMessage()); render(); return; }
    if (STATUSES.indexOf(newStatus) === -1) { render(); return; }
    var newTasks = tasks.map(function (t) { return t.id === id ? Object.assign({}, t, { status: newStatus }) : t; });
    commitTasks(newTasks);
  }

  // ---- form / modal -----------------------------------------------------------
  function clearFormErrors() {
    [el.titleError, el.projectError, el.dueDateError, el.tagsError].forEach(function (n) { n.textContent = ""; });
  }
  function setFieldError(node, msg) { node.textContent = msg; }

  function openModal(task) {
    editingTaskId = task ? task.id : null;
    lastFocusedElement = document.activeElement;
    el.modalTitle.textContent = task ? "Edit task" : "New task";
    el.taskForm.reset();
    clearFormErrors();
    if (task) {
      el.titleInput.value = task.title;
      el.projectInput.value = task.project;
      el.statusInput.value = task.status;
      el.priorityInput.value = task.priority;
      el.dueDateInput.value = task.dueDate;
      el.tagsInput.value = task.tags.join(", ");
    } else {
      el.statusInput.value = "todo";
      el.priorityInput.value = "medium";
    }
    el.modalOverlay.hidden = false;
    document.addEventListener("keydown", handleModalKeydown, true);
    el.titleInput.focus();
  }

  function closeModal() {
    el.modalOverlay.hidden = true;
    document.removeEventListener("keydown", handleModalKeydown, true);
    editingTaskId = null;
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function getFocusable() {
    return Array.prototype.slice.call(
      el.modalOverlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
  }

  function handleModalKeydown(e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeModal();
      return;
    }
    if (e.key === "Tab") {
      var focusable = getFocusable();
      if (!focusable.length) return;
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

  function handleFormSubmit(e) {
    e.preventDefault();
    if (corruptMode || conflictMode) { showSaveError(blockedMessage()); return; }
    clearFormErrors();

    var title = el.titleInput.value.trim();
    var project = el.projectInput.value.trim();
    var status = el.statusInput.value;
    var priority = el.priorityInput.value;
    var dueDate = el.dueDateInput.value.trim();
    var tagsRaw = el.tagsInput.value;

    var hasError = false;

    if (!title) { setFieldError(el.titleError, "Title is required."); hasError = true; }
    else if (title.length > 120) { setFieldError(el.titleError, "Title must be 120 characters or fewer."); hasError = true; }

    if (!project) { setFieldError(el.projectError, "Project is required."); hasError = true; }
    else if (project.length > 80) { setFieldError(el.projectError, "Project must be 80 characters or fewer."); hasError = true; }

    if (dueDate && !isValidDateString(dueDate)) {
      setFieldError(el.dueDateError, "Enter a real calendar date.");
      hasError = true;
    }

    var tagParts = tagsRaw.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var seenTags = new Map();
    var tagTooLong = false;
    tagParts.forEach(function (tag) {
      if (tag.length > 24) { tagTooLong = true; return; }
      var lower = tag.toLowerCase();
      if (!seenTags.has(lower)) seenTags.set(lower, tag);
    });
    var tags = Array.from(seenTags.values());
    if (tagTooLong) { setFieldError(el.tagsError, "Each tag must be 24 characters or fewer."); hasError = true; }
    else if (tags.length > 8) { setFieldError(el.tagsError, "A task may have at most 8 tags."); hasError = true; }

    if (hasError) return;

    var ok;
    if (editingTaskId) {
      var newTasks = tasks.map(function (t) {
        return t.id === editingTaskId ? Object.assign({}, t, { title: title, project: project, status: status, priority: priority, dueDate: dueDate, tags: tags }) : t;
      });
      ok = commitTasks(newTasks);
    } else {
      var id = genId();
      while (tasks.some(function (t) { return t.id === id; })) id = genId();
      var newTask = { id: id, title: title, project: project, status: status, priority: priority, dueDate: dueDate, tags: tags };
      ok = commitTasks(tasks.concat([newTask]));
    }
    if (ok) closeModal();
  }

  // ---- export / import -----------------------------------------------------------
  function handleExport() {
    var data = JSON.stringify({ schemaVersion: 1, tasks: tasks }, null, 2);
    var blob = new Blob([data], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "fieldnote-board-export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (corruptMode || conflictMode) { showImportBanner(blockedMessage(), true); return; }
    if (file.size > MAX_IMPORT_BYTES) {
      showImportBanner("Import failed: file exceeds the 1 MiB size limit.", true);
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result);
      if (new Blob([text]).size > MAX_IMPORT_BYTES) {
        showImportBanner("Import failed: file exceeds the 1 MiB size limit.", true);
        return;
      }
      var parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        showImportBanner("Import failed: file is not valid JSON.", true);
        return;
      }
      var result = validateBoardDocument(parsed);
      if (!result.ok) {
        showImportBanner("Import failed: " + result.error, true);
        return;
      }
      var confirmed = window.confirm(
        "Import will replace the current board (" + tasks.length + " tasks) with " +
        parsed.tasks.length + " tasks from this file. This cannot be undone. Continue?"
      );
      if (!confirmed) {
        showImportBanner("Import cancelled. The current board was not changed.", false);
        return;
      }
      var ok = commitTasks(parsed.tasks);
      if (ok) {
        showImportBanner("Board replaced with " + parsed.tasks.length + " imported tasks.", false);
        pendingDelete = null;
        el.undoBar.hidden = true;
      }
    };
    reader.onerror = function () {
      showImportBanner("Import failed: could not read the file.", true);
    };
    reader.readAsText(file);
  }

  function handleDownloadCorrupt() {
    var blob = new Blob([rawCorruptText], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "fieldnote-board-corrupt-backup.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleResetBoard() {
    var confirmed = window.confirm(
      "This will discard the unreadable saved data and start a fresh seeded board. " +
      "Download the original data first if you want to keep a copy. Continue?"
    );
    if (!confirmed) return;
    corruptMode = false;
    rawCorruptText = "";
    tasks = seedTasks();
    persist(tasks);
    hideStorageBanner();
    render();
  }

  // ---- cross-tab conflict -----------------------------------------------------------
  function handleStorageEvent(e) {
    if (e.key !== STORAGE_KEY) return;
    conflictMode = true;
    showConflictBanner();
  }

  function handleReloadBoard() {
    conflictMode = false;
    hideConflictBanner();
    hideStorageBanner();
    pendingDelete = null;
    el.undoBar.hidden = true;
    loadBoard();
    render();
  }

  // ---- wiring -----------------------------------------------------------
  function wire() {
    el.createTaskBtn.addEventListener("click", function () { openModal(null); });
    el.cancelFormBtn.addEventListener("click", closeModal);
    el.taskForm.addEventListener("submit", handleFormSubmit);
    el.modalOverlay.addEventListener("mousedown", function (e) {
      if (e.target === el.modalOverlay) closeModal();
    });

    el.taskList.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var card = e.target.closest('[data-testid="task-card"]');
      if (!card) return;
      var id = card.getAttribute("data-task-id");
      var action = btn.getAttribute("data-action");
      if (action === "edit") {
        var t = tasks.find(function (x) { return x.id === id; });
        if (t) openModal(t);
      } else if (action === "delete") {
        handleDelete(id);
      }
    });

    el.taskList.addEventListener("change", function (e) {
      var sel = e.target.closest('[data-action="status"]');
      if (!sel) return;
      var card = e.target.closest('[data-testid="task-card"]');
      if (!card) return;
      handleStatusChange(card.getAttribute("data-task-id"), sel.value);
    });

    el.undoBtn.addEventListener("click", handleUndo);

    el.searchInput.addEventListener("input", render);
    el.filterStatus.addEventListener("change", render);
    el.filterProject.addEventListener("change", render);
    el.filterPriority.addEventListener("change", render);

    el.exportBtn.addEventListener("click", handleExport);
    el.importFile.addEventListener("change", handleImportFile);

    el.downloadCorruptBtn.addEventListener("click", handleDownloadCorrupt);
    el.resetBoardBtn.addEventListener("click", handleResetBoard);
    el.reloadBoardBtn.addEventListener("click", handleReloadBoard);

    window.addEventListener("storage", handleStorageEvent);
  }

  function init() {
    cacheEls();
    wire();
    loadBoard();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
