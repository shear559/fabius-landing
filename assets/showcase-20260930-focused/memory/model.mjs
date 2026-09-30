// Browser adaptation of the lexical BM25 scoring in Fabius Archivum's retrieval.mjs.
// Explicit, fictional records; no filesystem traversal, network or model calls.
export const PROJECT = 'Luma reading room';
export const RECORDS = [
 {id:'brief',title:'A quiet place for reading',kind:'Brief',date:'2026-09-24',path:'luma/brief.md',line:3,status:'current',body:'Luma is a reading workspace. Keep a library, save useful notes and return to a thought with its source. The next release should make reading and note capture feel effortless.',tags:'release product purpose library'},
 {id:'accounts-old',title:'Accounts before launch',kind:'Decision',date:'2026-09-24',path:'luma/decisions.md',line:4,status:'superseded',replacement:'local-notes',body:'The first proposal put accounts and remote note storage before the next release.',tags:'accounts save notes release'},
 {id:'local-notes',title:'Local notes. No account required.',kind:'Decision',date:'2026-09-26',path:'luma/decisions.md',line:8,status:'current',body:'The first release keeps notes in local browser storage. Do not add accounts or a remote database. Export lets readers keep a portable copy of their saved notes.',tags:'release notes saved persistence accounts storage decision'},
 {id:'keyboard',title:'Every path works from the keyboard',kind:'Constraint',date:'2026-09-27',path:'luma/accessibility.md',line:3,status:'current',body:'Before release, check book selection, filters, note creation and dialog focus using only the keyboard. Return focus to the button that opened the dialog.',tags:'release keyboard accessibility validation check'},
 {id:'identity',title:'A calm, violet reading room',kind:'Design',date:'2026-09-27',path:'luma/design.md',line:5,status:'current',body:'Keep the warm paper, violet book covers and quiet controls. Put color into the books; keep buttons neutral. Preserve the approved reading-room identity.',tags:'design visual style color reading'},
 {id:'export',title:'Export before calling it complete',kind:'Next step',date:'2026-09-28',path:'luma/handoff.md',line:6,status:'current',body:'For the next release, finish JSON export and verify that a saved note survives a download and import. The accepted reading workspace is the starting point.',tags:'release next work export saved notes handoff'},
 {id:'duplicates',title:'Keep note identities unique',kind:'Lesson',date:'2026-09-28',path:'luma/checks.md',line:9,status:'current',body:'A duplicate note ID blocked integration. Keep the existing accepted interface and labels; repair only the data branch and rerun the independent review.',tags:'code duplicate data validation repair regression'},
 {id:'film',title:'Afterlight motion study',kind:'Other project',date:'2026-09-28',path:'afterlight/brief.md',line:3,status:'outside',body:'An independent study of moving light and metallic bands. Its release is separate from the reading workspace.',tags:'release motion light'}
];
const tokenize = value => value.normalize('NFKC').toLowerCase().match(/[\p{L}\p{M}\p{N}_]+/gu)||[];
const stop = new Set('a an the is to for of in on and or how what should do we it be can with about next'.split(' '));
export function retrieve(records,query,limit=3){
 if(typeof query!=='string'||query.length>300)throw new Error('Use a question of up to 300 characters.');
 if(!Number.isInteger(limit)||limit<1||limit>6)throw new Error('Select between one and six records.');
 const terms=[...new Set(tokenize(query).filter(x=>!stop.has(x)))];
 const candidates=records.filter(r=>r.status==='current');
 const docs=candidates.map(record=>{const words=tokenize(record.title+' '+record.body+' '+record.tags);return {record,words,counts:words.reduce((m,w)=>m.set(w,(m.get(w)||0)+1),new Map())};});
 const n=docs.length,average=n?docs.reduce((s,d)=>s+d.words.length,0)/n:1;
 const frequency=new Map(terms.map(term=>[term,docs.filter(d=>d.counts.has(term)).length]));
 return docs.map(({record,words,counts})=>({record,score:terms.reduce((sum,term)=>{const count=counts.get(term)||0;const idf=Math.log(1+(n-frequency.get(term)+.5)/(frequency.get(term)+.5));return sum+idf*count*2.2/(count+1.2*(.25+.75*words.length/average));},0),matched:terms.filter(t=>counts.has(t))})).filter(r=>r.score>0).sort((a,b)=>b.score-a.score||b.record.date.localeCompare(a.record.date)||a.record.id.localeCompare(b.record.id)).slice(0,limit);
}
export function contextPack(results,query){
 return ['# '+PROJECT+' — next task','',query,'',...results.flatMap(({record:r},i)=>['## '+(i+1)+'. '+r.title,r.body,`Source: ${r.path}:${r.line} · ${r.date}`,''])].join('\n');
}
export function remember(records,text){
 if(typeof text!=='string'||text.trim().length<10||text.trim().length>240)throw new Error('Write a decision between 10 and 240 characters.');
 const count=records.filter(r=>r.id.startsWith('saved-')).length;
 if(count>=6)throw new Error('This demo holds six new decisions. Reset to start again.');
 const id='saved-'+(count+1),body=text.trim();
 return [...records,{id,title:body.length>58?body.slice(0,55)+'…':body,kind:'New decision',date:'2026-09-30',path:'luma/decisions.md',line:12+count*3,status:'current',body,tags:'decision release next '+body}];
}
