(function () {
  "use strict";

  var STORAGE_KEY = "fieldnote-board:v1";
  var STATUSES = ["todo", "doing", "done"];
  var PRIORITIES = ["low", "medium", "high"];
  var STATUS_LABELS = { todo: "To do", doing: "Doing", done: "Done" };
  var PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High" };
  var MAX_IMPORT_BYTES = 1024 * 1024;

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  var state = { tasks: [] };
  var conflictState = false;
  var editingId = null;
  var pendingUndo = null; // { task, index }
  var lastFocusedBeforeModal = null;
  var rawCorruptText = null;

  // ---------------------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------------------
  var recoveryView = document.getElementById("recovery-view");
  var appShell = document.getElementById("app-shell");
  var alertsEl = document.getElementById("alerts");
  var boardEl = document.getElementById("board");
  var countsEl = document.getElementById("counts");
  var toastRegion = document.getElementById("toast-region");
  var undoRegion = document.getElementById("undo-region");

  var searchInput = document.getElementById("search-input");
  var filterStatus = document.getElementById("filter-status");
  var filterProject = document.getElementById("filter-project");
  var filterPriority = document.getElementById("filter-priority");

  var createBtn = document.getElementById("create-task-btn");
  var exportBtn = document.getElementById("export-btn");
  var importInput = document.getElementById("import-file");

  var overlay = document.getElementById("modal-overlay");
  var modal = document.getElementById("task-modal");
  var modalTitle = document.getElementById("modal-title");
  var modalClose = document.getElementById("modal-close");
  var modalCancel = document.getElementById("modal-cancel");
  var modalConflictNote = document.getElementById("modal-conflict-note");
  var form = document.getElementById("task-form");
  var saveTaskBtn = document.getElementById("save-task-btn");

  var downloadCorruptBtn = document.getElementById("download-corrupt-btn");
  var resetBoardBtn = document.getElementById("reset-board-btn");

  // ---------------------------------------------------------------------
  // Date helpers
  // ---------------------------------------------------------------------
  function toISO(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }
  function todayISO() {
    return toISO(new Date());
  }
  function addDays(n) {
    var d = new Date();
    d.setDate(d.getDate() + n);
    return toISO(d);
  }
  function isValidISODate(s) {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var parts = s.split("-");
    var y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2]);
    if (m < 1 || m > 12) return false;
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }
  function formatDueDate(iso) {
    var d = new Date(iso + "T00:00:00");
    try {
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (e) {
      return iso;
    }
  }

  // ---------------------------------------------------------------------
  // Id generation
  // ---------------------------------------------------------------------
  function fallbackId() {
    return "tsk-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }
  function generateUniqueId(existingTasks) {
    var id;
    var guard = 0;
    do {
      id = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : fallbackId();
      guard++;
    } while (existingTasks.some(function (t) { return t.id === id; }) && guard < 50);
    return id;
  }

  // ---------------------------------------------------------------------
  // Validation (shared by startup integrity check and import)
  // ---------------------------------------------------------------------
  function isPlainObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function validateTaskObject(t, seenIds) {
    if (!isPlainObject(t)) return "a task entry is not an object";
    if (typeof t.id !== "string" || t.id.length < 1 || t.id.length > 80) return "invalid task id";
    if (seenIds.has(t.id)) return 'duplicate task id "' + t.id + '"';
    if (typeof t.title !== "string" || t.title !== t.title.trim() || t.title.length < 1 || t.title.length > 120) return "invalid task title";
    if (typeof t.project !== "string" || t.project !== t.project.trim() || t.project.length < 1 || t.project.length > 80) return "invalid task project";
    if (STATUSES.indexOf(t.status) === -1) return "invalid task status";
    if (PRIORITIES.indexOf(t.priority) === -1) return "invalid task priority";
    if (typeof t.dueDate !== "string" || (t.dueDate !== "" && !isValidISODate(t.dueDate))) return "invalid task dueDate";
    if (!Array.isArray(t.tags) || t.tags.length > 8) return "invalid task tags";
    for (var i = 0; i < t.tags.length; i++) {
      var tag = t.tags[i];
      if (typeof tag !== "string" || tag !== tag.trim() || tag.length < 1 || tag.length > 24) return "invalid task tag";
    }
    return null;
  }

  function validateBoardDocument(doc) {
    if (!isPlainObject(doc)) return { ok: false, error: "the file is not a JSON object" };
    if (doc.schemaVersion !== 1) return { ok: false, error: "unsupported schemaVersion (expected 1)" };
    if (!Array.isArray(doc.tasks)) return { ok: false, error: "missing tasks array" };
    var seen = new Set();
    for (var i = 0; i < doc.tasks.length; i++) {
      var err = validateTaskObject(doc.tasks[i], seen);
      if (err) return { ok: false, error: err };
      seen.add(doc.tasks[i].id);
    }
    return { ok: true, tasks: doc.tasks };
  }

  // ---------------------------------------------------------------------
  // Seed data
  // ---------------------------------------------------------------------
  function createSeedTasks() {
    var tasks = [];
    function push(partial) {
      var id = generateUniqueId(tasks);
      tasks.push(Object.assign({ id: id }, partial));
    }
    push({ title: "Survey east wing foundation", project: "Harborview Renovation", status: "todo", priority: "high", dueDate: addDays(3), tags: ["site-visit", "structural"] });
    push({ title: "Order replacement joists", project: "Harborview Renovation", status: "todo", priority: "medium", dueDate: "", tags: ["materials"] });
    push({ title: "Client walkthrough prep", project: "Harborview Renovation", status: "doing", priority: "medium", dueDate: addDays(1), tags: ["client", "review"] });
    push({ title: "Permit renewal filing", project: "Harborview Renovation", status: "doing", priority: "high", dueDate: addDays(-2), tags: ["permit", "blocked"] });
    push({ title: "Finish electrical rough-in", project: "Harborview Renovation", status: "done", priority: "medium", dueDate: addDays(-10), tags: ["electrical"] });
    push({ title: "Calibrate soil moisture sensors", project: "Riverside Sensor Deploy", status: "todo", priority: "medium", dueDate: "", tags: ["sensors", "calibration"] });
    push({ title: "Deploy gateway nodes to site B", project: "Riverside Sensor Deploy", status: "doing", priority: "high", dueDate: addDays(5), tags: ["sensors", "site-visit"] });
    push({ title: "Draft Q3 sensor coverage report", project: "Riverside Sensor Deploy", status: "done", priority: "low", dueDate: addDays(-15), tags: ["review"] });
    return tasks;
  }

  // ---------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------
  function persistTasks(tasks) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, tasks: tasks }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err };
    }
  }

  function applyMutation(newTasks, opts) {
    opts = opts || {};
    var result = persistTasks(newTasks);
    if (result.ok) {
      state.tasks = newTasks;
      hideErrorBanner();
    } else {
      var detail = opts.keepFormOpen
        ? "This change was not saved. Local storage may be full or unavailable. Your edits are still shown in the form."
        : "This change was not saved. Local storage may be full or unavailable. The board shown reflects the last saved version.";
      showErrorBanner(detail);
    }
    render();
    return result.ok;
  }

  // ---------------------------------------------------------------------
  // Banners / alerts
  // ---------------------------------------------------------------------
  function showConflictBanner() {
    if (document.getElementById("conflict-banner")) return;
    var div = document.createElement("div");
    div.id = "conflict-banner";
    div.className = "banner banner-conflict";
    div.setAttribute("role", "alert");
    var p = document.createElement("p");
    p.textContent = "This board was changed in another tab. Reload to see the latest version before making more changes.";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = "Reload board";
    btn.addEventListener("click", function () { window.location.reload(); });
    div.appendChild(p);
    div.appendChild(btn);
    alertsEl.appendChild(div);
  }

  function showErrorBanner(message) {
    hideErrorBanner();
    var div = document.createElement("div");
    div.id = "error-banner";
    div.className = "banner banner-error";
    div.setAttribute("role", "alert");
    var p = document.createElement("p");
    p.textContent = message;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = "Dismiss";
    btn.setAttribute("aria-label", "Dismiss error message");
    btn.addEventListener("click", hideErrorBanner);
    div.appendChild(p);
    div.appendChild(btn);
    alertsEl.appendChild(div);
  }
  function hideErrorBanner() {
    var el = document.getElementById("error-banner");
    if (el) el.remove();
  }

  var toastTimer = null;
  function showToast(message) {
    toastRegion.textContent = "";
    var div = document.createElement("div");
    div.className = "toast";
    var span = document.createElement("span");
    span.textContent = message;
    div.appendChild(span);
    toastRegion.appendChild(div);
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastRegion.textContent = "";
    }, 4000);
  }

  function showUndoBar(title) {
    undoRegion.textContent = "";
    var div = document.createElement("div");
    div.className = "undo-bar";
    var span = document.createElement("span");
    span.textContent = 'Deleted "' + title + '".';
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-testid", "undo-delete");
    btn.textContent = "Undo";
    btn.addEventListener("click", handleUndo);
    div.appendChild(span);
    div.appendChild(btn);
    undoRegion.appendChild(div);
  }
  function clearUndoBar() {
    undoRegion.textContent = "";
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------
  function getFilteredTasks() {
    var q = searchInput.value.trim().toLowerCase();
    var st = filterStatus.value;
    var pr = filterPriority.value;
    var pj = filterProject.value;
    return state.tasks.filter(function (t) {
      if (st !== "all" && t.status !== st) return false;
      if (pr !== "all" && t.priority !== pr) return false;
      if (pj !== "all" && t.project !== pj) return false;
      if (q) {
        var hay = (t.title + " " + t.project + " " + t.tags.join(" ")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function updateProjectFilterOptions() {
    var projects = Array.from(new Set(state.tasks.map(function (t) { return t.project; }))).sort(function (a, b) {
      return a.localeCompare(b);
    });
    var current = filterProject.value;
    filterProject.textContent = "";
    var allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "All projects";
    filterProject.appendChild(allOpt);
    projects.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      filterProject.appendChild(opt);
    });
    filterProject.value = projects.indexOf(current) !== -1 || current === "all" ? current : "all";
  }

  function buildTaskCard(task) {
    var card = document.createElement("article");
    card.className = "task-card";
    card.setAttribute("data-testid", "task-card");
    card.setAttribute("data-task-id", task.id);

    var top = document.createElement("div");
    top.className = "task-card-top";
    var h3 = document.createElement("h3");
    h3.className = "task-title";
    h3.textContent = task.title;
    var badge = document.createElement("span");
    badge.className = "priority-badge priority-" + task.priority;
    badge.textContent = PRIORITY_LABELS[task.priority];
    top.appendChild(h3);
    top.appendChild(badge);
    card.appendChild(top);

    var project = document.createElement("p");
    project.className = "task-project";
    project.textContent = task.project;
    card.appendChild(project);

    var due = document.createElement("p");
    due.className = "task-due";
    if (task.dueDate) {
      due.textContent = "Due " + formatDueDate(task.dueDate);
      if (task.status !== "done" && task.dueDate < todayISO()) {
        due.classList.add("overdue");
        due.textContent += " (overdue)";
      }
    } else {
      due.textContent = "No due date";
    }
    card.appendChild(due);

    if (task.tags.length) {
      var ul = document.createElement("ul");
      ul.className = "task-tags";
      task.tags.forEach(function (tag) {
        var li = document.createElement("li");
        li.textContent = tag;
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }

    var controls = document.createElement("div");
    controls.className = "task-controls";

    var statusLabel = document.createElement("label");
    statusLabel.className = "sr-only-file";
    statusLabel.setAttribute("for", "status-" + task.id);
    statusLabel.textContent = "Status for " + task.title;
    var statusSelect = document.createElement("select");
    statusSelect.id = "status-" + task.id;
    statusSelect.setAttribute("data-action", "status");
    statusSelect.setAttribute("data-task-id", task.id);
    statusSelect.disabled = conflictState;
    STATUSES.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s;
      opt.textContent = STATUS_LABELS[s];
      if (s === task.status) opt.selected = true;
      statusSelect.appendChild(opt);
    });

    var editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.setAttribute("data-action", "edit");
    editBtn.setAttribute("data-task-id", task.id);
    editBtn.setAttribute("aria-label", "Edit " + task.title);
    editBtn.textContent = "Edit";
    editBtn.disabled = conflictState;

    var deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.setAttribute("data-action", "delete");
    deleteBtn.setAttribute("data-task-id", task.id);
    deleteBtn.setAttribute("aria-label", "Delete " + task.title);
    deleteBtn.textContent = "Delete";
    deleteBtn.disabled = conflictState;

    controls.appendChild(statusLabel);
    controls.appendChild(statusSelect);
    controls.appendChild(editBtn);
    controls.appendChild(deleteBtn);
    card.appendChild(controls);

    return card;
  }

  function render() {
    updateProjectFilterOptions();

    var filtered = getFilteredTasks();
    countsEl.textContent = "Showing " + filtered.length + " of " + state.tasks.length + " tasks";

    boardEl.textContent = "";

    if (state.tasks.length > 0 && filtered.length === 0) {
      var noResults = document.createElement("div");
      noResults.className = "no-results";
      var p = document.createElement("p");
      p.textContent = "No tasks match your search and filters.";
      var clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "btn";
      clearBtn.textContent = "Clear search and filters";
      clearBtn.addEventListener("click", function () {
        searchInput.value = "";
        filterStatus.value = "all";
        filterProject.value = "all";
        filterPriority.value = "all";
        render();
      });
      noResults.appendChild(p);
      noResults.appendChild(clearBtn);
      boardEl.appendChild(noResults);
    } else {
      STATUSES.forEach(function (status) {
        var col = document.createElement("section");
        col.className = "column";
        col.setAttribute("data-status", status);
        col.setAttribute("aria-label", STATUS_LABELS[status] + " column");

        var header = document.createElement("div");
        header.className = "column-header";
        var h2 = document.createElement("h2");
        h2.textContent = STATUS_LABELS[status];
        var count = document.createElement("span");
        count.className = "column-count";
        var colTasks = filtered.filter(function (t) { return t.status === status; });
        count.textContent = String(colTasks.length);
        header.appendChild(h2);
        header.appendChild(count);
        col.appendChild(header);

        if (colTasks.length === 0) {
          var empty = document.createElement("p");
          empty.className = "column-empty";
          empty.textContent = state.tasks.filter(function (t) { return t.status === status; }).length === 0
            ? "No tasks yet."
            : "No matching tasks.";
          col.appendChild(empty);
        } else {
          var list = document.createElement("ul");
          list.className = "column-list";
          colTasks.forEach(function (task) {
            var li = document.createElement("li");
            li.appendChild(buildTaskCard(task));
            list.appendChild(li);
          });
          col.appendChild(list);
        }
        boardEl.appendChild(col);
      });
    }

    createBtn.disabled = conflictState;
    importInput.disabled = conflictState;
    saveTaskBtn.disabled = conflictState;
    modalConflictNote.hidden = !conflictState;
  }

  // ---------------------------------------------------------------------
  // Form validation + submit
  // ---------------------------------------------------------------------
  function clearFormErrors() {
    ["title", "project", "dueDate", "tags"].forEach(function (key) {
      var errEl = document.getElementById("err-" + key);
      if (errEl) errEl.textContent = "";
      var input = form.elements[key];
      if (input) input.removeAttribute("aria-invalid");
    });
  }

  function validateFormInput(raw) {
    var errors = {};
    var title = raw.title.trim();
    if (!title) errors.title = "Title is required.";
    else if (title.length > 120) errors.title = "Title must be 120 characters or fewer.";

    var project = raw.project.trim();
    if (!project) errors.project = "Project is required.";
    else if (project.length > 80) errors.project = "Project must be 80 characters or fewer.";

    var dueDate = raw.dueDate.trim();
    if (dueDate !== "" && !isValidISODate(dueDate)) errors.dueDate = "Enter a real calendar date (YYYY-MM-DD).";

    var seen = new Set();
    var tags = [];
    var tagError = null;
    raw.tags.split(",").map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; }).forEach(function (tag) {
      if (tag.length > 24) tagError = "Each tag must be 24 characters or fewer.";
      var key = tag.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        tags.push(tag);
      }
    });
    if (tags.length > 8) tagError = "Use at most 8 tags.";
    tags = tags.slice(0, 8);
    if (tagError) errors.tags = tagError;

    var valid = Object.keys(errors).length === 0;
    return {
      valid: valid,
      errors: errors,
      data: {
        title: title,
        project: project,
        status: raw.status,
        priority: raw.priority,
        dueDate: dueDate,
        tags: tags
      }
    };
  }

  function renderFormErrors(errors) {
    clearFormErrors();
    Object.keys(errors).forEach(function (key) {
      var errEl = document.getElementById("err-" + key);
      if (errEl) errEl.textContent = errors[key];
      var input = form.elements[key];
      if (input) input.setAttribute("aria-invalid", "true");
    });
  }

  function fillForm(task) {
    form.elements.title.value = task ? task.title : "";
    form.elements.project.value = task ? task.project : "";
    form.elements.status.value = task ? task.status : "todo";
    form.elements.priority.value = task ? task.priority : "medium";
    form.elements.dueDate.value = task ? task.dueDate : "";
    form.elements.tags.value = task ? task.tags.join(", ") : "";
  }

  // ---------------------------------------------------------------------
  // Modal control
  // ---------------------------------------------------------------------
  function getFocusable() {
    return Array.prototype.slice.call(
      modal.querySelectorAll('button, input, select, [href], [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
  }

  function onModalKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key === "Tab") {
      var focusable = getFocusable();
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

  function openModal(mode, task) {
    lastFocusedBeforeModal = document.activeElement;
    editingId = mode === "edit" ? task.id : null;
    fillForm(task || null);
    clearFormErrors();
    modalTitle.textContent = mode === "edit" ? "Edit task" : "New task";
    modalConflictNote.hidden = !conflictState;
    saveTaskBtn.disabled = conflictState;
    overlay.hidden = false;
    document.body.classList.add("modal-open");
    document.addEventListener("keydown", onModalKeydown);
    form.elements.title.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.classList.remove("modal-open");
    document.removeEventListener("keydown", onModalKeydown);
    editingId = null;
    if (lastFocusedBeforeModal && document.contains(lastFocusedBeforeModal)) {
      lastFocusedBeforeModal.focus();
    }
  }

  // ---------------------------------------------------------------------
  // Event handlers: create / edit / delete / undo / status
  // ---------------------------------------------------------------------
  createBtn.addEventListener("click", function () {
    if (conflictState) return;
    openModal("create", null);
  });
  modalClose.addEventListener("click", closeModal);
  modalCancel.addEventListener("click", closeModal);
  overlay.addEventListener("mousedown", function (e) {
    if (e.target === overlay) closeModal();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (conflictState) return;
    var raw = {
      title: form.elements.title.value,
      project: form.elements.project.value,
      status: form.elements.status.value,
      priority: form.elements.priority.value,
      dueDate: form.elements.dueDate.value,
      tags: form.elements.tags.value
    };
    var result = validateFormInput(raw);
    if (!result.valid) {
      renderFormErrors(result.errors);
      var firstKey = Object.keys(result.errors)[0];
      var el = form.elements[firstKey];
      if (el) el.focus();
      return;
    }
    clearFormErrors();

    var newTasks;
    if (editingId) {
      newTasks = state.tasks.map(function (t) {
        return t.id === editingId ? Object.assign({}, t, result.data) : t;
      });
    } else {
      var id = generateUniqueId(state.tasks);
      newTasks = state.tasks.concat([Object.assign({ id: id }, result.data)]);
    }
    var wasEditing = !!editingId;
    var ok = applyMutation(newTasks, { keepFormOpen: true });
    if (ok) {
      closeModal();
      showToast(wasEditing ? "Task updated." : "Task created.");
    }
  });

  boardEl.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    if (conflictState) return;
    var taskId = btn.getAttribute("data-task-id");
    var action = btn.getAttribute("data-action");
    if (action === "edit") {
      var task = state.tasks.find(function (t) { return t.id === taskId; });
      if (task) openModal("edit", task);
    } else if (action === "delete") {
      handleDelete(taskId);
    }
  });

  boardEl.addEventListener("change", function (e) {
    var el = e.target;
    if (el.matches('select[data-action="status"]')) {
      if (conflictState) {
        render();
        return;
      }
      var taskId = el.getAttribute("data-task-id");
      var newStatus = el.value;
      var newTasks = state.tasks.map(function (t) {
        return t.id === taskId ? Object.assign({}, t, { status: newStatus }) : t;
      });
      applyMutation(newTasks);
    }
  });

  function handleDelete(taskId) {
    var idx = state.tasks.findIndex(function (t) { return t.id === taskId; });
    if (idx === -1) return;
    var removed = state.tasks[idx];
    var newTasks = state.tasks.slice(0, idx).concat(state.tasks.slice(idx + 1));
    var ok = applyMutation(newTasks);
    if (ok) {
      pendingUndo = { task: removed, index: idx };
      showUndoBar(removed.title);
    }
  }

  function handleUndo() {
    if (!pendingUndo || conflictState) return;
    var task = pendingUndo.task;
    var index = pendingUndo.index;
    var newTasks = state.tasks.slice();
    var insertAt = Math.min(index, newTasks.length);
    newTasks.splice(insertAt, 0, task);
    var ok = applyMutation(newTasks);
    if (ok) {
      pendingUndo = null;
      clearUndoBar();
      showToast("Task restored.");
    }
  }

  // ---------------------------------------------------------------------
  // Search / filters
  // ---------------------------------------------------------------------
  searchInput.addEventListener("input", render);
  filterStatus.addEventListener("change", render);
  filterProject.addEventListener("change", render);
  filterPriority.addEventListener("change", render);

  // ---------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------
  exportBtn.addEventListener("click", function () {
    var doc = { schemaVersion: 1, tasks: state.tasks };
    var blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "fieldnote-board-export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // ---------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------
  importInput.addEventListener("change", function () {
    var file = importInput.files && importInput.files[0];
    if (!file) return;
    if (conflictState) {
      importInput.value = "";
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      showErrorBanner("Import failed: file exceeds the 1 MiB size limit.");
      importInput.value = "";
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result);
      var parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        showErrorBanner("Import failed: the file is not valid JSON.");
        importInput.value = "";
        return;
      }
      var validation = validateBoardDocument(parsed);
      if (!validation.ok) {
        showErrorBanner("Import failed: " + validation.error + ". The current board was not changed.");
        importInput.value = "";
        return;
      }
      var count = validation.tasks.length;
      var confirmed = window.confirm(
        "Replace the current board (" + state.tasks.length + " tasks) with the imported file (" + count + " tasks)? This cannot be undone."
      );
      if (!confirmed) {
        importInput.value = "";
        return;
      }
      var ok = applyMutation(validation.tasks.slice());
      if (ok) {
        pendingUndo = null;
        clearUndoBar();
        showToast("Board imported successfully.");
      }
      importInput.value = "";
    };
    reader.onerror = function () {
      showErrorBanner("Import failed: could not read the file.");
      importInput.value = "";
    };
    reader.readAsText(file);
  });

  // ---------------------------------------------------------------------
  // Cross-tab conflict detection
  // ---------------------------------------------------------------------
  window.addEventListener("storage", function (e) {
    if (e.key === STORAGE_KEY || e.key === null) {
      if (!conflictState) {
        conflictState = true;
        showConflictBanner();
        render();
      }
    }
  });

  // ---------------------------------------------------------------------
  // Recovery view (corrupt storage on startup)
  // ---------------------------------------------------------------------
  function showRecovery(show) {
    recoveryView.hidden = !show;
    appShell.hidden = show;
  }

  downloadCorruptBtn.addEventListener("click", function () {
    var blob = new Blob([rawCorruptText == null ? "" : rawCorruptText], { type: "application/octet-stream" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "fieldnote-board-corrupt-backup.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  resetBoardBtn.addEventListener("click", function () {
    var confirmed = window.confirm(
      "This will permanently delete the unreadable data in this browser and replace it with a fresh sample board. Continue?"
    );
    if (!confirmed) return;
    var seeded = createSeedTasks();
    var result = persistTasks(seeded);
    state.tasks = seeded;
    rawCorruptText = null;
    showRecovery(false);
    render();
    if (!result.ok) {
      showErrorBanner("The board was reset in this session, but could not be saved to storage. It may be lost on reload.");
    }
  });

  // ---------------------------------------------------------------------
  // Reduced motion
  // ---------------------------------------------------------------------
  function applyReducedMotionPreference() {
    var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    function apply() {
      document.documentElement.classList.toggle("reduced-motion", mq.matches);
    }
    apply();
    if (mq.addEventListener) mq.addEventListener("change", apply);
    else if (mq.addListener) mq.addListener(apply);
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------
  function init() {
    applyReducedMotionPreference();

    var raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      var seeded = createSeedTasks();
      state.tasks = seeded;
      var result = persistTasks(seeded);
      showRecovery(false);
      render();
      if (!result.ok) {
        showErrorBanner("The starter board could not be saved to storage. It may be lost on reload.");
      }
      return;
    }

    var parsed;
    var parseFailed = false;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parseFailed = true;
    }

    if (!parseFailed) {
      var validation = validateBoardDocument(parsed);
      if (validation.ok) {
        state.tasks = validation.tasks;
        showRecovery(false);
        render();
        return;
      }
    }

    rawCorruptText = raw;
    showRecovery(true);
  }

  init();
})();
