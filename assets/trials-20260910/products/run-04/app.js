'use strict';
(() => {
  const KEY = 'fieldnote-board:v1';
  const MAX_BYTES = 1024 * 1024;
  const STATUSES = { todo: 'To do', doing: 'In progress', done: 'Done' };
  const PRIORITIES = ['low', 'medium', 'high'];
  const FIELDS = ['id', 'title', 'project', 'status', 'priority', 'dueDate', 'tags'];
  const $ = id => document.getElementById(id);
  const form = $('task-form');
  const dialog = $('task-dialog');
  let board = { schemaVersion: 1, tasks: [] };
  let baseline = null, original = null, corrupt = false, conflict = false, dirty = false, readFailed = false;
  let editingId = null, returnFocus = null, deleted = null, importBusy = false;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const icon = kind => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    const paths = { edit: 'M14 4l6 6M4 20l5-1L20 8a2 2 0 0 0-4-4L5 15z', delete: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7', calendar: 'M4 5h16v16H4zM8 2v6M16 2v6M4 10h16' };
    const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[kind]); svg.append(path); return svg;
  };
  function validDate(value) {
    if (value === '') return true;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y,m,d] = value.split('-').map(Number);
    const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    return y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= [31,leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31][m-1];
  }
  function taskErrors(task) {
    const errors = [];
    if (!task || typeof task !== 'object' || Array.isArray(task)) return ['Task must be an object.'];
    if (Object.keys(task).length !== FIELDS.length || !FIELDS.every(k => Object.hasOwn(task,k))) errors.push('Task must contain exactly id, title, project, status, priority, dueDate, and tags.');
    if (typeof task.id !== 'string' || !task.id.trim() || task.id.length > 80) errors.push('ID must be a nonempty string of at most 80 characters.');
    for (const [key,max] of [['title',120],['project',80]]) {
      if (typeof task[key] !== 'string' || !task[key].trim() || task[key] !== task[key].trim() || task[key].length > max) errors.push(`${key === 'title' ? 'Title' : 'Project'} is required and must be trimmed, with at most ${max} characters.`);
    }
    if (typeof task.status !== 'string' || !Object.hasOwn(STATUSES,task.status)) errors.push('Choose a valid status.');
    if (!PRIORITIES.includes(task.priority)) errors.push('Choose a valid priority.');
    if (typeof task.dueDate !== 'string' || !validDate(task.dueDate)) errors.push('Due date must be a real calendar date in YYYY-MM-DD.');
    if (!Array.isArray(task.tags) || task.tags.length > 8 || task.tags.some(t => typeof t !== 'string' || !t.trim() || t !== t.trim() || t.length > 24)) errors.push('Use at most 8 nonempty tags, each trimmed and at most 24 characters.');
    return errors;
  }
  function parseBoard(raw, limit = false) {
    if (limit && new Blob([raw]).size > MAX_BYTES) throw new Error('The file exceeds the 1 MiB limit.');
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error('This is not valid JSON.'); }
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.schemaVersion !== 1 || !Array.isArray(data.tasks)) throw new Error('Expected a schemaVersion 1 board with a tasks array.');
    const ids = new Set();
    data.tasks.forEach((task,index) => {
      const errors = taskErrors(task);
      if (errors.length) throw new Error(`Task ${index + 1}: ${errors.join(' ')}`);
      if (ids.has(task.id)) throw new Error(`Task ${index + 1}: duplicate ID “${task.id}”.`);
      ids.add(task.id);
    });
    return {schemaVersion:1,tasks:data.tasks.map(t => ({id:t.id,title:t.title,project:t.project,status:t.status,priority:t.priority,dueDate:t.dueDate,tags:[...t.tags]}))};
  }
  function localDate(offset = 0) {
    const date = new Date(); date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function seed() {
    return {schemaVersion:1,tasks:[
      {id:'fn-101',title:'Gather inspiration for the new homepage',project:'Website refresh',status:'todo',priority:'high',dueDate:localDate(2),tags:['research','design']},
      {id:'fn-102',title:'Write a warmer welcome email',project:'Studio launch',status:'todo',priority:'medium',dueDate:localDate(4),tags:['content']},
      {id:'fn-103',title:'Map out the first month of stories',project:'Studio launch',status:'todo',priority:'low',dueDate:'',tags:['planning','social']},
      {id:'fn-104',title:'Explore a simpler navigation',project:'Website refresh',status:'doing',priority:'high',dueDate:localDate(1),tags:['design','experience']},
      {id:'fn-105',title:'Bring the launch checklist together',project:'Studio launch',status:'doing',priority:'medium',dueDate:localDate(3),tags:['planning']},
      {id:'fn-106',title:'Find the story we want to tell',project:'Studio launch',status:'done',priority:'medium',dueDate:localDate(-1),tags:['strategy','content']},
      {id:'fn-107',title:'Audit the existing website',project:'Website refresh',status:'done',priority:'low',dueDate:'',tags:['research']}
    ]};
  }
  function announce(message, error = false) { $('feedback').textContent = message; $('feedback').classList.toggle('error',error); $('feedback').hidden = false; }
  function setConflict() {
    conflict = true;
    if (dialog.open) { $('form-errors').textContent = 'Another tab changed this board. Your form is still here, but saving is paused. Close this form and use Reload board to continue.'; $('form-errors').hidden = false; }
    updateSafety();
  }
  function updateSafety() {
    const blocked = corrupt || conflict;
    $('recovery').hidden = !corrupt; $('conflict').hidden = !conflict;
    $('save-error').hidden = !dirty && !readFailed;
    $('save-state').textContent = conflict ? 'Another tab has changes' : corrupt ? 'Recovery needed' : dirty || readFailed ? 'Not saved · in this tab only' : 'Saved on this device';
    for (const node of document.querySelectorAll('[data-testid="create-task"], [data-action], .column-add, #empty-create, #import-trigger, #import-file, [data-testid="save-task"], #undo-delete')) node.disabled = blocked;
    $('retry-save').disabled = blocked;
    $('reset-board').disabled = conflict;
    $('download-original').disabled = original === null;
  }
  function safeToWrite() {
    if (corrupt || conflict) { announce('Resolve the recovery or other-tab notice before changing this board.',true); return false; }
    try {
      const current = localStorage.getItem(KEY);
      if (readFailed || current !== baseline) { setConflict(); return false; }
    } catch { /* A write may also fail; retain the edited board in memory. */ }
    return true;
  }
  function persist() {
    try {
      const current = localStorage.getItem(KEY);
      if (readFailed || current !== baseline) { setConflict(); dirty = true; updateSafety(); return false; }
      const raw = JSON.stringify(board);
      localStorage.setItem(KEY,raw); baseline = raw; dirty = false; readFailed = false;
      updateSafety(); return true;
    } catch {
      dirty = true;
      $('save-error-message').textContent = 'Your work is still available in this tab. Storage may be full or unavailable. Export a backup before closing, or try saving again.';
      updateSafety(); return false;
    }
  }
  function commit(tasks) {
    if (!safeToWrite()) return false;
    board = {schemaVersion:1,tasks}; dirty = true; persist(); render(); return true;
  }
  function start() {
    conflict = false; corrupt = false; dirty = false; readFailed = false; original = null; deleted = null;
    $('undo-bar').hidden = true; $('feedback').hidden = true;
    try { baseline = localStorage.getItem(KEY); }
    catch {
      baseline = null; readFailed = true; board = {schemaVersion:1,tasks:[]};
      $('save-error-message').textContent = 'This browser is preventing access to local storage. Work can stay in this tab and be exported. Reload the board after storage becomes available.';
      render(); return;
    }
    if (baseline === null) { board = seed(); persist(); }
    else {
      try { board = parseBoard(baseline); }
      catch (error) { corrupt = true; original = baseline; board = {schemaVersion:1,tasks:[]}; $('recovery-message').textContent = `${error.message} The original data is untouched. Download it before choosing to reset.`; }
    }
    render();
  }
  function currentProjects() { return [...new Set(board.tasks.map(t => t.project))].sort((a,b) => a.localeCompare(b)); }
  function render() {
    const projects = currentProjects(); const projectValue = $('filter-project').value;
    $('filter-project').replaceChildren(new Option('All projects','all'),...projects.map(p => new Option(p,p)));
    if (projects.includes(projectValue)) $('filter-project').value = projectValue;
    $('project-options').replaceChildren(...projects.map(p => new Option(p,p)));
    $('project-links').replaceChildren(...projects.map(p => {
      const b = el('button','project-link',p); b.type='button'; b.setAttribute('aria-pressed',String($('filter-project').value === p));
      b.append(el('span','',String(board.tasks.filter(t => t.project===p).length)));
      b.addEventListener('click',() => { $('filter-project').value=p; render(); }); return b;
    }));
    const query = $('search').value.trim().toLocaleLowerCase();
    const status = $('filter-status').value, project = $('filter-project').value, priority = $('filter-priority').value;
    const filtered = board.tasks.filter(t => (!query || [t.title,t.project,...t.tags].some(v => v.toLocaleLowerCase().includes(query))) && (status==='all'||t.status===status) && (project==='all'||t.project===project) && (priority==='all'||t.priority===priority));
    $('stat-total').textContent=board.tasks.length; $('nav-count').textContent=board.tasks.length;
    $('stat-doing').textContent=board.tasks.filter(t=>t.status==='doing').length;
    $('stat-done').textContent=board.tasks.filter(t=>t.status==='done').length;
    $('stat-due').textContent=board.tasks.filter(t=>t.status!=='done' && t.dueDate && t.dueDate>=localDate() && t.dueDate<=localDate(6)).length;
    $('result-count').textContent=`${filtered.length} of ${board.tasks.length} tasks`;
    $('clear-filters').hidden = !query && status==='all' && project==='all' && priority==='all';
    $('no-results').hidden = !board.tasks.length || !!filtered.length || corrupt;
    $('empty-board').hidden = !!board.tasks.length || corrupt;
    $('columns').hidden = !filtered.length;
    const columns = Object.entries(STATUSES).map(([value,label]) => {
      const section=el('section','column'); section.dataset.status=value; section.setAttribute('aria-label',label);
      const heading=el('div','column-heading'); const dot=el('span','column-dot'); dot.setAttribute('aria-hidden','true');
      const tasks=filtered.filter(t=>t.status===value);
      heading.append(dot,el('h3','',label),el('span','column-count',String(tasks.length)));
      const add=el('button','column-add','+'); add.setAttribute('aria-label',`Add task to ${label}`); add.addEventListener('click',()=>openForm(null,value)); heading.append(add);
      const list=el('div','task-list'); list.append(...tasks.map(renderCard));
      if (!tasks.length) list.append(el('p','column-empty',`No ${label.toLowerCase()} tasks in view.`));
      section.append(heading,list); return section;
    });
    $('columns').replaceChildren(...columns); updateSafety();
  }
  function renderCard(task) {
    const card=el('article','task-card'); card.dataset.testid='task-card'; card.dataset.taskId=task.id;
    const top=el('div','task-top'); top.append(el('span','project-name',task.project),el('span',`priority ${task.priority}`,`${task.priority === 'high' ? '↑ ' : ''}${task.priority[0].toUpperCase()+task.priority.slice(1)}`));
    card.append(top,el('h4','',task.title));
    if(task.tags.length){const tags=el('div','tags'); tags.append(...task.tags.map(t=>el('span','tag',t))); card.append(tags);}
    const overdue=task.dueDate && task.dueDate<localDate() && task.status!=='done';
    const date=el('div',`task-date${overdue?' overdue':''}`); date.append(icon('calendar'));
    let dateLabel='No due date';
    if(task.dueDate){const [y,m,d]=task.dueDate.split('-').map(Number); const dateObj=new Date(0); dateObj.setFullYear(y,m-1,d); dateLabel=new Intl.DateTimeFormat('en',{month:'short',day:'numeric',...(y!==new Date().getFullYear()?{year:'numeric'}:{})}).format(dateObj);}
    date.append(document.createTextNode(`${dateLabel}${overdue?' · Overdue':''}`)); card.append(date);
    const footer=el('div','card-footer'); const select=el('select'); select.dataset.action='status'; select.setAttribute('aria-label',`Status for ${task.title}`);
    select.append(...Object.entries(STATUSES).map(([v,l])=>new Option(l,v))); select.value=task.status;
    select.addEventListener('change',()=>{ const value=select.value; if(commit(board.tasks.map(t=>t.id===task.id?{...t,status:value}:t))) { announce(`“${task.title}” moved to ${STATUSES[value].toLowerCase()}.`); (findCard(task.id)?.querySelector('[data-action=status]') || $('filter-status')).focus(); } else select.value=task.status; });
    const actions=el('div','card-actions');
    for(const action of ['edit','delete']) { const b=el('button','icon-button'); b.dataset.action=action; b.setAttribute('aria-label',`${action==='edit'?'Edit':'Delete'} ${task.title}`); b.title=action==='edit'?'Edit task':'Delete task'; b.append(icon(action)); b.addEventListener('click',()=>action==='edit'?openForm(task):deleteTask(task)); actions.append(b); }
    footer.append(select,actions); card.append(footer); return card;
  }
  function newId(){let id;do{id=globalThis.crypto?.randomUUID?.() || `fn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;}while(board.tasks.some(t=>t.id===id));return id;}
  function openForm(task=null,status='todo') {
    if(corrupt||conflict) return;
    returnFocus=document.activeElement; editingId=task?.id ?? null; form.reset();
    $('form-errors').hidden=true; form.querySelectorAll('[aria-invalid]').forEach(n=>n.removeAttribute('aria-invalid'));
    $('dialog-title').textContent=task?'Edit task':'New task';
    for(const key of ['title','project','status','priority','dueDate','tags']) form.elements[key].value=task?(key==='tags'?task.tags.join(', '):task[key]):({status,priority:'medium',project:$('filter-project').value==='all'?'':$('filter-project').value}[key]||'');
    dialog.showModal(); form.elements.title.focus();
  }
  function findCard(id){return [...document.querySelectorAll('[data-testid=task-card]')].find(n=>n.dataset.taskId===id);}
  function closeForm(){dialog.close();}
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab') return;
    const controls=[...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])')].filter(n=>n.getClientRects().length);
    const first=controls[0], last=controls[controls.length-1];
    if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
  });
  dialog.addEventListener('close',()=>{
    const taskId=returnFocus?.closest('[data-task-id]')?.dataset.taskId;
    const replacement=taskId ? findCard(taskId)?.querySelector(`[data-action=${returnFocus.dataset.action}]`) : null;
    if(returnFocus?.isConnected) returnFocus.focus(); else if(replacement) replacement.focus(); else $('create-task').focus();
  });
  $('close-dialog').addEventListener('click',closeForm); $('cancel-dialog').addEventListener('click',closeForm);
  form.addEventListener('submit',event=>{
    event.preventDefault(); if(corrupt||conflict) return;
    const tags=[]; const seen=new Set();
    for(const raw of form.elements.tags.value.split(',')){const t=raw.trim();if(t&&!seen.has(t.toLocaleLowerCase())){seen.add(t.toLocaleLowerCase());tags.push(t);}}
    const task={id:editingId||newId(),title:form.elements.title.value.trim(),project:form.elements.project.value.trim(),status:form.elements.status.value,priority:form.elements.priority.value,dueDate:form.elements.dueDate.value,tags};
    const errors=taskErrors(task);
    if(form.elements.dueDate.validity.badInput || form.elements.dueDate.validity.rangeOverflow || form.elements.dueDate.validity.rangeUnderflow) errors.push('Enter a real due date between 0001-01-01 and 9999-12-31.');
    for(const [key,max] of [['title',120],['project',80]]) form.elements[key].setAttribute('aria-invalid',String(!task[key]||task[key].length>max));
    if(errors.length){const ul=el('ul');ul.append(...errors.map(e=>el('li','',e)));$('form-errors').replaceChildren(ul);$('form-errors').hidden=false;$('form-errors').scrollIntoView({block:'nearest'});return;}
    const tasks=editingId?board.tasks.map(t=>t.id===editingId?task:t):[...board.tasks,task];
    if(commit(tasks)){closeForm();announce(dirty?'Task updated in this tab. Changes are not saved.':editingId?'Task updated.':'Task added.');}
  });
  function deleteTask(task){const index=board.tasks.findIndex(t=>t.id===task.id);if(commit(board.tasks.filter(t=>t.id!==task.id))){deleted={task,index};$('undo-message').textContent='Task deleted.';$('undo-bar').hidden=false;$('undo-delete').focus();}}
  $('undo-delete').addEventListener('click',()=>{if(!deleted)return;const tasks=[...board.tasks];tasks.splice(Math.min(deleted.index,tasks.length),0,deleted.task);if(commit(tasks)){deleted=null;$('undo-bar').hidden=true;announce(dirty?'Task restored in this tab; not saved.':'Task restored.');$('create-task').focus();}});
  $('dismiss-undo').addEventListener('click',()=>{deleted=null;$('undo-bar').hidden=true;$('create-task').focus();});
  function clearFilters(){$('search').value='';for(const id of ['filter-status','filter-project','filter-priority'])$(id).value='all';render();}
  for(const id of ['clear-filters','empty-clear','show-board'])$(id).addEventListener('click',clearFilters);
  for(const id of ['create-task','empty-create'])$(id).addEventListener('click',()=>openForm());
  $('search').addEventListener('input',render);
  for(const id of ['filter-status','filter-project','filter-priority'])$(id).addEventListener('change',render);
  function download(raw,name,type='application/json'){const url=URL.createObjectURL(new Blob([raw],{type}));const a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('export').addEventListener('click',()=>{download(JSON.stringify(board,null,2),'fieldnote-board.json');announce(`Exported all ${board.tasks.length} tasks${dirty?' from this tab’s unsaved board':''}.`);});
  $('import-trigger').addEventListener('click',()=>$('import-file').click());
  $('import-file').addEventListener('change',async event=>{
    const file=event.target.files[0]; event.target.value=''; if(!file||importBusy)return;importBusy=true;
    try {
      if(corrupt||conflict)throw new Error('Resolve the recovery or other-tab notice before importing.');
      if(file.size>MAX_BYTES)throw new Error('The file exceeds the 1 MiB limit.');
      const candidate=parseBoard(await file.text(),true);
      if(!safeToWrite())return;
      if(!window.confirm(`Replace the entire board with ${candidate.tasks.length} imported tasks? This replaces all current tasks, including those hidden by filters. Export a backup first if needed.`)){announce('Import cancelled. Your board is unchanged.');return;}
      if(commit(candidate.tasks)){deleted=null;$('undo-bar').hidden=true;clearFilters();announce(dirty?'Board imported in this tab. Changes are not saved.':`Imported ${candidate.tasks.length} tasks.`);}
    }catch(error){announce(`Import failed: ${error.message} Your board is unchanged.`,true);}finally{importBusy=false;}
  });
  $('download-original').addEventListener('click',()=>{if(original!==null)download(original,'fieldnote-original-data.txt','text/plain;charset=utf-8');});
  $('reset-board').addEventListener('click',()=>{
    if(conflict||!corrupt)return;
    if(!confirm('Reset the unreadable board to an empty board? This replaces the stored data. Download the original first if you need a copy.'))return;
    try{if(localStorage.getItem(KEY)!==baseline){setConflict();return;}}catch{announce('Storage is unavailable. The original data is still preserved.',true);return;}
    corrupt=false;board={schemaVersion:1,tasks:[]};dirty=true;
    if(persist()){original=null;announce('Board reset. Ready for a fresh start.');}
    else{corrupt=true;}
    render();
  });
  $('retry-save').addEventListener('click',()=>{if(readFailed){if(confirm('Reload the saved board? Export any work in this tab first.'))start();return;}if(safeToWrite()&&persist())announce('All changes saved on this device.');});
  $('reload-board').addEventListener('click',()=>{if(dirty&&!confirm('Reload the other tab’s board and discard unsaved work here? Export first to keep a copy.'))return;if(dialog.open)dialog.close();start();});
  window.addEventListener('storage',event=>{if((event.key===KEY||event.key===null)&&event.storageArea===localStorage&&event.newValue!==baseline)setConflict();});
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  start();
})();
