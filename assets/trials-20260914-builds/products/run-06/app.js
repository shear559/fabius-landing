(function () {
  "use strict";

  var STORAGE_KEY = "fieldnote-board:v1";
  var LIMITS = { id: 80, title: 120, project: 80, tag: 24, tagsMax: 8 };
  var ENUMS = { status: ["todo", "doing", "done"], priority: ["low", "medium", "high"] };
  var STATUS_LABELS = { todo: "To do", doing: "Doing", done: "Done" };

  var state = {
    board: { schemaVersion: 1, tasks: [] },
    filters: { search: "", status: "all", project: "all", priority: "all" },
    corrupt: false,
    rawCorrupt: null,
    conflict: false,
    saveError: false,
    pendingUndo: null,
  };

  // ---------- DOM refs (resolved at init) ----------
  var els = {};

  // ---------- utilities ----------
  function qs(sel, root) { return (root || document).querySelector(sel); }

  function uid() {
    var id;
    var tries = 0;
    do {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        id = window.crypto.randomUUID();
      } else {
        id = "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      }
      tries++;
    } while (state.board.tasks.some(function (t) { return t.id === id; }) && tries < 5);
    return id;
  }

  function isValidISODate(s) {
    if (s === "") return true;
    if (typeof s !== "string") return false;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return false;
    var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    if (mo < 1 || mo > 12) return false;
    var daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    if (d < 1 || d > daysInMonth) return false;
    return true;
  }

  function addDaysISO(n) {
    var d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  // ---------- validation: task shape (startup + import) ----------
  function validateTaskShape(t) {
    var errs = [];
    if (typeof t !== "object" || t === null || Array.isArray(t)) {
      return { valid: false, errs: ["not an object"] };
    }
    var id = t.id, title = t.title, project = t.project, dueDate = t.dueDate, tags = t.tags;

    if (typeof id !== "string" || id.trim() !== id || id.length < 1 || id.length > LIMITS.id) errs.push("invalid id");
    if (typeof title !== "string" || title.trim() !== title || title.length < 1 || title.length > LIMITS.title) errs.push("invalid title");
    if (typeof project !== "string" || project.trim() !== project || project.length < 1 || project.length > LIMITS.project) errs.push("invalid project");
    if (ENUMS.status.indexOf(t.status) === -1) errs.push("invalid status");
    if (ENUMS.priority.indexOf(t.priority) === -1) errs.push("invalid priority");
    if (typeof dueDate !== "string" || !isValidISODate(dueDate)) errs.push("invalid dueDate");

    if (!Array.isArray(tags) || tags.length > LIMITS.tagsMax) {
      errs.push("invalid tags");
    } else {
      for (var i = 0; i < tags.length; i++) {
        var tag = tags[i];
        if (typeof tag !== "string" || tag.trim() !== tag || tag.length < 1 || tag.length > LIMITS.tag) {
          errs.push("invalid tag");
          break;
        }
      }
    }

    if (errs.length) return { valid: false, errs: errs };
    return {
      valid: true,
      errs: [],
      normalized: { id: id, title: title, project: project, status: t.status, priority: t.priority, dueDate: dueDate, tags: tags.slice() },
    };
  }

  function validateBoardShape(doc) {
    if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
      return { valid: false, errors: ["board is not an object"], tasks: null };
    }
    var errors = [];
    if (doc.schemaVersion !== 1) errors.push("unsupported schemaVersion");
    if (!Array.isArray(doc.tasks)) {
      errors.push("tasks is not an array");
      return { valid: false, errors: errors, tasks: null };
    }
    var seenIds = {};
    var tasks = [];
    for (var i = 0; i < doc.tasks.length; i++) {
      var r = validateTaskShape(doc.tasks[i]);
      if (!r.valid) {
        errors.push("task[" + i + "]: " + r.errs.join(", "));
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(seenIds, r.normalized.id)) {
        errors.push("task[" + i + "]: duplicate id");
        continue;
      }
      seenIds[r.normalized.id] = true;
      tasks.push(r.normalized);
    }
    var valid = errors.length === 0;
    return { valid: valid, errors: errors, tasks: valid ? tasks : null };
  }

  // ---------- validation: create/edit form input ----------
  function normalizeTagsFromText(text) {
    var parts = String(text || "").split(",");
    var seen = {};
    var tags = [];
    var tooLong = false;
    for (var i = 0; i < parts.length; i++) {
      var tag = parts[i].trim();
      if (!tag) continue;
      if (tag.length > LIMITS.tag) { tooLong = true; continue; }
      var key = tag.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(seen, key)) continue;
      seen[key] = true;
      tags.push(tag);
    }
    var tooMany = tags.length > LIMITS.tagsMax;
    return { tags: tags.slice(0, LIMITS.tagsMax), tooLong: tooLong, tooMany: tooMany };
  }

  function validateFormInput(input) {
    var errors = {};
    var title = String(input.title || "").trim();
    if (!title) errors.title = "Title is required.";
    else if (title.length > LIMITS.title) errors.title = "Title must be " + LIMITS.title + " characters or fewer.";

    var project = String(input.project || "").trim();
    if (!project) errors.project = "Project is required.";
    else if (project.length > LIMITS.project) errors.project = "Project must be " + LIMITS.project + " characters or fewer.";

    var dueDate = String(input.dueDate || "").trim();
    if (dueDate && !isValidISODate(dueDate)) errors.dueDate = "Enter a real date (YYYY-MM-DD).";

    var tagsResult = normalizeTagsFromText(input.tagsText);
    if (tagsResult.tooLong) errors.tags = "Each tag must be " + LIMITS.tag + " characters or fewer.";
    else if (tagsResult.tooMany) errors.tags = "Up to " + LIMITS.tagsMax + " tags allowed.";

    var valid = Object.keys(errors).length === 0;
    return {
      valid: valid,
      errors: errors,
      normalized: valid ? { title: title, project: project, dueDate: dueDate, tags: tagsResult.tags } : null,
    };
  }

  // ---------- storage ----------
  function tryPersist(board) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
      return true;
    } catch (e) {
      return false;
    }
  }

  function buildSeedBoard() {
    function mk(title, project, status, priority, dueDate, tags) {
      return { id: uid(), title: title, project: project, status: status, priority: priority, dueDate: dueDate, tags: tags };
    }
    var tasks = [
      mk("Walk the north boundary fence line", "Riverbank Survey", "todo", "high", addDaysISO(2), ["fence", "site-visit"]),
      mk("Photograph erosion at bend 4", "Riverbank Survey", "doing", "high", addDaysISO(-1), ["erosion", "photo"]),
      mk("Log water samples from stations 1-3", "Riverbank Survey", "todo", "medium", addDaysISO(5), ["water", "samples"]),
      mk("Draft survey summary for the county", "Riverbank Survey", "done", "medium", "", ["report"]),
      mk("Order replacement trail markers", "Trailhead Signage Refresh", "todo", "low", addDaysISO(10), ["supplies"]),
      mk("Repaint the east trailhead kiosk map", "Trailhead Signage Refresh", "doing", "medium", addDaysISO(3), ["paint", "kiosk"]),
      mk("Confirm accessible route signage wording", "Trailhead Signage Refresh", "done", "high", "", ["accessibility", "copy"]),
    ];
    return { schemaVersion: 1, tasks: tasks };
  }

  function loadBoard() {
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
    if (raw === null) {
      var seeded = buildSeedBoard();
      var ok = tryPersist(seeded);
      return { board: seeded, corrupt: false, rawCorrupt: null, persistedOk: ok };
    }
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return { board: null, corrupt: true, rawCorrupt: raw, persistedOk: true };
    }
    var check = validateBoardShape(parsed);
    if (!check.valid) {
      return { board: null, corrupt: true, rawCorrupt: raw, persistedOk: true };
    }
    return { board: { schemaVersion: 1, tasks: check.tasks }, corrupt: false, rawCorrupt: null, persistedOk: true };
  }

  function persistAndRender() {
    var ok = tryPersist(state.board);
    state.saveError = !ok;
    renderAll();
  }

  // ---------- board queries ----------
  function findTask(id) {
    for (var i = 0; i < state.board.tasks.length; i++) {
      if (state.board.tasks[i].id === id) return state.board.tasks[i];
    }
    return null;
  }

  function getFilteredTasks() {
    var f = state.filters;
    var q = f.search.trim().toLowerCase();
    return state.board.tasks.filter(function (t) {
      if (f.status !== "all" && t.status !== f.status) return false;
      if (f.project !== "all" && t.project !== f.project) return false;
      if (f.priority !== "all" && t.priority !== f.priority) return false;
      if (q) {
        var hay = (t.title + " " + t.project + " " + t.tags.join(" ")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function guardBlocked() {
    return state.corrupt || state.conflict;
  }

  // ---------- rendering ----------
  function renderAll() {
    renderBanners();
    renderProjectFilterOptions();
    renderBoard();
    updateControlsDisabledState();
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function makeBtn(cls, text, testid, ariaLabel) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.textContent = text;
    if (testid) b.setAttribute("data-testid", testid);
    if (ariaLabel) b.setAttribute("aria-label", ariaLabel);
    return b;
  }

  function renderBanners() {
    clearNode(els.banners);
    if (state.corrupt) els.banners.appendChild(buildCorruptBanner());
    if (state.conflict) els.banners.appendChild(buildConflictBanner());
    if (state.saveError) els.banners.appendChild(buildSaveErrorBanner());
  }

  function buildCorruptBanner() {
    var wrap = document.createElement("div");
    wrap.className = "banner banner--danger";
    var text = document.createElement("span");
    text.className = "banner__text";
    text.textContent = "Your saved board could not be read. The original data has been preserved and nothing has been overwritten.";
    var actions = document.createElement("div");
    actions.className = "banner__actions";
    var dl = makeBtn("btn btn--secondary", "Download raw data", "download-raw");
    dl.addEventListener("click", downloadRawCorrupt);
    var reset = makeBtn("btn btn--danger", "Reset board", "reset-board");
    reset.addEventListener("click", resetBoard);
    actions.appendChild(dl);
    actions.appendChild(reset);
    wrap.appendChild(text);
    wrap.appendChild(actions);
    return wrap;
  }

  function buildConflictBanner() {
    var wrap = document.createElement("div");
    wrap.className = "banner banner--warning";
    var text = document.createElement("span");
    text.className = "banner__text";
    text.textContent = "This board changed in another tab. Reload to see the latest version before making changes.";
    var actions = document.createElement("div");
    actions.className = "banner__actions";
    var reload = makeBtn("btn btn--primary", "Reload board", "reload-board");
    reload.addEventListener("click", function () { window.location.reload(); });
    actions.appendChild(reload);
    wrap.appendChild(text);
    wrap.appendChild(actions);
    return wrap;
  }

  function buildSaveErrorBanner() {
    var wrap = document.createElement("div");
    wrap.className = "banner banner--danger";
    var text = document.createElement("span");
    text.className = "banner__text";
    text.setAttribute("data-testid", "save-error-notice");
    text.textContent = "Your last change could not be saved to this browser's storage. It exists only in this tab and will be lost on reload.";
    wrap.appendChild(text);
    return wrap;
  }

  function downloadRawCorrupt() {
    if (typeof state.rawCorrupt !== "string") return;
    triggerDownload(state.rawCorrupt, "fieldnote-board-corrupt.txt", "text/plain");
  }

  function triggerDownload(content, filename, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  function resetBoard() {
    var ok = window.confirm("Reset the board? This permanently discards the unreadable data.");
    if (!ok) return;
    var fresh = { schemaVersion: 1, tasks: [] };
    state.board = fresh;
    state.corrupt = false;
    state.rawCorrupt = null;
    state.pendingUndo = null;
    clearNode(els.toastRegion);
    var persisted = tryPersist(fresh);
    state.saveError = !persisted;
    renderAll();
  }

  function renderProjectFilterOptions() {
    var projects = [];
    var seen = {};
    state.board.tasks.forEach(function (t) {
      if (!seen[t.project]) { seen[t.project] = true; projects.push(t.project); }
    });
    projects.sort(function (a, b) { return a.localeCompare(b); });

    var select = els.filterProject;
    var prevValue = state.filters.project;
    clearNode(select);
    var optAll = document.createElement("option");
    optAll.value = "all";
    optAll.textContent = "All projects";
    select.appendChild(optAll);
    projects.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      select.appendChild(opt);
    });
    if (prevValue !== "all" && projects.indexOf(prevValue) === -1) {
      state.filters.project = "all";
      select.value = "all";
    } else {
      select.value = prevValue;
    }
  }

  function renderCount(matching, total) {
    els.taskCount.textContent = matching + " of " + total + (total === 1 ? " task" : " tasks");
  }

  function renderBoard() {
    clearNode(els.board);

    if (state.corrupt) {
      els.board.appendChild(buildMessageState(
        "Board unavailable",
        "Resolve the recovery notice above to continue."
      ));
      renderCount(0, 0);
      return;
    }

    var total = state.board.tasks.length;
    var filtered = getFilteredTasks();
    renderCount(filtered.length, total);

    if (total === 0) {
      els.board.appendChild(buildMessageState(
        "No tasks yet",
        "Create your first task to start this board."
      ));
      return;
    }

    if (filtered.length === 0) {
      var noRes = buildMessageState("No matching tasks", "Try a different search or clear your filters.");
      noRes.classList.add("no-results");
      var clearBtn = makeBtn("btn btn--secondary", "Clear filters", "clear-filters-inline");
      clearBtn.addEventListener("click", clearFilters);
      noRes.appendChild(clearBtn);
      els.board.appendChild(noRes);
      return;
    }

    ["todo", "doing", "done"].forEach(function (statusKey) {
      var tasksForColumn = filtered.filter(function (t) { return t.status === statusKey; });
      els.board.appendChild(buildColumn(statusKey, tasksForColumn));
    });
  }

  function buildMessageState(heading, body) {
    var wrap = document.createElement("div");
    wrap.className = "empty-state";
    var h = document.createElement("h2");
    h.textContent = heading;
    var p = document.createElement("p");
    p.textContent = body;
    wrap.appendChild(h);
    wrap.appendChild(p);
    return wrap;
  }

  function buildColumn(statusKey, tasks) {
    var col = document.createElement("section");
    col.className = "column";
    col.setAttribute("aria-label", STATUS_LABELS[statusKey] + " column");

    var header = document.createElement("div");
    header.className = "column__header";
    var title = document.createElement("h2");
    title.className = "column__title";
    title.textContent = STATUS_LABELS[statusKey];
    var count = document.createElement("span");
    count.className = "column__count";
    count.textContent = String(tasks.length);
    header.appendChild(title);
    header.appendChild(count);
    col.appendChild(header);

    if (tasks.length === 0) {
      var empty = document.createElement("p");
      empty.className = "column__empty";
      empty.style.color = "var(--muted)";
      empty.style.fontSize = "13px";
      empty.textContent = "Nothing here.";
      col.appendChild(empty);
    }

    tasks.forEach(function (task) {
      col.appendChild(buildTaskCard(task));
    });
    return col;
  }

  function buildTaskCard(task) {
    var blocked = guardBlocked();
    var card = document.createElement("article");
    card.className = "task-card";
    card.setAttribute("data-testid", "task-card");
    card.setAttribute("data-task-id", task.id);

    var top = document.createElement("div");
    top.className = "task-card__top";
    var titleWrap = document.createElement("div");
    var h3 = document.createElement("h3");
    h3.className = "task-card__title";
    h3.textContent = task.title;
    var proj = document.createElement("p");
    proj.className = "task-card__project";
    proj.textContent = task.project;
    titleWrap.appendChild(h3);
    titleWrap.appendChild(proj);

    var actions = document.createElement("div");
    actions.className = "task-card__actions";
    var editBtn = makeBtn("card-action", "Edit", null, "Edit " + task.title);
    editBtn.setAttribute("data-action", "edit");
    editBtn.disabled = blocked;
    var delBtn = makeBtn("card-action", "Delete", null, "Delete " + task.title);
    delBtn.setAttribute("data-action", "delete");
    delBtn.disabled = blocked;
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    top.appendChild(titleWrap);
    top.appendChild(actions);

    var meta = document.createElement("div");
    meta.className = "task-card__meta";

    var priorityPill = document.createElement("span");
    priorityPill.className = "pill pill--priority-" + task.priority;
    priorityPill.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    meta.appendChild(priorityPill);

    if (task.dueDate) {
      var overdue = task.status !== "done" && task.dueDate < todayISO();
      var duePill = document.createElement("span");
      duePill.className = "pill" + (overdue ? " pill--overdue" : "");
      duePill.textContent = (overdue ? "Overdue " : "Due ") + task.dueDate;
      meta.appendChild(duePill);
    }

    var statusSelect = document.createElement("select");
    statusSelect.setAttribute("data-action", "status");
    statusSelect.setAttribute("aria-label", "Change status for " + task.title);
    statusSelect.disabled = blocked;
    ENUMS.status.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s;
      opt.textContent = STATUS_LABELS[s];
      if (s === task.status) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    meta.appendChild(statusSelect);

    var card2 = card;
    card2.appendChild(top);
    card2.appendChild(meta);

    if (task.tags.length) {
      var tagList = document.createElement("ul");
      tagList.className = "tag-list";
      tagList.setAttribute("aria-label", "Tags");
      task.tags.forEach(function (tag) {
        var li = document.createElement("li");
        li.textContent = tag;
        tagList.appendChild(li);
      });
      card2.appendChild(tagList);
    }

    return card2;
  }

  function updateControlsDisabledState() {
    var blocked = guardBlocked();
    els.newTaskBtn.disabled = blocked;
    els.importInput.disabled = blocked;
  }

  // ---------- filters wiring ----------
  function clearFilters() {
    state.filters = { search: "", status: "all", project: "all", priority: "all" };
    els.searchInput.value = "";
    els.filterStatus.value = "all";
    els.filterPriority.value = "all";
    renderAll();
  }

  // ---------- dialog ----------
  var dialogTriggerEl = null;

  function clearFormErrors() {
    ["title", "project", "dueDate", "tags", "form"].forEach(function (key) {
      var el = document.getElementById("error-" + key);
      if (el) el.textContent = "";
    });
    ["title", "project", "dueDate", "tags"].forEach(function (key) {
      var el = els.form.elements[key];
      if (el) el.removeAttribute("aria-invalid");
    });
  }

  function showFormErrors(errors) {
    Object.keys(errors).forEach(function (key) {
      var el = document.getElementById("error-" + key);
      if (el) el.textContent = errors[key];
      var input = els.form.elements[key];
      if (input) input.setAttribute("aria-invalid", "true");
    });
  }

  function openDialog(mode, task) {
    if (guardBlocked()) return;
    dialogTriggerEl = document.activeElement;
    els.form.reset();
    clearFormErrors();
    if (mode === "edit" && task) {
      els.dialogTitle.textContent = "Edit task";
      els.form.elements.id.value = task.id;
      els.form.elements.title.value = task.title;
      els.form.elements.project.value = task.project;
      els.form.elements.status.value = task.status;
      els.form.elements.priority.value = task.priority;
      els.form.elements.dueDate.value = task.dueDate;
      els.form.elements.tags.value = task.tags.join(", ");
    } else {
      els.dialogTitle.textContent = "New task";
      els.form.elements.id.value = "";
      els.form.elements.status.value = "todo";
      els.form.elements.priority.value = "medium";
    }
    els.dialog.showModal();
    els.form.elements.title.focus();
  }

  function closeDialog() {
    if (els.dialog.open) els.dialog.close();
  }

  // ---------- delete / undo ----------
  function handleDelete(id) {
    if (guardBlocked()) return;
    var idx = -1;
    for (var i = 0; i < state.board.tasks.length; i++) {
      if (state.board.tasks[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;
    var removed = state.board.tasks.splice(idx, 1)[0];
    state.pendingUndo = { task: removed, index: idx };
    persistAndRender();
    showUndoToast(removed);
  }

  function showUndoToast(task) {
    clearNode(els.toastRegion);
    var toast = document.createElement("div");
    toast.className = "toast";
    var text = document.createElement("span");
    text.textContent = 'Deleted "' + task.title + '".';
    var undoBtn = makeBtn("btn", "Undo", "undo-delete");
    undoBtn.addEventListener("click", function () {
      if (guardBlocked()) return;
      handleUndo();
    });
    var dismissBtn = makeBtn("btn-icon", "✕", null, "Dismiss");
    dismissBtn.addEventListener("click", function () {
      state.pendingUndo = null;
      clearNode(els.toastRegion);
    });
    toast.appendChild(text);
    toast.appendChild(undoBtn);
    toast.appendChild(dismissBtn);
    els.toastRegion.appendChild(toast);
  }

  function handleUndo() {
    if (!state.pendingUndo) return;
    var pending = state.pendingUndo;
    var insertAt = Math.min(pending.index, state.board.tasks.length);
    state.board.tasks.splice(insertAt, 0, pending.task);
    state.pendingUndo = null;
    clearNode(els.toastRegion);
    persistAndRender();
  }

  // ---------- import ----------
  function resetImportInput() {
    els.importInput.value = "";
  }

  function showImportError(message) {
    window.alert(message);
  }

  function handleImportFile(file) {
    if (guardBlocked()) { resetImportInput(); return; }
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showImportError("Import failed: the file is larger than 1 MiB.");
      resetImportInput();
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result || "");
      if (text.length > 1024 * 1024) {
        showImportError("Import failed: the file is larger than 1 MiB.");
        resetImportInput();
        return;
      }
      var parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        showImportError("Import failed: the file is not valid JSON.");
        resetImportInput();
        return;
      }
      var check = validateBoardShape(parsed);
      if (!check.valid) {
        showImportError("Import failed: the file does not match the expected board format.\n\n" + check.errors.slice(0, 5).join("\n"));
        resetImportInput();
        return;
      }
      var count = check.tasks.length;
      var confirmed = window.confirm(
        "Replace the current board with " + count + (count === 1 ? " task" : " tasks") + " from this file? This cannot be undone."
      );
      if (!confirmed) { resetImportInput(); return; }

      state.board = { schemaVersion: 1, tasks: check.tasks };
      state.pendingUndo = null;
      clearNode(els.toastRegion);
      var ok = tryPersist(state.board);
      state.saveError = !ok;
      renderAll();
      resetImportInput();
    };
    reader.onerror = function () {
      showImportError("Import failed: the file could not be read.");
      resetImportInput();
    };
    reader.readAsText(file);
  }

  // ---------- cross-tab conflict ----------
  function handleStorageEvent(e) {
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    if (state.conflict) return;
    state.conflict = true;
    state.pendingUndo = null;
    clearNode(els.toastRegion);
    renderAll();
  }

  // ---------- wiring ----------
  function wireEvents() {
    els.newTaskBtn.addEventListener("click", function () { openDialog("new", null); });
    els.dialogCloseBtn.addEventListener("click", closeDialog);
    els.cancelBtn.addEventListener("click", closeDialog);
    els.dialog.addEventListener("close", function () {
      if (dialogTriggerEl && typeof dialogTriggerEl.focus === "function") {
        dialogTriggerEl.focus();
      }
      dialogTriggerEl = null;
    });

    els.form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (guardBlocked()) return;
      clearFormErrors();
      var fd = new FormData(els.form);
      var id = String(fd.get("id") || "");
      var result = validateFormInput({
        title: fd.get("title"),
        project: fd.get("project"),
        dueDate: fd.get("dueDate"),
        tagsText: fd.get("tags"),
      });
      if (!result.valid) {
        showFormErrors(result.errors);
        return;
      }
      var status = String(fd.get("status") || "todo");
      var priority = String(fd.get("priority") || "medium");
      if (ENUMS.status.indexOf(status) === -1) status = "todo";
      if (ENUMS.priority.indexOf(priority) === -1) priority = "medium";

      if (id) {
        var task = findTask(id);
        if (!task) {
          document.getElementById("error-form").textContent = "This task no longer exists.";
          return;
        }
        task.title = result.normalized.title;
        task.project = result.normalized.project;
        task.status = status;
        task.priority = priority;
        task.dueDate = result.normalized.dueDate;
        task.tags = result.normalized.tags;
      } else {
        state.board.tasks.push({
          id: uid(),
          title: result.normalized.title,
          project: result.normalized.project,
          status: status,
          priority: priority,
          dueDate: result.normalized.dueDate,
          tags: result.normalized.tags,
        });
      }
      closeDialog();
      persistAndRender();
    });

    els.board.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-action]") : null;
      if (!btn) return;
      var card = btn.closest("[data-testid=\"task-card\"]");
      if (!card) return;
      var id = card.getAttribute("data-task-id");
      var action = btn.getAttribute("data-action");
      if (action === "edit") {
        if (guardBlocked()) return;
        var task = findTask(id);
        if (task) openDialog("edit", task);
      } else if (action === "delete") {
        handleDelete(id);
      }
    });

    els.board.addEventListener("change", function (e) {
      var sel = e.target.closest ? e.target.closest("[data-action=\"status\"]") : null;
      if (!sel) return;
      var card = sel.closest("[data-testid=\"task-card\"]");
      if (!card) return;
      var id = card.getAttribute("data-task-id");
      var task = findTask(id);
      if (guardBlocked() || !task) {
        if (task) sel.value = task.status;
        return;
      }
      task.status = sel.value;
      persistAndRender();
    });

    els.searchInput.addEventListener("input", function () {
      state.filters.search = els.searchInput.value;
      renderBoard();
    });
    els.filterStatus.addEventListener("change", function () {
      state.filters.status = els.filterStatus.value;
      renderBoard();
    });
    els.filterProject.addEventListener("change", function () {
      state.filters.project = els.filterProject.value;
      renderBoard();
    });
    els.filterPriority.addEventListener("change", function () {
      state.filters.priority = els.filterPriority.value;
      renderBoard();
    });
    els.clearFiltersBtn.addEventListener("click", clearFilters);

    els.exportBtn.addEventListener("click", function () {
      var data = JSON.stringify(state.board, null, 2);
      triggerDownload(data, "fieldnote-board-" + todayISO() + ".json", "application/json");
    });

    els.importInput.addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      handleImportFile(file);
    });

    window.addEventListener("storage", handleStorageEvent);
  }

  // ---------- init ----------
  function resolveEls() {
    els.app = document.getElementById("app");
    els.banners = document.getElementById("banners");
    els.board = document.getElementById("board");
    els.taskCount = document.getElementById("task-count");
    els.newTaskBtn = document.getElementById("new-task-btn");
    els.searchInput = document.getElementById("search-input");
    els.filterStatus = document.getElementById("filter-status");
    els.filterProject = document.getElementById("filter-project");
    els.filterPriority = document.getElementById("filter-priority");
    els.clearFiltersBtn = document.getElementById("clear-filters-btn");
    els.exportBtn = document.getElementById("export-btn");
    els.importInput = document.getElementById("import-input");
    els.dialog = document.getElementById("task-dialog");
    els.dialogTitle = document.getElementById("task-dialog-title");
    els.dialogCloseBtn = document.getElementById("dialog-close-btn");
    els.cancelBtn = document.getElementById("cancel-task-btn");
    els.form = document.getElementById("task-form");
    els.toastRegion = document.getElementById("toast-region");
  }

  function init() {
    resolveEls();
    els.app.hidden = false;
    wireEvents();

    var loaded = loadBoard();
    state.board = loaded.board || { schemaVersion: 1, tasks: [] };
    state.corrupt = loaded.corrupt;
    state.rawCorrupt = loaded.rawCorrupt;
    state.saveError = loaded.persistedOk === false;

    renderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
