'use strict';
(() => {
  const KEY = 'fieldnote-board:v1';
  const MAX_BYTES = 1024 * 1024;
  const $ = id => document.getElementById(id);
  const statuses = {todo: 'To do', doing: 'In progress', done: 'Done'};
  const priorities = {low: 'Low', medium: 'Medium', high: 'High'};
  const fields = ['id', 'title', 'project', 'status', 'priority', 'dueDate', 'tags'];
  let tasks = [], lastRaw = null, originalRaw = null, corrupt = false, readBlocked = false, conflict = false, unsaved = false;
  let editingId = null, returnFocus = null, deleted = null, importSequence = 0;
  const seed = () => [
    {id:'seed-01',title:'Gather inspiration for the next chapter',project:'Studio refresh',status:'todo',priority:'medium',dueDate:'2026-09-18',tags:['research','brand']},
    {id:'seed-02',title:'Map out the first five minutes',project:'Welcome kit',status:'todo',priority:'high',dueDate:'2026-09-16',tags:['experience','planning']},
    {id:'seed-03',title:'Write the September field notes',project:'Field guide',status:'todo',priority:'low',dueDate:'',tags:['writing']},
    {id:'seed-04',title:'Explore a warmer visual direction',project:'Studio refresh',status:'doing',priority:'high',dueDate:'2026-09-15',tags:['design','exploration']},
    {id:'seed-05',title:'Make the welcome feel personal',project:'Welcome kit',status:'doing',priority:'medium',dueDate:'2026-09-17',tags:['copy','onboarding']},
    {id:'seed-06',title:'Turn our process into a simple guide',project:'Field guide',status:'doing',priority:'medium',dueDate:'2026-09-21',tags:['documentation']},
    {id:'seed-07',title:'Agree on what we stand for',project:'Studio refresh',status:'done',priority:'high',dueDate:'2026-09-08',tags:['strategy','team']},
    {id:'seed-08',title:'Collect the team’s favorite resources',project:'Welcome kit',status:'done',priority:'low',dueDate:'2026-09-09',tags:['resources']},
    {id:'seed-09',title:'Give every project a place to start',project:'Field guide',status:'done',priority:'medium',dueDate:'',tags:['organization']}
  ];
  function validDate(value) {
    if (value === '') return true;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y,m,d] = value.split('-').map(Number);
    const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    return y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= [31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1];
  }
  function cleanText(value, max) { return typeof value === 'string' && value.length > 0 && value.length <= max && value === value.trim(); }
  function validateTask(task, prefix = 'Task') {
    if (!task || typeof task !== 'object' || Array.isArray(task) || Object.keys(task).length !== fields.length || !fields.every(key => Object.hasOwn(task,key))) throw Error(`${prefix}: expected exactly id, title, project, status, priority, dueDate, and tags.`);
    if (typeof task.id !== 'string' || !task.id.length || task.id.length > 80) throw Error(`${prefix}: ID must be a nonempty string of at most 80 characters.`);
    if (!cleanText(task.title,120)) throw Error(`${prefix}: title is required, must be trimmed, and may contain at most 120 characters.`);
    if (!cleanText(task.project,80)) throw Error(`${prefix}: project is required, must be trimmed, and may contain at most 80 characters.`);
    if (typeof task.status !== 'string' || !Object.hasOwn(statuses,task.status)) throw Error(`${prefix}: status must be todo, doing, or done.`);
    if (typeof task.priority !== 'string' || !Object.hasOwn(priorities,task.priority)) throw Error(`${prefix}: priority must be low, medium, or high.`);
    if (!validDate(task.dueDate)) throw Error(`${prefix}: due date must be a real calendar date in YYYY-MM-DD, or empty.`);
    if (!Array.isArray(task.tags) || task.tags.length > 8 || !task.tags.every(t => cleanText(t,24))) throw Error(`${prefix}: use at most 8 trimmed, nonempty tags of up to 24 characters each.`);
    return {id:task.id,title:task.title,project:task.project,status:task.status,priority:task.priority,dueDate:task.dueDate,tags:[...task.tags]};
  }
  function parseBoard(raw) {
    let board;
    try { board = JSON.parse(raw); } catch { throw Error('This file is not valid JSON.'); }
    if (!board || typeof board !== 'object' || Array.isArray(board) || board.schemaVersion !== 1 || !Array.isArray(board.tasks)) throw Error('Expected a schemaVersion: 1 document with a tasks array.');
    const ids = new Set();
    return board.tasks.map((task,index) => {
      const valid = validateTask(task,`Task ${index+1}`);
      if (ids.has(valid.id)) throw Error(`Task ${index+1}: duplicate ID. Every task must have a unique ID.`);
      ids.add(valid.id); return valid;
    });
  }
  const serialize = () => JSON.stringify({schemaVersion:1,tasks},null,2);
  function announce(message) { $('announcement').textContent = message; }
  function locked() { return corrupt || readBlocked || conflict; }
  function syncNotices() {
    $('recovery').hidden = !corrupt && !readBlocked;
    $('conflict').hidden = !conflict;
    $('save-warning').hidden = !unsaved;
    $('download-original').disabled = originalRaw === null;
    $('reset-board').disabled = readBlocked || conflict;
    $('retry-save').disabled = locked();
    $('create-task').disabled = locked();
    $('import-button').disabled = locked();
    $('import-file').disabled = locked();
    $('save-task').disabled = locked();
    $('undo-delete').disabled = locked();
    $('export').disabled = corrupt || readBlocked;
    document.querySelectorAll('[data-action],.column-add').forEach(el => { el.disabled = locked(); });
    $('storage-status').textContent = conflict ? 'Editing paused · newer board available' : corrupt ? 'Saved data preserved · recovery needed' : readBlocked ? 'Browser storage unavailable' : unsaved ? 'Unsaved changes · export a backup' : 'Saved on this device';
  }
  function showConflict() { conflict = true; syncNotices(); if ($('task-dialog').open) formError('This board changed in another tab. Close this form and use Reload saved board to continue. Your draft has not been saved.'); announce('Board changed in another tab. Reload the saved board to continue editing.'); }
  function guard() {
    if (locked()) return false;
    try {
      if (localStorage.getItem(KEY) !== lastRaw) { showConflict(); return false; }
    } catch {
      unsaved = true; syncNotices();
      $('save-warning-detail').textContent = 'Storage cannot be checked. Your work remains in memory or the open form. Export a backup; retry when storage is available.';
      return false;
    }
    return true;
  }
  function persist() {
    const raw = serialize();
    try { localStorage.setItem(KEY,raw); lastRaw = raw; unsaved = false; }
    catch { unsaved = true; $('save-warning-detail').textContent = 'Your work is still here in memory, but browser storage could not save it. Export a backup before leaving, or retry saving.'; }
    syncNotices();
    return !unsaved;
  }
  function commit(next, message) {
    if (!guard()) return false;
    tasks = next;
    const saved = persist();
    render(); announce(`${message}${saved ? ' Saved on this device.' : ' Not saved. Export a backup or retry saving.'}`);
    return true;
  }
  function loadBoard() {
    corrupt = false; readBlocked = false; conflict = false; unsaved = false; originalRaw = null; tasks = []; deleted = null;
    $('delete-toast').hidden = true; $('import-message').hidden = true;
    try { lastRaw = localStorage.getItem(KEY); }
    catch {
      readBlocked = true;
      $('recovery-title').textContent = 'Browser storage is unavailable.';
      $('recovery-detail').textContent = 'Fieldnote cannot safely read your board. Allow browser storage and reload this page. No saved data has been changed.';
      render(); return;
    }
    if (lastRaw === null) { tasks = seed(); if (guard()) persist(); }
    else {
      try { tasks = parseBoard(lastRaw); }
      catch (error) {
        corrupt = true; originalRaw = lastRaw;
        $('recovery-title').textContent = 'Your saved board needs attention.';
        $('recovery-detail').textContent = `The saved data could not be read: ${error.message} Its original contents are untouched. Download a copy before resetting to an empty board.`;
      }
    }
    render();
  }
  function node(tag, className, content) { const el = document.createElement(tag); if (className) el.className = className; if (content !== undefined) el.textContent = content; return el; }
  const icons = {
    edit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z"/></svg>',
    delete:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>',
    date:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg>'
  };
  function taskCard(task) {
    const card = node('article','task-card'); card.dataset.testid = 'task-card'; card.dataset.taskId = task.id;
    const top = node('div','card-top'); top.append(node('span','card-project',task.project));
    const priority = node('span',`priority priority-${task.priority}`); const marker = node('span','priority-marker',task.priority==='high'?'↑':task.priority==='medium'?'−':'↓'); marker.setAttribute('aria-hidden','true'); priority.append(marker,document.createTextNode(priorities[task.priority])); top.append(priority);
    card.append(top,node('h3','',task.title));
    const tags = node('div','tags'); task.tags.forEach(tag => tags.append(node('span','tag',tag))); card.append(tags);
    const bottom = node('div','card-bottom'); const date = node('span','due-date'); date.innerHTML = icons.date;
    if (task.dueDate) { const time = node('time','',new Intl.DateTimeFormat('en',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${task.dueDate}T12:00:00Z`))); time.dateTime = task.dueDate; time.title = task.dueDate; time.setAttribute('aria-label',`Due ${task.dueDate}`); date.append(time); } else date.append(document.createTextNode('No due date'));
    const actions = node('div','card-actions');
    for (const action of ['edit','delete']) { const button = node('button','icon-button'); button.type='button'; button.dataset.action=action; button.innerHTML=icons[action]; button.setAttribute('aria-label',`${action==='edit'?'Edit':'Delete'} ${task.title}`); button.title=action==='edit'?'Edit task':'Delete task'; button.addEventListener('click',()=>action==='edit'?openForm(task,button):deleteTask(task)); actions.append(button); }
    bottom.append(date,actions); card.append(bottom);
    const select=node('select','card-status'); select.dataset.action='status'; select.setAttribute('aria-label',`Status of ${task.title}`);
    Object.entries(statuses).forEach(([value,label])=>{const option=node('option','',label);option.value=value;select.append(option);}); select.value=task.status;
    select.addEventListener('change',()=>{
      const value=select.value;
      if (!commit(tasks.map(t=>t.id===task.id?{...t,status:value}:t),'Task status updated.')) select.value=task.status;
      const replacement = [...document.querySelectorAll('[data-testid="task-card"]')].find(el=>el.dataset.taskId===task.id);
      if(replacement) replacement.querySelector('[data-action="status"]').focus(); else $('filter-status').focus();
    }); card.append(select); return card;
  }
  function hasFilters() { return $('search').value.trim() || ['status','project','priority'].some(f=>$(`filter-${f}`).selectedIndex!==0); }
  function matchingTasks() {
    const query=$('search').value.trim().toLocaleLowerCase();
    return tasks.filter(t=>(!query || [t.title,t.project,...t.tags].some(s=>s.toLocaleLowerCase().includes(query))) && ['status','project','priority'].every(f=>$(`filter-${f}`).selectedIndex===0||t[f]===$(`filter-${f}`).value));
  }
  function render() {
    const projectSelect=$('filter-project'), previous=projectSelect.value, projectWasFiltered=projectSelect.selectedIndex>0;
    projectSelect.replaceChildren(new Option('All projects','all')); $('project-suggestions').replaceChildren();
    [...new Set(tasks.map(t=>t.project))].sort((a,b)=>a.localeCompare(b)).forEach(project=>{ projectSelect.append(new Option(project,project)); $('project-suggestions').append(new Option(project,project)); });
    // Preserve a selected project even when its last task is removed.
    if (projectWasFiltered && ![...projectSelect.options].slice(1).some(o=>o.value===previous)) projectSelect.append(new Option(previous,previous));
    projectSelect.selectedIndex=projectWasFiltered ? [...projectSelect.options].findIndex((o,i)=>i>0&&o.value===previous) : 0;
    const matches=matchingTasks();
    $('result-count').textContent=`${matches.length} of ${tasks.length} tasks`;
    $('nav-count').textContent=tasks.length;
    $('clear-filters').hidden=!hasFilters();
    const counts=Object.fromEntries(Object.keys(statuses).map(s=>[s,tasks.filter(t=>t.status===s).length]));
    $('stat-open').textContent=counts.todo; $('stat-doing').textContent=counts.doing; $('stat-done').textContent=counts.done;
    const percent=tasks.length?Math.round(counts.done/tasks.length*100):0;
    $('progress-value').textContent=`${percent}%`; $('progress').value=percent; $('progress').textContent=`${percent}%`;
    $('board').replaceChildren();
    for(const [status,label] of Object.entries(statuses)) {
      const column=node('section','column'); column.dataset.status=status; column.setAttribute('aria-label',label);
      const header=node('div','column-header'); const dot=node('span','status-dot');dot.setAttribute('aria-hidden','true');
      const list=matches.filter(t=>t.status===status); const add=node('button','icon-button column-add','+');add.setAttribute('aria-label',`Add task to ${label}`);add.addEventListener('click',()=>openForm(null,add,status));
      header.append(dot,node('h2','',label),node('span','column-count',String(list.length)),add);
      const cards=node('div','task-list');list.forEach(t=>cards.append(taskCard(t)));
      if(!list.length) cards.append(node('p','column-empty',hasFilters()?'No matching tasks here.':status==='done'?'Good work will land here.':'A little room for what’s next.'));
      column.append(header,cards);$('board').append(column);
    }
    const empty=!matches.length && !locked(); $('empty-state').hidden=!empty; $('board').hidden=empty||corrupt||readBlocked;
    $('empty-title').textContent=tasks.length?'No tasks match this view':hasFilters()?'No tasks match this view':'A fresh page for your team';
    $('empty-detail').textContent=hasFilters()?'Try a different search or clear your filters.':'Add your first task and give the next step a place to live.';
    $('empty-action').textContent=hasFilters()?'Clear filters':'Create your first task';
    syncNotices();
  }
  function clearFilters() { $('search').value=''; ['status','project','priority'].forEach(f=>$(`filter-${f}`).value='all'); render(); }
  function openForm(task,trigger,status='todo') {
    if(!guard()) return;
    editingId=task?.id||null;returnFocus=trigger; $('task-form').reset();$('form-error').hidden=true;
    [...$('task-form').elements].forEach(el=>el.removeAttribute('aria-invalid'));
    $('dialog-title').textContent=task?'Edit task':'New task';$('save-task').textContent=task?'Save changes':'Create task';
    if(task) { for(const field of fields.filter(f=>f!=='id')) $(field).value=field==='tags'?task.tags.join(', '):task[field]; }
    else $('status').value=status;
    $('task-dialog').showModal();$('title').focus();
  }
  function closeForm(){ $('task-dialog').close(); }
  $('task-dialog').addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const controls=[...$('task-dialog').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')];
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  $('task-dialog').addEventListener('close',()=>{
    const card=editingId&&[...document.querySelectorAll('[data-testid="task-card"]')].find(el=>el.dataset.taskId===editingId);
    if(returnFocus?.isConnected&&!returnFocus.disabled)returnFocus.focus();
    else if(card&&!locked())card.querySelector('[data-action="edit"]').focus();
    else if(!$('create-task').disabled)$('create-task').focus();
    else if(conflict)$('reload-board').focus();
  });
  function formError(message,field) { $('form-error').textContent=message;$('form-error').hidden=false;if(field){$(field).setAttribute('aria-invalid','true');$(field).focus();} }
  function newId(){let id;do{id=globalThis.crypto?.randomUUID?crypto.randomUUID():`task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;}while(tasks.some(t=>t.id===id));return id;}
  $('task-form').addEventListener('submit',event=>{
    event.preventDefault(); [...$('task-form').elements].forEach(el=>el.removeAttribute('aria-invalid'));
    if(!guard()){formError('Saving is paused. Resolve the storage notice before making changes.');return;}
    const seen=new Set(), tags=[];
    $('tags').value.split(',').map(t=>t.trim()).filter(Boolean).forEach(tag=>{const key=tag.toLocaleLowerCase();if(!seen.has(key)){seen.add(key);tags.push(tag);}});
    const original=editingId ? tasks.find(t=>t.id===editingId) : null;
    const preservedTags=original && $('tags').value===original.tags.join(', ') ? [...original.tags] : tags;
    const task={id:editingId||newId(),title:$('title').value.trim(),project:$('project').value.trim(),status:$('status').value,priority:$('priority').value,dueDate:$('dueDate').value.trim(),tags:preservedTags};
    if(!cleanText(task.title,120)){formError('Enter a task title between 1 and 120 characters.','title');return;}
    if(!cleanText(task.project,80)){formError('Enter a project name between 1 and 80 characters.','project');return;}
    if(!validDate(task.dueDate)){formError('Enter a real calendar date in YYYY-MM-DD (for example, 2026-09-24), or leave it empty.','dueDate');return;}
    if(task.tags.length>8||task.tags.some(t=>t.length>24)){formError('Use at most 8 tags, with no more than 24 characters per tag.','tags');return;}
    try{validateTask(task);}catch(error){formError(error.message);return;}
    if(editingId&&!tasks.some(t=>t.id===editingId)){formError('This task no longer exists. Close the form and reload the board.');return;}
    const next=editingId?tasks.map(t=>t.id===editingId?task:t):[...tasks,task];
    if(commit(next,editingId?'Task updated.':'Task created.'))closeForm();
  });
  function deleteTask(task){
    const index=tasks.findIndex(t=>t.id===task.id);
    if(commit(tasks.filter(t=>t.id!==task.id),'Task deleted. Undo is available.')){
      deleted={task,index};$('delete-message').textContent=`“${task.title}” deleted.`;$('delete-toast').hidden=false;$('undo-delete').focus();
    }
  }
  $('undo-delete').addEventListener('click',()=>{
    if(!deleted)return;
    const next=[...tasks];next.splice(Math.min(deleted.index,next.length),0,deleted.task);
    if(commit(next,'Task restored.')){deleted=null;$('delete-toast').hidden=true;$('create-task').focus();}
  });
  $('dismiss-undo').addEventListener('click',()=>{deleted=null;$('delete-toast').hidden=true;$('create-task').focus();});
  function download(content,filename,type='application/json'){
    const url=URL.createObjectURL(new Blob([content],{type}));const link=node('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  $('export').addEventListener('click',()=>{if(!corrupt&&!readBlocked)download(serialize(),'fieldnote-board.json');});
  $('download-original').addEventListener('click',()=>{if(originalRaw!==null)download(originalRaw,'fieldnote-original.txt','text/plain;charset=utf-8');});
  $('reset-board').addEventListener('click',()=>{
    if(readBlocked||conflict||!confirm('Reset the saved board to an empty board? This replaces the original data. Download the original first if you need a copy.'))return;
    try{if(localStorage.getItem(KEY)!==lastRaw){showConflict();return;}}catch{announce('Storage could not be checked. Reset cancelled.');return;}
    const previous=lastRaw;
    try{const raw=JSON.stringify({schemaVersion:1,tasks:[]});localStorage.setItem(KEY,raw);lastRaw=raw;tasks=[];corrupt=false;originalRaw=null;unsaved=false;render();announce('Board reset to an empty board.');}
    catch{lastRaw=previous;$('recovery-detail').textContent='Reset could not be saved. The original data is still preserved. Download it and retry when browser storage is available.';}
  });
  $('retry-save').addEventListener('click',()=>{if(guard()){persist();render();announce(unsaved?'Changes are still not saved.':'All changes saved on this device.');}});
  $('reload-board').addEventListener('click',()=>{
    if((unsaved||$('task-dialog').open)&&!confirm('Reload the saved board? Unsaved work and any open draft will be discarded. Export your current board first if needed.'))return;
    importSequence++;if($('task-dialog').open)closeForm();loadBoard();announce('Saved board reloaded.');
  });
  $('import-button').addEventListener('click',()=>{if(guard())$('import-file').click();});
  function importMessage(message){$('import-message').textContent=message;$('import-message').hidden=false;}
  $('import-file').addEventListener('change',async event=>{
    const file=event.target.files[0], sequence=++importSequence;event.target.value='';if(!file)return;
    if(!guard()){importMessage('Import paused. Resolve the storage notice first.');return;}
    try{
      if(file.size>MAX_BYTES)throw Error('The file exceeds the 1 MiB import limit.');
      const raw=await file.text();if(sequence!==importSequence)return;
      const imported=parseBoard(raw);
      if(!guard()){importMessage('Import paused because the saved board changed or storage is unavailable.');return;}
      if(!confirm(`Replace the entire board with ${imported.length} imported task${imported.length===1?'':'s'}? This replaces all ${tasks.length} current tasks, including hidden tasks. Export a backup first if needed.`)){importMessage('Import cancelled. Your board has not changed.');return;}
      if(commit(imported,'Board imported.')){deleted=null;$('delete-toast').hidden=true;clearFilters();importMessage(unsaved?`Imported ${tasks.length} tasks into memory. NOT SAVED: export a backup or retry saving.`:`Imported ${tasks.length} tasks. The full board is saved on this device.`);}else importMessage('Import was not applied. Reload the saved board to resolve the conflict.');
    }catch(error){if(sequence===importSequence)importMessage(`Import failed: ${error.message} Your existing board has not changed.`);}
  });
  window.addEventListener('storage',event=>{if((event.key===KEY||event.key===null)&&event.storageArea===localStorage&&event.newValue!==lastRaw)showConflict();});
  $('create-task').addEventListener('click',event=>openForm(null,event.currentTarget));
  $('close-dialog').addEventListener('click',closeForm);$('cancel-dialog').addEventListener('click',closeForm);
  $('search').addEventListener('input',render);['status','project','priority'].forEach(f=>$(`filter-${f}`).addEventListener('change',render));
  $('clear-filters').addEventListener('click',clearFilters);$('empty-action').addEventListener('click',event=>hasFilters()?clearFilters():openForm(null,event.currentTarget));
  loadBoard();
})();
