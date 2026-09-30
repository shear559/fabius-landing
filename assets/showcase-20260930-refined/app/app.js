(function () {
  "use strict";

  var STORAGE_KEY = "fieldnote-board:v1";
  var STATUSES = ["todo", "doing", "done"];
  var PRIORITIES = ["low", "medium", "high"];
  var MAX_IMPORT_BYTES = 1024 * 1024;
  var storage = null;
  var temporaryStorage = false;
  function resolveStorage() {
    try { storage = window.localStorage; storage.getItem(STORAGE_KEY); }
    catch (error) {
      temporaryStorage = true;
      var sessionData = Object.create(null);
      storage = { getItem: function(key) { return Object.prototype.hasOwnProperty.call(sessionData, key) ? sessionData[key] : null; }, setItem: function(key, value) { sessionData[key] = String(value); } };
    }
  }

  // ---------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------

  function genId() {
    if (window.crypto && window.crypto.randomUUID) {
      return "t-" + window.crypto.randomUUID();
    }
    return "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function isValidDateString(s) {
    if (s === "") return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var parts = s.split("-").map(Number);
    var y = parts[0], m = parts[1], d = parts[2];
    var dt = new Date(0);
    dt.setUTCFullYear(y, m - 1, d);
    dt.setUTCHours(0,0,0,0);
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  function escapeForAttr(s) {
    return String(s);
  }

  function parseTagsInput(raw) {
    if (!raw) return [];
    var seen = Object.create(null);
    var out = [];
    raw.split(",").forEach(function (part) {
      var t = part.trim();
      if (!t) return;
      var key = t.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(t);
    });
    return out;
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  // ---------------------------------------------------------------------
  // Seed data — fictional small research-publication team
  // ---------------------------------------------------------------------

  function seedBoard() {
    var tasks = [
      { title: "Record the morning transect", project: "Site Survey", status: "doing", priority: "high", dueDate: "2026-10-02", tags: ["fieldwork", "observation"], description: "Walk the riverside route before the afternoon visit. Record surface material, shade and stopping places with the same observation sheet at each point.", deliverable: "Completed transect sheet + annotated route" },
      { title: "Compare soil samples by location", project: "Analysis", status: "doing", priority: "high", dueDate: "2026-10-04", tags: ["analysis", "soil"], description: "Check sample labels against the field log. Separate missing readings from valid zero values before preparing the comparison table.", deliverable: "Clean comparison table with exclusions documented" },
      { title: "Prepare the next field visit", project: "Site Survey", status: "todo", priority: "medium", dueDate: "2026-10-03", tags: ["planning", "fieldwork"], description: "Confirm the route, check the weather locally and prepare blank observation sheets. Repeat the same sites so the visits can be compared.", deliverable: "Route plan and equipment checklist" },
      { title: "Draft the methods section", project: "Manuscript", status: "doing", priority: "medium", dueDate: "2026-10-06", tags: ["writing", "methods"], description: "Describe site selection, the sampling protocol and how incomplete observations are handled. Keep methodological decisions separate from results.", deliverable: "Methods draft ready for internal review" },
      { title: "Build the figure captions", project: "Manuscript", status: "todo", priority: "medium", dueDate: "2026-10-08", tags: ["figures", "writing"], description: "State what each figure shows, define abbreviations and identify the sample unit. Flag any interpretation that needs support from the source data.", deliverable: "Caption sheet linked to draft figures" },
      { title: "Review the study limitations", project: "Manuscript", status: "todo", priority: "high", dueDate: "2026-10-10", tags: ["review", "uncertainty"], description: "Review sampling coverage, seasonality and alternative explanations. List what the observations do not establish before finalizing the brief.", deliverable: "Limitations section with open questions" },
      { title: "Calibrate the field equipment", project: "Site Survey", status: "done", priority: "medium", dueDate: "2026-09-28", tags: ["equipment"], description: "Run the pre-visit checks and record the calibration procedure in the field log. Keep the reference reading with the equipment record.", deliverable: "Equipment log completed" },
      { title: "Agree the observation protocol", project: "Site Survey", status: "done", priority: "low", dueDate: "2026-09-29", tags: ["protocol", "planning"], description: "Use the same fields for location, time, surface, shade and uncertainty. Define what counts as an observation and what belongs in interpretation.", deliverable: "Shared observation template" }
    ];
    return {
      schemaVersion: 1,
      tasks: tasks.map(function (t, i) {
        return Object.assign({ id: "seed-" + (i + 1) }, t);
      })
    };
  }

  // ---------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------

  function validateTaskShape(t, context) {
    var errs = [];
    if (typeof t !== "object" || t === null) return ["Task is not an object" + context];
    if (typeof t.id !== "string" || t.id.trim() === "" || t.id.length > 80) errs.push("invalid id" + context);
    if (typeof t.title !== "string" || t.title.trim() === "" || t.title.length > 120) errs.push("invalid title" + context);
    if (typeof t.project !== "string" || t.project.trim() === "" || t.project.length > 80) errs.push("invalid project" + context);
    if (STATUSES.indexOf(t.status) === -1) errs.push("invalid status" + context);
    if (PRIORITIES.indexOf(t.priority) === -1) errs.push("invalid priority" + context);
    if (typeof t.dueDate !== "string" || !isValidDateString(t.dueDate)) errs.push("invalid dueDate" + context);
    if (!Array.isArray(t.tags) || t.tags.length > 8) {
      errs.push("invalid tags" + context);
    } else {
      for (var i = 0; i < t.tags.length; i++) {
        var tag = t.tags[i];
        if (typeof tag !== "string" || tag.trim() === "" || tag !== tag.trim() || tag.length > 24) {
          errs.push("invalid tag value" + context);
          break;
        }
      }
    }
    if (t.description !== undefined && (typeof t.description !== "string" || t.description.length > 1600)) errs.push("invalid description" + context);
    if (t.deliverable !== undefined && (typeof t.deliverable !== "string" || t.deliverable.length > 160)) errs.push("invalid deliverable" + context);
    return errs;
  }

  function validateBoardShape(parsed) {
    if (typeof parsed !== "object" || parsed === null) return { valid: false, errors: ["Root is not an object"] };
    if (parsed.schemaVersion !== 1) return { valid: false, errors: ["Unsupported schemaVersion"] };
    if (!Array.isArray(parsed.tasks)) return { valid: false, errors: ["tasks is not an array"] };
    var errors = [];
    var ids = Object.create(null);
    parsed.tasks.forEach(function (t, i) {
      var tErrs = validateTaskShape(t, " (task " + i + ")");
      errors = errors.concat(tErrs);
      if (t && typeof t.id === "string") {
        if (ids[t.id]) errors.push("duplicate id " + t.id);
        ids[t.id] = true;
      }
    });
    return { valid: errors.length === 0, errors: errors };
  }

  function normalizeImportedTask(t) {
    return {
      id: t.id,
      title: t.title.trim(),
      project: t.project.trim(),
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      tags: t.tags.map(function (x) { return x.trim(); }),
      description: t.description || "",
      deliverable: t.deliverable || ""
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { seedBoard: seedBoard, validateBoardShape: validateBoardShape, normalizeImportedTask: normalizeImportedTask, parseTagsInput: parseTagsInput, isValidDateString: isValidDateString, validateFormValues: validateFormValues };
    return;
  }

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------

  var state = {
    board: { schemaVersion: 1, tasks: [] },
    corrupt: false,
    rawCorruptText: null,
    view: "board",
    filters: { search: "", status: "all", project: "all", priority: "all" },
    editingId: null,
    lastDeleted: null,
    conflict: false,
    lastFocusedEl: null,
    pendingImport: null
  };

  var lastWrittenValue = null;

  // ---------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------

  function tryWrite(board) {
    var json = JSON.stringify(board);
    try {
      storage.setItem(STORAGE_KEY, json);
      lastWrittenValue = json;
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Attempts to persist a new task list. Refuses while a cross-tab
   * conflict is unresolved so a stale tab cannot clobber newer data.
   */
  function commitTasks(newTasks, opts) {
    opts = opts || {};
    if (state.conflict && !opts.allowDuringConflict) {
      showSaveError("Not saved: this board changed in another tab. Reload the board first.");
      return false;
    }
    var newBoard = { schemaVersion: 1, tasks: newTasks };
    var ok = tryWrite(newBoard);
    if (!ok) {
      showSaveError("Not saved: your browser's storage is unavailable or full. Your change was not applied.");
      return false;
    }
    state.board = newBoard;
    clearSaveError();
    return true;
  }

  // ---------------------------------------------------------------------
  // DOM refs
  // ---------------------------------------------------------------------

  var $ = function (sel) { return document.querySelector(sel); };

  var el = {
    conflictBanner: $("#conflict-banner"),
    reloadBoardBtn: $("#reload-board-btn"),
    saveErrorBanner: $("#save-error-banner"),
    recoveryBanner: $("#recovery-banner"),
    downloadCorruptBtn: $("#download-corrupt-btn"),
    resetBoardBtn: $("#reset-board-btn"),
    mainContent: $("#main-content"),
    overview: $("#overview"),
    countTodo: $("#count-todo"),
    countDoing: $("#count-doing"),
    countDone: $("#count-done"),
    createTaskBtn: document.querySelector('[data-testid="create-task"]'),
    search: $("#search"),
    filterStatus: $("#filter-status"),
    filterProject: $("#filter-project"),
    filterPriority: $("#filter-priority"),
    exportBtn: document.querySelector('[data-testid="export"]'),
    importFile: document.querySelector('[data-testid="import-file"]'),
    resultCount: $("#result-count"),
    boardView: $("#board-view"),
    listView: $("#list-view"),
    emptyState: $("#empty-state"),
    viewBoardBtn: $("#view-board-btn"),
    viewListBtn: $("#view-list-btn"),
    dialogBackdrop: $("#task-dialog-backdrop"),
    dialog: $("#task-dialog"),
    dialogTitle: $("#task-dialog-title"),
    dialogClose: $("#task-dialog-close"),
    form: $("#task-form"),
    formErrors: $("#form-errors"),
    resetDialogBackdrop: $("#reset-dialog-backdrop"),
    resetDialogClose: $("#reset-dialog-close"),
    confirmResetBtn: $("#confirm-reset-btn"),
    toast: $("#toast"),
    toastMessage: $("#toast-message"),
    undoBtn: document.querySelector('[data-testid="undo-delete"]')
  };

  var toastTimer = null;

  // ---------------------------------------------------------------------
  // Startup
  // ---------------------------------------------------------------------

  function init() {
    if (window.matchMedia("(max-width: 719px)").matches) state.view = "list";
    resolveStorage();
    document.getElementById("storage-state").textContent = temporaryStorage ? "Temporary session · export to keep changes" : "Saved on this device";
    document.getElementById("rail-storage-state").textContent = temporaryStorage ? "Temporary session" : "On this device";
    var raw = null;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }

    if (raw === null) {
      var seeded = seedBoard();
      if (!tryWrite(seeded)) showSaveError("Not saved: browser storage is unavailable. The sample board is held in memory; export it to keep your work.");
      state.board = seeded;
    } else {
      var parsed = null;
      var parseOk = true;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        parseOk = false;
      }
      var shape = parseOk ? validateBoardShape(parsed) : { valid: false, errors: ["Malformed JSON"] };
      if (parseOk && shape.valid) {
        state.board = parsed;
        lastWrittenValue = raw;
      } else {
        state.corrupt = true;
        state.rawCorruptText = raw;
        state.board = { schemaVersion: 1, tasks: [] };
      }
    }

    bindEvents();
    render();
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------

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

  function uniqueProjects() {
    var seen = Object.create(null);
    var out = [];
    state.board.tasks.forEach(function (t) {
      if (!seen[t.project]) { seen[t.project] = true; out.push(t.project); }
    });
    out.sort(function (a, b) { return a.localeCompare(b); });
    return out;
  }

  function refreshProjectFilterOptions() {
    var projects = uniqueProjects();
    var current = el.filterProject.value || "all";
    el.filterProject.innerHTML = "";
    var allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "All projects";
    el.filterProject.appendChild(allOpt);
    projects.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p;
      o.textContent = p;
      el.filterProject.appendChild(o);
    });
    if (projects.indexOf(current) !== -1 || current === "all") {
      el.filterProject.value = current;
    } else {
      el.filterProject.value = "all";
      state.filters.project = "all";
    }
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function priorityLabel(p) { return p.charAt(0).toUpperCase() + p.slice(1); }
  function statusLabel(s) { return s === "todo" ? "To do" : s === "doing" ? "In progress" : "Done"; }

  function buildStatusSelect(task) {
    var sel = document.createElement("select");
    sel.setAttribute("data-action", "status");
    sel.className = "select";
    sel.setAttribute("aria-label", "Status for " + task.title);
    STATUSES.forEach(function (s) {
      var o = document.createElement("option");
      o.value = s;
      o.textContent = statusLabel(s);
      if (s === task.status) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", function () {
      onStatusChange(task.id, sel.value, sel);
    });
    return sel;
  }

  function buildTagList(task) {
    var ul = document.createElement("ul");
    ul.className = "task-card__tags";
    task.tags.forEach(function (tag) {
      var li = document.createElement("li");
      li.className = "tag-chip";
      li.textContent = tag;
      ul.appendChild(li);
    });
    return ul;
  }

  function buildCard(task) {
    var card = document.createElement("article");
    card.className = "task-card";
    card.setAttribute("data-testid", "task-card");
    card.setAttribute("data-task-id", escapeForAttr(task.id));

    var top = document.createElement("div");
    top.className = "task-card__top";

    var h3 = document.createElement("h3");
    h3.className = "task-card__title";
    var titleButton = document.createElement("button");
    titleButton.type = "button";
    titleButton.className = "task-title-button";
    titleButton.textContent = task.title;
    titleButton.addEventListener("click", function() { openEditDialog(task.id, titleButton); });
    h3.appendChild(titleButton);
    top.appendChild(h3);

    var pr = document.createElement("span");
    pr.className = "priority";
    var dot = document.createElement("span");
    dot.className = "priority-dot";
    dot.setAttribute("data-priority", task.priority);
    dot.setAttribute("aria-hidden", "true");
    pr.appendChild(dot);
    pr.appendChild(document.createTextNode(priorityLabel(task.priority)));
    top.appendChild(pr);

    var idLabel = document.createElement("span");
    idLabel.className = "task-reference";
    idLabel.textContent = task.id.indexOf("seed-") === 0 ? "FN–" + task.id.slice(5).padStart(3, "0") : "CUSTOM TASK";
    card.appendChild(idLabel);
    card.appendChild(top);
    if (task.description) {
      var description = document.createElement("p"); description.className = "task-description"; description.textContent = task.description; card.appendChild(description);
    }
    if (task.deliverable) {
      var deliverable = document.createElement("p"); deliverable.className = "task-deliverable"; var deliverableLabel = document.createElement("span"); deliverableLabel.textContent = "Deliverable"; var deliverableText = document.createElement("span"); deliverableText.textContent = task.deliverable; deliverable.append(deliverableLabel, deliverableText); card.appendChild(deliverable);
    }

    var meta = document.createElement("p");
    meta.className = "task-card__meta";
    var projSpan = document.createElement("span");
    projSpan.className = "task-card__project";
    projSpan.textContent = task.project;
    meta.appendChild(projSpan);
    if (task.dueDate) {
      var dueSpan = document.createElement("span");
      dueSpan.className = "task-card__due" + (task.dueDate < todayStr() && task.status !== "done" ? " task-card__due--overdue" : "");
      dueSpan.textContent = "Due " + task.dueDate;
      meta.appendChild(dueSpan);
    }
    card.appendChild(meta);

    if (task.tags.length) card.appendChild(buildTagList(task));

    var controls = document.createElement("div");
    controls.className = "task-card__controls";
    controls.appendChild(buildStatusSelect(task));

    var editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "icon-btn";
    editBtn.setAttribute("data-action", "edit");
    editBtn.setAttribute("aria-label", "Edit " + task.title);
    editBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-pencil"></use></svg>';
    editBtn.addEventListener("click", function () { openEditDialog(task.id, editBtn); });
    controls.appendChild(editBtn);

    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-btn";
    delBtn.setAttribute("data-action", "delete");
    delBtn.setAttribute("aria-label", "Delete " + task.title);
    delBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-trash"></use></svg>';
    delBtn.addEventListener("click", function () { onDelete(task.id); });
    controls.appendChild(delBtn);

    card.appendChild(controls);
    return card;
  }

  function renderBoard(tasks) {
    el.boardView.innerHTML = "";
    STATUSES.forEach(function (status) {
      var col = document.createElement("div");
      col.className = "board-column";
      col.dataset.status=status;

      var header = document.createElement("div");
      header.className = "board-column__header";
      var h2 = document.createElement("h2");
      h2.style.margin = "0";
      h2.style.fontSize = "14px";
      h2.textContent = statusLabel(status);
      var count = document.createElement("span");
      count.className = "board-column__count";
      var colTasks = tasks.filter(function (t) { return t.status === status; });
      count.textContent = colTasks.length;
      header.appendChild(h2);
      header.appendChild(count);
      col.appendChild(header);

      if (colTasks.length === 0) {
        var empty = document.createElement("p");
        empty.className = "board-column__empty";
        empty.textContent = "No tasks here.";
        col.appendChild(empty);
      } else {
        colTasks.forEach(function (t) { col.appendChild(buildCard(t)); });
      }
      el.boardView.appendChild(col);
    });
  }

  function renderList(tasks) {
    el.listView.innerHTML = "";
    if (tasks.length === 0) return;
    var table = document.createElement("table");
    table.className = "list-table";
    table.innerHTML =
      "<thead><tr>" +
      "<th scope=\"col\">Task</th>" +
      "<th scope=\"col\">Priority</th>" +
      "<th scope=\"col\">Due</th>" +
      "<th scope=\"col\">Tags</th>" +
      "<th scope=\"col\">Status</th>" +
      "<th scope=\"col\">Actions</th>" +
      "</tr></thead>";
    var tbody = document.createElement("tbody");
    tasks.forEach(function (task) {
      var tr = document.createElement("tr");
      tr.setAttribute("data-testid", "task-card");
      tr.setAttribute("data-task-id", escapeForAttr(task.id));

      var tdTitle = document.createElement("td");
      var strong = document.createElement("div");
      strong.className = "task-title";
      var titleButton = document.createElement("button"); titleButton.type = "button"; titleButton.className = "task-title-button"; titleButton.textContent = task.title; titleButton.addEventListener("click", function() { openEditDialog(task.id, titleButton); }); strong.appendChild(titleButton);
      var sub = document.createElement("div");
      sub.className = "task-project";
      sub.textContent = task.project;
      tdTitle.appendChild(strong);
      tdTitle.appendChild(sub);
      if (task.deliverable) { var result = document.createElement("p"); result.className = "list-deliverable"; result.textContent = task.deliverable; tdTitle.appendChild(result); }
      tr.appendChild(tdTitle);

      var tdPriority = document.createElement("td");
      var prWrap = document.createElement("span");
      prWrap.className = "priority";
      var dot = document.createElement("span");
      dot.className = "priority-dot";
      dot.setAttribute("data-priority", task.priority);
      dot.setAttribute("aria-hidden", "true");
      prWrap.appendChild(dot);
      prWrap.appendChild(document.createTextNode(priorityLabel(task.priority)));
      tdPriority.appendChild(prWrap);
      tr.appendChild(tdPriority);

      var tdDue = document.createElement("td");
      tdDue.textContent = task.dueDate || "—";
      if (task.dueDate && task.dueDate < todayStr() && task.status !== "done") {
        tdDue.className = "task-card__due--overdue";
      }
      tr.appendChild(tdDue);

      var tdTags = document.createElement("td");
      tdTags.appendChild(buildTagList(task));
      tr.appendChild(tdTags);

      var tdStatus = document.createElement("td");
      tdStatus.appendChild(buildStatusSelect(task));
      tr.appendChild(tdStatus);

      var tdActions = document.createElement("td");
      var rowActions = document.createElement("div");
      rowActions.className = "row-actions";
      var editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "icon-btn";
      editBtn.setAttribute("data-action", "edit");
      editBtn.setAttribute("aria-label", "Edit " + task.title);
      editBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-pencil"></use></svg>';
      editBtn.addEventListener("click", function () { openEditDialog(task.id, editBtn); });
      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "icon-btn";
      delBtn.setAttribute("data-action", "delete");
      delBtn.setAttribute("aria-label", "Delete " + task.title);
      delBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-trash"></use></svg>';
      delBtn.addEventListener("click", function () { onDelete(task.id); });
      rowActions.appendChild(editBtn);
      rowActions.appendChild(delBtn);
      tdActions.appendChild(rowActions);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    el.listView.appendChild(table);
  }

  function render() {
    if (state.corrupt) {
      el.recoveryBanner.hidden = false;
      el.mainContent.hidden = true;
      return;
    }
    el.recoveryBanner.hidden = true;
    el.mainContent.hidden = false;

    el.conflictBanner.hidden = !state.conflict;

    refreshProjectFilterOptions();

    var total = state.board.tasks.length;
    var nextTask = state.board.tasks.filter(function(t){ return t.status === "doing"; }).sort(function(a,b){ return (a.dueDate || "9999").localeCompare(b.dueDate || "9999"); })[0];
    document.getElementById("next-up-text").textContent = nextTask ? nextTask.title : "Choose a task to move into progress.";
    document.getElementById("next-up-button").disabled = !nextTask;
    document.getElementById("next-up-button").onclick = function(){ if(nextTask)openEditDialog(nextTask.id, this); };
    document.getElementById("workspace-subtitle").textContent = state.filters.project === "all" ? "Field observation, careful analysis and a draft you can trace." : "Viewing " + state.filters.project + " · clear filters to return to all projects.";
    document.getElementById("active-context").textContent = state.filters.project === "all" ? "All tasks" : state.filters.project;
    document.getElementById("rail-total").textContent = total;
    var railProjects = document.getElementById("rail-projects");
    railProjects.replaceChildren();
    uniqueProjects().forEach(function(project) {
      var b = document.createElement("button"); b.type="button"; b.className="rail-link rail-project"; b.textContent=project;
      b.setAttribute("aria-pressed", String(state.filters.project===project));
      b.onclick=function(){state.filters.project=project;el.filterProject.value=project;render();}; railProjects.appendChild(b);
    });
    document.querySelectorAll("[data-project], [data-quick-status]").forEach(function(b){b.classList.toggle("active", b.dataset.project==='all' ? state.filters.project==='all' && state.filters.status==='all' : state.filters.status===b.dataset.quickStatus);});
    el.countTodo.textContent = state.board.tasks.filter(function (t) { return t.status === "todo"; }).length;
    el.countDoing.textContent = state.board.tasks.filter(function (t) { return t.status === "doing"; }).length;
    el.countDone.textContent = state.board.tasks.filter(function (t) { return t.status === "done"; }).length;

    var filtered = getFilteredTasks();
    document.querySelectorAll('.stat-pill').forEach(function(p){var n=state.board.tasks.filter(function(t){return t.status===p.dataset.status;}).length;p.querySelector('.stat-line').style.setProperty('--progress', (total?n/total*100:0)+'%');});
    document.getElementById('clear-filters').hidden = !(state.filters.search||state.filters.project!=='all'||state.filters.status!=='all'||state.filters.priority!=='all');
    el.resultCount.textContent = "Showing " + filtered.length + " of " + total + " tasks";

    el.viewBoardBtn.setAttribute("aria-pressed", String(state.view === "board"));
    el.viewListBtn.setAttribute("aria-pressed", String(state.view === "list"));

    if (filtered.length === 0) {
      el.emptyState.hidden = false;
      el.emptyState.textContent = total === 0
        ? "No tasks yet. Create your first task to get started."
        : "No tasks match your search or filters. Try adjusting them.";
      el.boardView.hidden = true;
      el.listView.hidden = true;
      el.boardView.innerHTML = "";
      el.listView.innerHTML = "";
      return;
    }

    el.emptyState.hidden = true;

    if (state.view === "board") {
      el.boardView.hidden = false;
      el.listView.hidden = true;
      el.listView.innerHTML = "";
      renderBoard(filtered);
    } else {
      el.listView.hidden = false;
      el.boardView.hidden = true;
      el.boardView.innerHTML = "";
      renderList(filtered);
    }
  }

  // ---------------------------------------------------------------------
  // Save error banner
  // ---------------------------------------------------------------------

  function showSaveError(msg) {
    el.saveErrorBanner.textContent = msg;
    el.saveErrorBanner.hidden = false;
  }
  function clearSaveError() {
    el.saveErrorBanner.hidden = true;
    el.saveErrorBanner.textContent = "";
  }

  // ---------------------------------------------------------------------
  // Status change
  // ---------------------------------------------------------------------

  function onStatusChange(taskId, newStatus, selectEl) {
    var idx = state.board.tasks.findIndex(function (t) { return t.id === taskId; });
    if (idx === -1) return;
    var prevStatus = state.board.tasks[idx].status;
    var newTasks = state.board.tasks.slice();
    newTasks[idx] = Object.assign({}, newTasks[idx], { status: newStatus });
    var ok = commitTasks(newTasks);
    if (!ok) {
      selectEl.value = prevStatus;
      return;
    }
    render();
  }

  // ---------------------------------------------------------------------
  // Delete + undo
  // ---------------------------------------------------------------------

  function onDelete(taskId) {
    var idx = state.board.tasks.findIndex(function (t) { return t.id === taskId; });
    if (idx === -1) return;
    var task = state.board.tasks[idx];
    var newTasks = state.board.tasks.slice();
    newTasks.splice(idx, 1);
    var ok = commitTasks(newTasks);
    if (!ok) return;
    state.lastDeleted = { task: task, index: idx };
    showToast("Deleted “" + task.title + "”", true);
    render();
  }

  function onUndoDelete() {
    if (!state.lastDeleted) return;
    var d = state.lastDeleted;
    var newTasks = state.board.tasks.slice();
    var insertAt = clamp(d.index, 0, newTasks.length);
    newTasks.splice(insertAt, 0, d.task);
    var ok = commitTasks(newTasks);
    if (!ok) return;
    state.lastDeleted = null;
    hideToast();
    render();
  }

  function showToast(message, withUndo) {
    el.toastMessage.textContent = message;
    el.undoBtn.hidden = !withUndo;
    el.toast.hidden = false;
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(hideToast, 8000);
  }
  function hideToast() {
    el.toast.hidden = true;
    if (toastTimer) { window.clearTimeout(toastTimer); toastTimer = null; }
  }

  // ---------------------------------------------------------------------
  // Create / edit dialog
  // ---------------------------------------------------------------------

  function openCreateDialog(triggerEl) {
    state.editingId = null;
    state.lastFocusedEl = triggerEl || document.activeElement;
    el.dialogTitle.textContent = "New task";
    document.getElementById("dialog-context").textContent = "Define the next action and what done looks like.";
    el.form.reset();
    el.form.elements.status.value = "todo";
    el.form.elements.priority.value = "medium";
    hideFormErrors();
    openDialog(el.dialogBackdrop, el.form.elements.title);
  }

  function openEditDialog(taskId, triggerEl) {
    var task = state.board.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return;
    state.editingId = taskId;
    state.lastFocusedEl = triggerEl || document.activeElement;
    el.dialogTitle.textContent = "Task details";
    document.getElementById("dialog-context").textContent = task.project + " · " + statusLabel(task.status);
    el.form.elements.title.value = task.title;
    el.form.elements.project.value = task.project;
    el.form.elements.status.value = task.status;
    el.form.elements.priority.value = task.priority;
    el.form.elements.dueDate.value = task.dueDate;
    el.form.elements.tags.value = task.tags.join(", ");
    el.form.elements.description.value = task.description || "";
    el.form.elements.deliverable.value = task.deliverable || "";
    hideFormErrors();
    openDialog(el.dialogBackdrop, el.form.elements.title);
  }

  function openDialog(backdrop, focusEl) {
    backdrop.hidden = false;
    document.querySelectorAll(".app-shell,.workspace-rail").forEach(function(n){n.inert=true;});
    window.setTimeout(function () { if (focusEl) focusEl.focus(); }, 0);
  }

  function closeDialog(backdrop) {
    backdrop.hidden = true;
    document.querySelectorAll(".app-shell,.workspace-rail").forEach(function(n){n.inert=false;});
    if (state.lastFocusedEl && typeof state.lastFocusedEl.focus === "function") {
      state.lastFocusedEl.focus();
    }
    state.lastFocusedEl = null;
  }

  function hideFormErrors() {
    el.formErrors.hidden = true;
    el.formErrors.innerHTML = "";
  }

  function showFormErrors(messages) {
    el.formErrors.hidden = false;
    var ul = document.createElement("ul");
    messages.forEach(function (m) {
      var li = document.createElement("li");
      li.textContent = m;
      ul.appendChild(li);
    });
    el.formErrors.innerHTML = "";
    el.formErrors.appendChild(ul);
  }

  function validateFormValues(v) {
    var errors = [];
    var title = v.title.trim();
    var project = v.project.trim();
    if (!title) errors.push("Title is required.");
    if (typeof v.description === "string" && v.description.length > 1600) errors.push("Context must be 1,600 characters or fewer.");
    if (typeof v.deliverable === "string" && v.deliverable.length > 160) errors.push("Deliverable must be 160 characters or fewer.");
    if (title.length > 120) errors.push("Title must be 120 characters or fewer.");
    if (!project) errors.push("Project is required.");
    if (project.length > 80) errors.push("Project must be 80 characters or fewer.");
    if (STATUSES.indexOf(v.status) === -1) errors.push("Status is invalid.");
    if (PRIORITIES.indexOf(v.priority) === -1) errors.push("Priority is invalid.");
    if (v.dueDate && !isValidDateString(v.dueDate)) errors.push("Due date must be a real calendar date (YYYY-MM-DD).");
    var tags = parseTagsInput(v.tags);
    if (tags.length > 8) errors.push("You can add at most 8 tags.");
    tags.forEach(function (t) {
      if (t.length > 24) errors.push("Tag “" + t + "” is longer than 24 characters.");
    });
    return { errors: errors, title: title, project: project, tags: tags.slice(0, 8) };
  }

  function onFormSubmit(e) {
    e.preventDefault();
    var fd = new FormData(el.form);
    var raw = {
      title: fd.get("title") || "",
      project: fd.get("project") || "",
      status: fd.get("status"),
      priority: fd.get("priority"),
      dueDate: fd.get("dueDate") || "",
      tags: fd.get("tags") || "",
      description: String(fd.get("description") || "").trim(),
      deliverable: String(fd.get("deliverable") || "").trim()
    };
    var result = validateFormValues(raw);
    if (result.errors.length) {
      showFormErrors(result.errors);
      return;
    }
    hideFormErrors();

    var newTasks;
    if (state.editingId) {
      var idx = state.board.tasks.findIndex(function (t) { return t.id === state.editingId; });
      if (idx === -1) { closeDialog(el.dialogBackdrop); return; }
      newTasks = state.board.tasks.slice();
      newTasks[idx] = {
        id: newTasks[idx].id,
        title: result.title,
        project: result.project,
        status: raw.status,
        priority: raw.priority,
        dueDate: raw.dueDate,
        tags: result.tags,
        description: raw.description,
        deliverable: raw.deliverable
      };
    } else {
      var task = {
        id: genId(),
        title: result.title,
        project: result.project,
        status: raw.status,
        priority: raw.priority,
        dueDate: raw.dueDate,
        tags: result.tags,
        description: raw.description,
        deliverable: raw.deliverable
      };
      newTasks = state.board.tasks.concat([task]);
    }

    var ok = commitTasks(newTasks);
    if (!ok) {
      showFormErrors(["This task was not saved. Your entry is kept here — fix the storage issue above and try again."]);
      return;
    }
    closeDialog(el.dialogBackdrop);
    render();
  }

  // ---------------------------------------------------------------------
  // Export / Import
  // ---------------------------------------------------------------------

  function onExport() {
    var json = JSON.stringify(state.board, null, 2);
    downloadText(json, "fieldnote-board-export.json");
    showToast("Export requested. Your JSON backup includes every task and its details.", false);
  }

  function downloadText(text, filename) {
    var blob = new Blob([text], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function onImportFileChosen(e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_IMPORT_BYTES) {
      showSaveError("Import failed: file is larger than 1 MiB.");
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result);
      if (new Blob([text]).size > MAX_IMPORT_BYTES) {
        showSaveError("Import failed: file is larger than 1 MiB.");
        return;
      }
      var parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        showSaveError("Import failed: the file is not valid JSON.");
        return;
      }
      var shape = validateBoardShape(parsed);
      if (!shape.valid) {
        showSaveError("Import failed: the file does not match the expected board format.\n\n" + shape.errors.slice(0, 6).join("\n"));
        return;
      }
      var incomingTasks = parsed.tasks.map(normalizeImportedTask);
      state.pendingImport = incomingTasks;
      document.getElementById("import-review-message").textContent = "Replace the current board (" + state.board.tasks.length + " tasks) with " + incomingTasks.length + " imported tasks? Export a backup first if you want to keep the current board.";
      document.getElementById("import-review").hidden = false;
      document.getElementById("confirm-import").focus();
    };
    reader.onerror = function () {
      showSaveError("Import failed: could not read the file.");
    };
    reader.readAsText(file);
  }

  // ---------------------------------------------------------------------
  // Recovery (corrupt storage)
  // ---------------------------------------------------------------------

  function onDownloadCorrupt() {
    downloadText(state.rawCorruptText || "", "fieldnote-board-corrupt-backup.json");
  }

  function onResetConfirmed() {
    if(state.conflict){showSaveError("Not saved: this board changed in another tab. Reload before resetting.");return;}
    var fresh = seedBoard();
    var ok = tryWrite(fresh);
    if (!ok) {
      showSaveError("Could not reset the board: storage is unavailable.");
      return;
    }
    state.board = fresh;
    state.corrupt = false;
    state.rawCorruptText = null;
    closeDialog(el.resetDialogBackdrop);
    render();
  }

  // ---------------------------------------------------------------------
  // Cross-tab conflict detection
  // ---------------------------------------------------------------------

  function onStorageEvent(e) {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    if (e.newValue === lastWrittenValue) return;
    state.conflict = true;
    render();
  }

  function onReloadBoard() {
    state.lastDeleted=null;hideToast();closeDialog(el.dialogBackdrop);
    var raw = null;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch (err) {
      raw = null;
    }
    if (raw === null) {
      var seeded = seedBoard();
      if (!tryWrite(seeded)) showSaveError("Not saved: browser storage is unavailable. The sample board is held in memory; export it to keep your work.");
      state.board = seeded;
      state.corrupt = false;
    } else {
      var parsed, parseOk = true;
      try { parsed = JSON.parse(raw); } catch (e) { parseOk = false; }
      var shape = parseOk ? validateBoardShape(parsed) : { valid: false, errors: [] };
      if (parseOk && shape.valid) {
        state.board = parsed;
        lastWrittenValue = raw;
        state.corrupt = false;
      } else {
        state.corrupt = true;
        state.rawCorruptText = raw;
      }
    }
    state.conflict = false;
    clearSaveError();
    render();
  }

  // ---------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------

  function bindEvents() {
    function clearFilters(){state.filters={search:"",status:"all",project:"all",priority:"all"};el.search.value="";el.filterStatus.value="all";el.filterProject.value="all";el.filterPriority.value="all";render();}
    document.getElementById('clear-filters').onclick=clearFilters;
    document.querySelector('[data-project="all"]').onclick=clearFilters;
    document.querySelectorAll('[data-quick-status]').forEach(function(b){b.onclick=function(){clearFilters();state.filters.status=b.dataset.quickStatus;el.filterStatus.value=b.dataset.quickStatus;render();};});
    document.querySelector('.btn--file').addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();el.importFile.click();}});
    document.addEventListener('keydown',function(e){if(e.key!=='Tab')return;var backdrop=!el.dialogBackdrop.hidden?el.dialogBackdrop:!el.resetDialogBackdrop.hidden?el.resetDialogBackdrop:null;if(!backdrop)return;var f=Array.from(backdrop.querySelectorAll('button,input,select,textarea,[tabindex="0"]')).filter(function(n){return !n.disabled&&n.getClientRects().length;});if(!f.length)return;if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&document.activeElement===f[f.length-1]){e.preventDefault();f[0].focus();}});

    el.createTaskBtn.addEventListener("click", function () { openCreateDialog(el.createTaskBtn); });
    el.dialogClose.addEventListener("click", function () { closeDialog(el.dialogBackdrop); });
    el.dialog.querySelector('[data-action="cancel"]').addEventListener("click", function () { closeDialog(el.dialogBackdrop); });
    el.form.addEventListener("submit", onFormSubmit);

    el.dialogBackdrop.addEventListener("click", function (e) {
      if (e.target === el.dialogBackdrop) closeDialog(el.dialogBackdrop);
    });
    el.resetDialogBackdrop.addEventListener("click", function (e) {
      if (e.target === el.resetDialogBackdrop) closeDialog(el.resetDialogBackdrop);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!el.dialogBackdrop.hidden) closeDialog(el.dialogBackdrop);
      if (!el.resetDialogBackdrop.hidden) closeDialog(el.resetDialogBackdrop);
    });

    el.search.addEventListener("input", function () {
      state.filters.search = el.search.value;
      render();
    });
    el.filterStatus.addEventListener("change", function () {
      state.filters.status = el.filterStatus.value;
      render();
    });
    el.filterProject.addEventListener("change", function () {
      state.filters.project = el.filterProject.value;
      render();
    });
    el.filterPriority.addEventListener("change", function () {
      state.filters.priority = el.filterPriority.value;
      render();
    });

    el.viewBoardBtn.addEventListener("click", function () { state.view = "board"; render(); });
    el.viewListBtn.addEventListener("click", function () { state.view = "list"; render(); });

    el.exportBtn.addEventListener("click", onExport);
    el.importFile.addEventListener("change", onImportFileChosen);
    document.getElementById("cancel-import").addEventListener("click", function(){ state.pendingImport = null; document.getElementById("import-review").hidden = true; });
    document.getElementById("confirm-import").addEventListener("click", function(){
      if (!state.pendingImport) return;
      var count = state.pendingImport.length;
      if (!commitTasks(state.pendingImport, {allowDuringConflict:false})) return;
      state.pendingImport = null; state.lastDeleted = null;
      document.getElementById("import-review").hidden = true;
      render(); showToast("Import complete: " + count + " tasks loaded.", false);
    });

    el.undoBtn.addEventListener("click", onUndoDelete);

    el.reloadBoardBtn.addEventListener("click", onReloadBoard);

    el.downloadCorruptBtn.addEventListener("click", onDownloadCorrupt);
    el.resetBoardBtn.addEventListener("click", function () {
      state.lastFocusedEl = el.resetBoardBtn;
      openDialog(el.resetDialogBackdrop, el.confirmResetBtn);
    });
    el.resetDialogClose.addEventListener("click", function () { closeDialog(el.resetDialogBackdrop); });
    el.resetDialogBackdrop.querySelector('[data-action="cancel-reset"]').addEventListener("click", function () { closeDialog(el.resetDialogBackdrop); });
    el.confirmResetBtn.addEventListener("click", onResetConfirmed);

    window.addEventListener("storage", onStorageEvent);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
