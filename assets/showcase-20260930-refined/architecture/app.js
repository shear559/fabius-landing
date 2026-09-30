(() => {
  'use strict';
  const { initialState, transition, REQUEST_KEY, JOB_ID, OUTPUT_KEY } = globalThis.RelayModel;
  const scenarios = globalThis.RelayScenarios;
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  let state = initialState();
  let scenario = 'recovery';
  let cursor = 0;
  let selected = 'client';
  let playing = false;
  let timer = null;
  let generation = 0;
  const icons = {
    client:'<rect x="3" y="4" width="22" height="16" rx="2"/><path d="M9 25h10M14 20v5M7 9h4m-4 4h10"/>',
    api:'<path d="m10 6-7 8 7 8m8-16 7 8-7 8M16 4l-4 20"/>',
    queue:'<rect x="4" y="3" width="20" height="6" rx="2"/><rect x="4" y="11" width="20" height="6" rx="2"/><rect x="4" y="19" width="20" height="6" rx="2"/>',
    worker:'<rect x="6" y="6" width="16" height="16" rx="3"/><path d="M10 2v4m8-4v4m-8 16v4m8-4v4M2 10h4m-4 8h4m16-8h4m-4 8h4M11 11h6v6h-6z"/>',
    store:'<path d="m3 9 11-6 11 6v13l-11 6-11-6Z"/><path d="m3 9 11 6 11-6M14 15v13M8 6l11 6"/>',
    status:'<rect x="5" y="3" width="18" height="23" rx="2"/><path d="M9 9h10M9 14h10M9 19h6"/>'
  };
  const nodes = [
    {id:'client', name:'Client', kind:'Request origin', owns:'The source reference and a stable idempotency key.', description:'A repeated request keeps its original identity.', failure:'Resend the same key if the response is lost. This model retains the original job mapping.'},
    {id:'api', name:'API', kind:'Identity boundary', owns:'The request-key → job mapping and initial queue write.', description:'Accept one job for this request key.', failure:'A replay returns the existing job or output. API crashes and partial writes are outside this fixture.'},
    {id:'queue', name:'Queue', kind:'Retained work', owns:'Pending deliveries, including interrupted work.', description:'The job waits here until a worker can hold it.', failure:'When the worker stops, the unfinished job returns here. Durability is simulated in memory.'},
    {id:'worker', name:'Worker', kind:'Delivery attempt', owns:'One attempt at the job; it releases ownership after commit or interruption.', description:'Process, then commit to a stable output key.', failure:'Interruption before commit produces no output. Recovery starts a new delivery attempt.'},
    {id:'store', name:'Object store', kind:'Stable output key', owns:'A single synthetic preview record keyed by job identity.', description:'Commit once, then return the same output reference.', failure:'The model checks the stable key. Store failure, concurrency races, and partial commits are not simulated.'},
    {id:'status', name:'Status record', kind:'Inspectable state', owns:'The current job phase, attempts, replay count, and output reference.', description:'The shared account of what has happened.', failure:'Status and output are updated together in this fixture. This is not a distributed transaction implementation.'}
  ];
  const topology = $('topology');
  for (const [index, node] of nodes.entries()) {
    const button = document.createElement('button');
    button.type='button'; button.className=`service-node node-${node.id}`; button.dataset.node=node.id;
    button.innerHTML=`<span class="packet-badge">${node.id==='client'?'request':'job_001'}</span><span class="service-head"><svg viewBox="0 0 28 30" aria-hidden="true">${icons[node.id]}</svg><span><strong>${node.name}</strong><span class="service-kicker">${node.kind}</span></span></span><span class="service-visual"></span><span class="node-meta"></span>`;
    button.setAttribute('aria-label', `Inspect ${node.name}`);
    button.addEventListener('click', () => { selected=node.id; renderInspector(); renderNodes(); });
    topology.append(button);
  }
  const currentOwner = () => !state.job ? 'client' : ['queued','waiting'].includes(state.job.status) ? 'queue' : state.job.status==='processing' ? 'worker' : 'store';
  const field = (label,value) => `<span class="mini-field"><span>${label}</span><code>${esc(value)}</code></span>`;
  function renderNodes() {
    const job=state.job;
    const visuals={
      client:'<span class="source-scene"><svg viewBox="0 0 120 60" aria-hidden="true"><path d="M-10 52Q18 15 44 31T94 19T140 1M-10 58Q22 23 46 38T97 27T140 8M-10 64Q22 31 48 45T98 35T140 16M-10 70Q22 39 48 52T98 42T140 23"/></svg></span>'+field('source','coastline.mov'),
      api:field('request key','req_media_01')+field('maps to',job?'job_001':'not assigned'),
      queue:`<span class="queue-slot ${state.queue.length?'filled':''}">${state.queue[0]||'empty'}</span><span class="queue-slot">available slot</span><span class="queue-slot">available slot</span>`,
      worker:`<span class="worker-console"><span>attempt: <strong>${String(job?.attempts||0).padStart(2,'0')}</strong></span><span>worker: <strong>${state.workerAvailable?'online':'offline'}</strong></span><span>commit: <strong>${state.outputs.length?'written':'pending'}</strong></span></span>`,
      store:`<span class="object-mini ${state.outputs.length?'is-written':''}"><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M4 2h10l6 6v18H4ZM14 2v6h6M8 13h8M8 17h8M8 21h5"/></svg><span>${state.outputs.length?'job_001.mp4':'No object'}</span></span>`,
      status:field('state',job?.status||'no record')+field('output ref',job?.outputKey?'committed':'null')
    };
    const meta={client:job?'Request submitted':'POST /jobs',api:job?`${job.replays} replays`:'Accept once',queue:`${state.queue.length} pending`,worker:!state.workerAvailable?'Unavailable':job?.status==='processing'?'Processing':'Available',store:`${state.outputs.length} committed`,status:job?.status||'No record'};
    document.querySelectorAll('[data-node]').forEach(node=>{
      node.querySelector('.service-visual').innerHTML=visuals[node.dataset.node];
      node.querySelector('.node-meta').textContent=meta[node.dataset.node];
      node.classList.toggle('is-current',node.dataset.node===currentOwner());
      node.classList.toggle('is-offline',node.dataset.node==='worker'&&!state.workerAvailable);
      node.setAttribute('aria-pressed',String(node.dataset.node===selected));
      node.setAttribute('aria-label',`Inspect ${nodes.find(item=>item.id===node.dataset.node).name}: ${meta[node.dataset.node]}`);
    });
  }
  function snapshots() {
    const job=state.job;
    return {
      client:{method:'POST',path:'/jobs',idempotencyKey:REQUEST_KEY,source:'coastline.mov'},
      api:{requestKey:REQUEST_KEY,jobId:job?.id||null,replays:job?.replays||0},
      queue:{pending:[...state.queue],retention:'in-memory fixture'},
      worker:{available:state.workerAvailable,activeJob:job?.status==='processing'?job.id:null,attempts:job?.attempts||0},
      store:{objects:state.outputs.map(output=>({...output})),stableKey:OUTPUT_KEY},
      status:job?{...job}:{record:null}
    };
  }
  function renderInspector() {
    const node=nodes.find(item=>item.id===selected);
    $('inspector-title').textContent=node.name;
    $('node-index').textContent=`${String(nodes.indexOf(node)+1).padStart(2,'0')} / 06`;
    $('node-description').textContent=node.description;
    $('node-owns').textContent=node.owns;
    $('node-failure').textContent=node.failure;
    $('snapshot-kind').textContent=node.id;
    $('node-snapshot').textContent=JSON.stringify(snapshots()[node.id],null,2);
  }
  function nextAction() {
    if (scenario!=='custom') return scenarios[scenario][cursor]||null;
    if (!state.job) return 'RUN';
    if (!state.workerAvailable||state.job.status==='completed') return null;
    return 'NEXT';
  }
  function drawEdges() {
    const graph=topology.getBoundingClientRect(); const svg=$('connections'); const mobile=window.innerWidth<760;
    svg.setAttribute('viewBox',`0 0 ${graph.width} ${graph.height}`); svg.replaceChildren();
    const edges=[['client','api'],['api','queue'],['queue','worker'],['worker','store'],['api','status'],['worker','status']];
    for(const [from,to] of edges){
      const a=document.querySelector(`[data-node="${from}"]`).getBoundingClientRect(),b=document.querySelector(`[data-node="${to}"]`).getBoundingClientRect();
      const record=to==='status';
      let x1,y1,x2,y2,d;
      const downward=(mobile&&['api','queue'].includes(from)&&!record)||record;
      if(downward){x1=a.left+a.width/2-graph.left;y1=a.bottom-graph.top;x2=b.left+b.width/2-graph.left;y2=b.top-graph.top;const mid=(y1+y2)/2;d=`M${x1} ${y1} C${x1} ${mid},${x2} ${mid},${x2} ${y2}`;}
      else{x1=a.right-graph.left;y1=a.top+a.height/2-graph.top;x2=b.left-graph.left;y2=b.top+b.height/2-graph.top;const mid=(x1+x2)/2;d=`M${x1} ${y1} C${mid} ${y1},${mid} ${y2},${x2} ${y2}`;}
      if(mobile&&record&&from==='api'){x1=a.right-graph.left;y1=a.top+a.height/2-graph.top;x2=b.right-graph.left;y2=b.top+b.height/2-graph.top;d=`M${x1} ${y1} H${graph.width-9} V${y2} H${x2}`;}
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);
      const active=!record&&to===currentOwner()||record&&state.job&&['processing','completed'].includes(state.job.status);
      path.setAttribute('class',`edge ${record?'edge-record':''} ${active?'is-active':''}`);svg.append(path);
    }
  }
  function render() {
    const job=state.job;
    renderNodes(); renderInspector(); drawEdges();
    $('queue-count').textContent=state.queue.length;$('attempt-count').textContent=job?.attempts||0;$('output-count').textContent=state.outputs.length;
    $('job-status').textContent=job?job.status[0].toUpperCase()+job.status.slice(1):'Ready';
    $('job-status').dataset.state=job?.status||'ready';
    const messages={queued:'The queue owns job_001. A worker must accept delivery before output can exist.',waiting:'The interrupted job is retained in the queue. No partial output was committed.',processing:`The worker owns delivery attempt ${job?.attempts}. The output still does not exist.`,completed:'One output is committed. Replaying the request returns this same record.'};
    $('next-hint').textContent=job?messages[job.status]:'Play a complete scenario or step through its state transitions.';
    $('scenario-position').textContent=scenario==='custom'?'Manual exploration':`${cursor} / ${scenarios[scenario].length} transitions`;
    $('run-job').innerHTML=playing?'Pause':nextAction()?'Play scenario <span aria-hidden="true">↗</span>':'Replay scenario <span aria-hidden="true">↗</span>';
    $('next-event').disabled=playing||!nextAction();
    $('scenario').value=scenario;$('scenario').disabled=playing;
    $('worker-toggle').disabled=playing;$('replay-request').disabled=playing||!job;
    $('worker-toggle').textContent=state.workerAvailable?'Take worker offline':'Restore worker';
    $('worker-toggle').setAttribute('aria-pressed',String(!state.workerAvailable));
    $('worker-label').textContent=state.workerAvailable?'Worker online':'Worker unavailable';
    $('worker-dot').classList.toggle('is-offline',!state.workerAvailable);
    $('worker-note').textContent=state.workerAvailable?'Interrupt a delivery to see its ownership return to the queue.':'Restore the worker, then Step to retry the retained delivery.';
    $('event-count').textContent=`${state.events.length} events`;
    $('event-list').innerHTML=state.events.length?state.events.map(event=>`<li data-event="${event.kind}"><span class="event-number">${String(event.sequence).padStart(2,'0')}</span><div><strong>${esc(event.title)}</strong><p>${esc(event.detail)}</p></div><span class="event-owner">${event.node}</span></li>`).join(''):'<li class="empty-trace"><div><strong>The request is ready to send.</strong><p>Choose recovery, replay, or uninterrupted delivery. Each step exposes the same model state shown in the diagram.</p></div></li>';
    $('event-list').scrollTop=$('event-list').scrollHeight;
    $('result').classList.toggle('is-complete',state.outputs.length===1);
    $('result-name').textContent=state.outputs[0]?.name||'No output yet';
    $('result-detail').textContent=state.outputs[0]?.key||'An output exists only after a successful worker commit.';
    $('replay-count').textContent=`${job?.replays||0} replays`;
    $('output-json').textContent=JSON.stringify(state.outputs[0]||{object:null,reason:job?.status==='waiting'?'delivery interrupted before commit':'awaiting successful commit'},null,2);
  }
  function stop(){playing=false;generation+=1;if(timer!==null)clearTimeout(timer);timer=null;}
  function reset(){stop();state=initialState();cursor=0;selected='client';render();}
  function advance(){const action=nextAction();if(!action)return false;state=transition(state,action);if(scenario!=='custom')cursor+=1;selected=state.activeNode;render();return true;}
  function tick(token){if(!playing||token!==generation)return;if(!advance()||!nextAction()){playing=false;render();return;}timer=setTimeout(()=>tick(token),1000);}
  $('run-job').addEventListener('click',()=>{if(playing){stop();render();return;}if(!nextAction()){if(scenario==='custom')scenario='recovery';reset();}playing=true;tick(generation);});
  $('next-event').addEventListener('click',advance);
  $('reset').addEventListener('click',()=>{if(scenario==='custom')scenario='recovery';reset();});
  $('scenario').addEventListener('change',event=>{scenario=event.target.value;reset();});
  function manual(action){stop();scenario='custom';state=transition(state,action);selected=state.activeNode;render();}
  $('worker-toggle').addEventListener('click',()=>manual('TOGGLE_WORKER'));
  $('replay-request').addEventListener('click',()=>manual('REPLAY'));
  new ResizeObserver(drawEdges).observe(topology);
  render();
})();
