export const STORAGE_KEY = 'fabius-memory-demo-v1';
export const records = Object.freeze([
  {id:'brand',title:'The visual direction',source:'luma/design.md · 12',status:'current',body:'Keep the warm paper canvas, green book covers and quiet controls. The mobile layout follows the same brand.',tags:'brand design colour color visual mobile'},
  {id:'accounts',title:'Start without an account',source:'luma/decisions.md · 28',status:'current',body:'The first reading experience works offline. Sign-in is deferred until shared collections need an account.',tags:'accounts login offline scope sign in'},
  {id:'access',title:'Keyboard access is part of done',source:'luma/checks.md · 7',status:'current',body:'Every control needs a visible focus state, an accessible label and a working keyboard path.',tags:'accessibility keyboard focus checks'},
  {id:'accounts-old',title:'Require sign-in on arrival',source:'luma/history.md · 3',status:'superseded',body:'Earlier proposal: request an account before opening the reading room. Replaced by the offline-first decision.',tags:'accounts login offline'}
]);

export function parseNote(raw) {
  if (typeof raw !== 'string' || raw.length > 1000) return null;
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || typeof value.note !== 'string') return null;
    const note = value.note.trim();
    return note.length > 0 && note.length <= 180 ? note : null;
  } catch { return null; }
}

export function noteRecord(note) {
  return {id:'saved',title:'Your saved decision',source:'this browser · demo note',status:'current',body:note,tags:'saved decision note'};
}

export function retrieve(query, source = records) {
  const terms = [...new Set(String(query).toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [])].filter(t=>t.length>1);
  if (!terms.length) return [];
  return source.filter(r=>r.status==='current').map(r=>{
    const text = `${r.title} ${r.body} ${r.tags}`.toLocaleLowerCase();
    return {record:r,score:terms.filter(term=>text.includes(term)).length};
  }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(r=>r.record);
}

export const routes = {
  launch: {brief:'Build a launch page using our existing brand.',steps:[
    ['Request','A launch page that explains the product and gives visitors one next step.'],
    ['Route','Decor · Mercatus · Disciplina · Archivum'],
    ['Compose','Retrieve the brand decisions. Assign visual design, copy and implementation to their owners.'],
    ['Execute','Build the page using the files and tools available in the agent environment.'],
    ['Verify','Check responsive layout, keyboard paths, links and the primary action.'],
    ['Remember','With permission, record the approved design and the remaining work.']
  ]},
  workflow: {brief:'Design an automation for incoming product data.',steps:[
    ['Request','Validate incoming product records and send accepted changes to the catalogue.'],
    ['Route','Machina · Disciplina · Praesidium'],
    ['Compose','Define the data contract, integration steps, permissions and failure handling.'],
    ['Execute','Build the workflow against the connected services’ actual schemas.'],
    ['Verify','Exercise valid, invalid, duplicate and failed-delivery cases on sample data.'],
    ['Remember','Record the configuration and operating decisions in the approved project store.']
  ]},
  resume: {brief:'Continue the reading-room project from our last decision.',steps:[
    ['Request','Find the current project state and identify the next unfinished task.'],
    ['Route','Archivum · Disciplina · the relevant domain skill'],
    ['Compose','Read current decisions, check their sources and keep superseded records out of the working context.'],
    ['Execute','Continue the agreed task using the current files and available tools.'],
    ['Verify','Check the changed behavior against the project’s acceptance conditions.'],
    ['Remember','Update the project record and append what changed, with permission.']
  ]}
};
