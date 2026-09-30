(() => {
  'use strict';
  const M = globalThis.CohortModel, P = globalThis.CohortProduct, V = globalThis.CohortView;
  const $ = selector => document.querySelector(selector), $$ = selector => [...document.querySelectorAll(selector)];
  const esc = P.escape;
  let state = M.createState(), selectedArtifact = 'brief', generation = 0, autoRunning = false, stageView = 'preview', mountedStageKey = '';
  const timers = new Set();
  const icons = {
    planner:'<path d="M7 4h10v17H7zM9 4V2h6v2M10 9h4M10 13h4M10 17h3"/>',
    designer:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M10 9v11"/>',
    engineer:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v12c0 4 16 4 16 0V5M4 11c0 4 16 4 16 0"/>',
    accessibility:'<path d="M7 3H3v4M17 3h4v4M7 21H3v-4M17 21h4v-4M7 12h10M12 8v9M9 19l3-5 3 5"/><circle cx="12" cy="6" r="1"/>',
    integrator:'<path d="M3 5h4c3 0 3 7 6 7h8M3 19h4c3 0 3-7 6-7M17 8l4 4-4 4"/>',
    reviewer:'<path d="M12 2l8 3v7c0 5-8 10-8 10S4 17 4 12V5zM8 12l3 3 5-6"/>',
    publisher:'<path d="M4 8l8-5 8 5v12H4zM4 8l8 5 8-5M12 13v7"/>'
  };
  for (const [index, task] of M.TASKS.entries()) {
    const node = document.createElement('button'); node.type = 'button'; node.className = `task-node node-${task.id}`; node.dataset.task = task.id;
    node.innerHTML = `<span class="node-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[task.id]}</svg></span><span class="node-name">${task.short === 'Spec' ? 'Specification' : task.short === 'Merge' ? 'Integration' : task.short === 'Access' ? 'Access' : task.short}</span><span class="task-status">Blocked</span><span class="node-role">${task.role}</span>`;
    $('#graph').append(node);
    const tab = document.createElement('button'); tab.type = 'button'; tab.id = `tab-${task.id}`; tab.dataset.artifact = task.id; tab.setAttribute('role','tab'); tab.setAttribute('aria-controls','artifact-content'); tab.setAttribute('aria-selected','false'); tab.tabIndex=-1; tab.innerHTML = `${task.short}<span class="tab-state" aria-hidden="true">○</span>`;
    $('.artifact-tabs').append(tab);
  }
  const packetTab=document.createElement('button');packetTab.type='button';packetTab.id='tab-packet';packetTab.dataset.artifact='packet';packetTab.setAttribute('role','tab');packetTab.setAttribute('aria-controls','artifact-content');packetTab.setAttribute('aria-selected','false');packetTab.tabIndex=-1;packetTab.innerHTML='Bundle<span class="tab-state" aria-hidden="true">○</span>';$('.artifact-tabs').append(packetTab);
  const sourceDetails = (content,label='Inspect emitted source') => `<details class="source-details"><summary>${label}</summary><pre class="artifact-source">${esc(content)}</pre></details>`;
  const meta=(kind,file)=>`<div class="artifact-meta"><span>${kind}</span><span>${file}</span></div>`;
  const name=id=>M.TASKS.find(task=>task.id===id).name;
  const statusText=status=>status==='completed'?'Accepted':status==='blocked'?'Waiting':status==='failed'?'Rejected':status[0].toUpperCase()+status.slice(1);
  function renderNodes(){
    const retained = V.retainedIds(state);
    for(const task of M.TASKS){const node=$(`[data-task="${task.id}"]`),current=state.tasks[task.id];node.dataset.status=current.status;node.dataset.retained=String(retained.includes(task.id));node.querySelector('.task-status').textContent=retained.includes(task.id)?'Kept':statusText(current.status);node.setAttribute('aria-pressed',String(selectedArtifact===task.id));node.setAttribute('aria-label',`${task.name}, ${retained.includes(task.id)?'Kept after failure':statusText(current.status)}. Inspect ${task.file}.`);}
    $('#packet-node').dataset.ready=String(M.isComplete(state));$('#packet-status').textContent=M.isComplete(state)?'Ready to inspect':'Waiting for review';
    const lanes=$('#worker-lanes');lanes.innerHTML=Array.from({length:state.concurrency},(_,index)=>{const active=M.running(state).find(task=>state.tasks[task.id].lane===index+1);return `<div class="worker-lane" data-busy="${Boolean(active)}"><span class="lane-number">${index+1}</span><div class="lane-description"><strong>${active?active.short:'Available'}</strong><span>${active?'Running':M.isComplete(state)?'Run complete':'No assignment'}</span></div></div>`;}).join('');
  }
  function renderControls(){
    const active=M.running(state),done=M.isComplete(state),failures=M.failed(state),ready=M.ready(state);
    $('#run-button').disabled=active.length>0||ready.length===0;$('#run-button span').textContent=active.length?'Round running…':done?'Complete':!ready.length?'Retry required':'One round';
    $('#auto-run').innerHTML=autoRunning?'Pause after round':done?'Release ready':active.length?'Continue automatically':'Build the journal <span aria-hidden="true">↗</span>';
    $('#auto-run').disabled=!autoRunning&&(done||failures.length>0);
    $$('[data-capacity]').forEach(button=>{button.setAttribute('aria-pressed',String(Number(button.dataset.capacity)===state.concurrency));button.disabled=active.length>0;});
    const fault=$('#fault-button');fault.disabled=state.tasks.engineer.attempts>0;fault.setAttribute('aria-pressed',String(state.failureArmed));fault.querySelector('span').textContent=state.failureArmed?'Data fault armed':state.events.some(event=>event.kind==='failed')?'Fault exercised':'Test a failed handoff';
    $('#retry-button').hidden=!failures.length;$('#retry-button').disabled=active.length>0;$('#retry-button').textContent=failures.length?`Retry ${failures[0].short} ↗`:'Retry rejected task ↗';
    $('#completed-count').innerHTML=`${M.completed(state).length}<span>/7</span>`;$('#round-count').textContent=String(state.round).padStart(2,'0');$('#artifact-count').textContent=`${Object.keys(state.artifacts).length} of 7 produced`;
    $('#run-message').textContent=active.length?`${active.map(task=>task.short).join(' + ')} running. Only accepted outputs can move forward.`:done?'The reading room is built and checked. Try the product or inspect its handoffs.':failures.length?`A duplicate note ID stopped Data. ${V.retainedIds(state).length} accepted outputs are kept. Retry only the failed handoff.`:!state.round?'Build a reading journal with seven roles. Try a failed handoff to see recovery.':`${ready.map(task=>task.short).join(' + ')} ready for the next round.`;
    const retained=V.retainedIds(state);
    $('#dependency-note').textContent=failures.length?`${retained.length} outputs kept. Integration waits for valid Data; its other inputs are already accepted.`:done?`Seven accepted outputs become one usable product.${retained.length?` The ${retained.length} retained artifacts were never rebuilt.`:''}`:state.tasks.integrator.status==='ready'?'All three specialist contracts passed. Their outputs can now be brought together.':state.tasks.reviewer.status==='ready'?'The product is assembled. Separate checks must pass before it can be released.':state.tasks.publisher.status==='ready'?'Six computed checks passed. Release can package the accepted work.':'Independent work can run together. Integration waits for all three specialist outputs.';
  }
  function renderArtifact(){
    for(const tab of $$('.artifact-tabs>button')){const id=tab.dataset.artifact,selected=id===selectedArtifact,available=id==='brief'||Boolean(state.artifacts[id])||id==='packet'&&M.isComplete(state);tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;const marker=tab.querySelector('.tab-state');if(marker)marker.textContent=available?'✓':'○';}
    const id=selectedArtifact,task=M.TASKS.find(item=>item.id===id),panel=$('#artifact-content');panel.setAttribute('aria-labelledby',`tab-${id}`);
    $('#agent-contract').innerHTML=task?`<dl class="contract-grid"><dt>Owner</dt><dd>${task.name} · attempt ${state.tasks[id].attempts}</dd><dt>Inputs</dt><dd>${task.deps.length?task.deps.map(dep=>M.TASKS.find(item=>item.id===dep).file).join(' + '):'product-brief.md'}</dd><dt>Output</dt><dd>${task.file}</dd></dl>`:'';
    if(id==='brief'){panel.innerHTML=`${meta('Source brief','product-brief.md')}<h3>Keep what stays with you.</h3><p class="artifact-description">Build a reading workspace with actual book selection, note filters, saved thoughts, and a local note composer.</p><ul class="issue-list"><li>Interface, data, and accessibility run independently after the specification.</li><li>Integration waits for accepted inputs. Release waits for the separate review receipt.</li></ul>${sourceDetails(M.BRIEF,'Read the full brief')}`;return;}
    const output=id==='packet'?M.packet(state):state.artifacts[id];
    if(!output){const current=task?state.tasks[id]:null;const missing=task?task.deps.filter(dep=>state.tasks[dep].status!=='completed'):[];panel.innerHTML=`${meta(current?statusText(current.status):'Pending',task?task.file:'luma-handoff.md')}<h3>${current?.status==='failed'?'The contract rejected this output.':current?.status==='running'?`${task.name} is working.`:current?.status==='ready'?`${task.name} is ready.`:'This handoff waits for its inputs.'}</h3><p class="artifact-description">${current?.status==='failed'?'The invalid candidate is inspectable below. Retry uses the valid fixed input; accepted work is retained.':task?missing.length?`${missing.map(name).join(' + ')} must finish before ${task.name} can start.`:task.output:'The release bundle appears after all seven outputs are accepted.'}</p>${current?.issues.length?`<ul class="issue-list">${current.issues.map(issue=>`<li><code>${esc(issue.code)} · ${esc(issue.path)}</code>${esc(issue.message)}</li>`).join('')}</ul>`:''}${current?.candidate?sourceDetails(current.candidate,'Inspect rejected candidate'):''}`;return;}
    let content;
    if(id==='packet')content=`<p class="artifact-description">Seven accepted outputs and a composed reading workspace. The release is local; no site is deployed.</p><div class="packet-list">${M.TASKS.map(item=>`<button type="button" data-open-artifact="${item.id}"><span>${item.file}</span><span aria-hidden="true">↗</span></button>`).join('')}</div>${sourceDetails(output.content,'Inspect the full handoff')}`;
    else if(id==='reviewer')content=`<p class="artifact-description">These results are computed from the actual integration artifact.</p>${gateList(output.data.checks)}<p class="artifact-description">${esc(output.data.scope)}</p>${sourceDetails(output.content,'Inspect review receipt')}`;
    else content=`<p class="artifact-description">${task.output}</p>${sourceDetails(output.content,id==='integrator'?'Inspect composed HTML':'Inspect emitted source')}<pre class="artifact-source">${esc(output.content.slice(0,id==='integrator'?450:950))}${output.content.length>(id==='integrator'?450:950)?'\n… expand above for the complete artifact.':''}</pre>`;
    panel.innerHTML=`${meta(output.kind||task.short,output.file)}<h3>${output.title}</h3>${content}`;
  }
  function gateList(checks){return `<ul class="gate-list">${checks.map(check=>`<li data-check="${check.id}" data-passed="${check.passed}"><span class="gate-mark" aria-hidden="true">${check.passed?'✓':'×'}</span><div><strong>${esc(check.label)}</strong><p>${esc(check.evidence)}</p></div></li>`).join('')}</ul>`;}
  function renderWorkspace(){
    const integrated=state.artifacts.integrator,review=state.artifacts.reviewer,done=M.isComplete(state),key=`${generation}-${integrated?'produced':'reference'}`;
    if(key!==mountedStageKey){globalThis.CohortProductUI.mount($('#live-artifact'),integrated?integrated.data.data:P.DATA,integrated?integrated.data.access:P.LABELS,integrated?integrated.data.template:P.TEMPLATE);mountedStageKey=key;}
    $('#stage-source').textContent=integrated?integrated.content:P.render(P.DATA,P.LABELS);
    $('.browser-frame').hidden=stageView!=='preview';$('#stage-source').hidden=stageView!=='source';$('#review-gates').hidden=stageView!=='checks';
    $('#stage-state').textContent=done?'Released locally · seven accepted outputs':review?'Review passed · release pending':integrated?'Produced by Integration · review pending':'Reference target · not yet produced';
    $('#build-indicator').textContent=done?'RELEASED':review?'REVIEWED':integrated?'PRODUCED':'REFERENCE';
    $('#stage-caption').textContent=integrated?'Built from the accepted handoffs. Choose a book, save a thought, or add a local note. Scroll inside the product to read more.':'Try the target product now. Build the graph to produce and check its artifacts.';
    $('#stage-deliverables').innerHTML=M.TASKS.map(task=>`<span data-complete="${Boolean(state.artifacts[task.id])}"><i aria-hidden="true">${state.artifacts[task.id]?'✓':'○'}</i>${task.short}</span>`).join('');
    const rejected=state.tasks.engineer.status==='failed';
    $('#review-gates').innerHTML=review?`<h3>Contract review passed.</h3><p>The reviewer consumes the composed HTML and the accepted specialist inputs.</p>${gateList(review.data.checks)}<p>${esc(review.data.scope)}</p>`:rejected?`<h3>The data contract stopped the merge.</h3><p>A duplicate note identity is an actual schema failure. Integration remains blocked.</p><ul class="issue-list">${state.tasks.engineer.issues.map(issue=>`<li><code>${esc(issue.code)} · ${esc(issue.path)}</code>${esc(issue.message)}</li>`).join('')}</ul><p>Interface and accessibility are preserved. Retry Data, then continue the graph.</p>`:`<h3>Release has an acceptance gate.</h3><p>${integrated?'The product is composed. Run the separate reviewer to execute these checks.':'These checks run after the three specialist artifacts are integrated.'}</p><ul class="gate-list">${['Unique data identities and valid references','Book controls bound to actual records','Initial notes match the selected collection','Named control groups and labelled input','Unique document IDs','No inline executable handlers or scripts'].map(label=>`<li><span class="gate-mark" aria-hidden="true">○</span><div><strong>${label}</strong><p>Waiting for the review task.</p></div></li>`).join('')}</ul>`;
    $$('[data-stage-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.stageView===stageView)));
  }
  function renderLog(){$('#event-count').textContent=`${state.events.length} events`;$('#event-log').innerHTML=[...state.events].reverse().map(event=>`<li data-kind="${event.kind}"><span class="event-round">R${String(event.round).padStart(2,'0')}</span><div><p class="event-message">${esc(event.message)}</p><span class="event-kind">${event.kind==='system'?'Coordinator':event.kind}</span></div></li>`).join('');}
  function renderRounds(){
    const rounds=V.rounds(state),retained=V.retainedIds(state),chart=$('#round-chart');
    $('#rounds-panel').hidden=!rounds.length;
    chart.style.setProperty('--rounds',Math.max(1,rounds.length));
    chart.innerHTML=`<span class="round-head">Role / round</span>${rounds.map(round=>`<span class="round-head">${String(round.number).padStart(2,'0')}</span>`).join('')}${M.TASKS.map(task=>`<span class="round-label">${task.short}</span>${rounds.map(round=>{const attempt=round.tasks.find(item=>item.id===task.id);const status=attempt?(attempt.status==='completed'&&retained.includes(task.id)?'retained':attempt.status):'idle';return `<span class="round-cell" data-round="${round.number}" data-round-task="${task.id}" data-state="${status}" aria-label="${task.name}, round ${round.number}: ${status==='idle'?'not dispatched':status}">${status==='failed'?'×':status==='running'?'◌':['completed','retained'].includes(status)?'●':''}</span>`;}).join('')}`).join('')}`;
  }
  function drawConnections(){
    const bounds=$('#graph').getBoundingClientRect(),svg=$('#connections'),retained=V.retainedIds(state);
    svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);svg.replaceChildren();
    for(const task of M.TASKS)for(const dep of task.deps){
      const a=$(`[data-task="${dep}"]`).getBoundingClientRect(),b=$(`[data-task="${task.id}"]`).getBoundingClientRect();
      const horizontal=window.innerWidth>599||Math.abs(a.top-b.top)<10;
      const x1=(horizontal?a.right:a.left+a.width/2)-bounds.left,y1=(horizontal?a.top+a.height/2:a.bottom)-bounds.top,x2=(horizontal?b.left:b.left+b.width/2)-bounds.left,y2=(horizontal?b.top+b.height/2:b.top)-bounds.top;
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',horizontal?`M${x1} ${y1} C${(x1+x2)/2} ${y1},${(x1+x2)/2} ${y2},${x2} ${y2}`:`M${x1} ${y1} C${x1} ${(y1+y2)/2},${x2} ${(y1+y2)/2},${x2} ${y2}`);
      path.setAttribute('class',`connection ${retained.includes(dep)?'retained-link':state.tasks[dep].status==='completed'?(state.tasks[task.id].status==='ready'||state.tasks[task.id].status==='running'?'ready-link':'complete-link'):'blocked-link'}`);
      path.dataset.from=dep;path.dataset.to=task.id;svg.append(path);
    }
  }
  function render(){renderNodes();renderControls();renderWorkspace();renderArtifact();renderLog();renderRounds();drawConnections();}
  function selectArtifact(id,focus=false){selectedArtifact=id;renderNodes();renderArtifact();if(focus)$('#artifact-content').focus({preventScroll:true});}
  function schedule(){const token=generation;for(const task of M.running(state)){const timer=setTimeout(()=>{timers.delete(timer);if(token!==generation)return;state=M.settleTask(state,task.id);selectedArtifact=M.isComplete(state)?'packet':task.id;if(M.failed(state).length||M.isComplete(state))autoRunning=false;render();if(autoRunning&&!M.running(state).length&&M.ready(state).length){const next=setTimeout(()=>{timers.delete(next);if(token!==generation||!autoRunning)return;state=M.startRound(state);render();schedule();},180);timers.add(next);}},task.duration);timers.add(timer);}}
  function start(automatic){if(M.running(state).length||!M.ready(state).length)return;autoRunning=automatic;state=M.startRound(state);render();schedule();}
  $('#run-button').addEventListener('click',()=>start(false));
  $('#auto-run').addEventListener('click',()=>{if(autoRunning){autoRunning=false;renderControls();}else if(M.running(state).length){autoRunning=true;renderControls();}else start(true);});
  $('#reset-button').addEventListener('click',()=>{generation+=1;autoRunning=false;timers.forEach(clearTimeout);timers.clear();state=M.createState(state.concurrency);selectedArtifact='brief';render();});
  $('#retry-button').addEventListener('click',()=>{const failed=M.failed(state)[0];if(!failed||M.running(state).length)return;state=M.retryTask(state,failed.id);render();schedule();});
  $('#fault-button').addEventListener('click',()=>{state=M.setFailure(state,!state.failureArmed);render();});
  $$('[data-capacity]').forEach(button=>button.addEventListener('click',()=>{state=M.setConcurrency(state,Number(button.dataset.capacity));render();}));
  $$('[data-artifact]').forEach(button=>button.addEventListener('click',()=>selectArtifact(button.dataset.artifact)));
  $$('[data-task]').forEach(button=>button.addEventListener('click',()=>{selectArtifact(button.dataset.task);if(window.innerWidth<1051){const top=$('.artifact-panel').getBoundingClientRect().top+window.scrollY;document.scrollingElement.scrollTo({top:Math.max(0,top-16),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}));
  $('.artifact-tabs').addEventListener('keydown',event=>{const tabs=$$('.artifact-tabs>button'),current=tabs.indexOf(document.activeElement);if(current<0||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectArtifact(tabs[next].dataset.artifact);tabs[next].focus();});
  $('#artifact-content').addEventListener('click',event=>{const button=event.target.closest('[data-open-artifact]');if(button)selectArtifact(button.dataset.openArtifact,true);});
  $$('[data-stage-view]').forEach(button=>button.addEventListener('click',()=>{stageView=button.dataset.stageView;renderWorkspace();}));
  new ResizeObserver(drawConnections).observe($('#graph'));
  render();
})();
