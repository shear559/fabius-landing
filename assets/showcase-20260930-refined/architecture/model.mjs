/* Deterministic delivery model; classic-script compatible with opaque frames. */
(() => {
  const REQUEST_KEY = 'req_media_01', JOB_ID = 'job_001', OUTPUT_KEY = 'previews/job_001.mp4';
  const ACTIONS = ['RUN','NEXT','TOGGLE_WORKER','REPLAY','COMMIT_LOST_ACK','EXPIRE_LEASE','STALE_COMMIT'];
  function initialState() { return { workerAvailable:true, job:null, queue:[], outputs:[], events:[], sequence:0, activeNode:'client', fence:0, lease:null, staleLeases:[], commitWrites:0, rejectedWrites:0, reconciliations:0, lastWrite:null }; }
  function invariants(state) {
    return [
      { id:'identity', label:'One request → one job', pass: !state.job || state.job.requestKey===REQUEST_KEY&&state.job.id===JOB_ID },
      { id:'queue', label:'At most one queue entry', pass:new Set(state.queue).size===state.queue.length&&state.queue.length<=1 },
      { id:'output', label:'One stable committed object', pass:state.outputs.length<=1&&state.commitWrites===state.outputs.length&&state.outputs.every(o=>o.key===OUTPUT_KEY&&o.jobId===JOB_ID) },
      { id:'fence', label:'Only the current lease may write', pass:(!state.lease||state.lease.token===state.fence)&&state.events.filter(e=>e.kind==='commit'||e.kind==='completed'||e.kind==='reconciled').every(e=>e.facts?.writerToken===e.facts?.activeFence) },
      { id:'ack', label:'Acknowledgement follows a durable object', pass:!state.job?.acked||state.job.status==='completed'&&state.outputs.length===1&&state.job.outputKey===OUTPUT_KEY }
    ];
  }
  function transition(state, action) {
    if(action==='RESET')return initialState();
    if(!ACTIONS.includes(action))throw new Error(`Unknown action: ${action}`);
    const next={...state,job:state.job?{...state.job}:null,queue:[...state.queue],outputs:state.outputs.map(o=>({...o})),events:[...state.events],lease:state.lease?{...state.lease}:null,staleLeases:state.staleLeases.map(l=>({...l})),lastWrite:state.lastWrite?{...state.lastWrite}:null};
    const record=(kind,node,title,detail,facts={})=>{next.sequence++;next.activeNode=node;next.events.push({sequence:next.sequence,kind,node,title,detail,facts:{...facts,phase:next.job?.status||'no job',queueEntries:next.queue.length,committedObjects:next.outputs.length}});};
    const replay=()=>{if(!next.job)return;next.job.replays++;record('retried','api','Same request · same job',next.job.acked?'Return the acknowledged output reference; no new work is created.':'Return the existing job. A committed object does not imply its completion acknowledgement arrived.',{requestKey:REQUEST_KEY,jobId:JOB_ID,acknowledged:next.job.acked});};
    const expire=(title)=>{if(!next.job||!['processing','uncertain'].includes(next.job.status)||!next.lease)return;const old={...next.lease};next.staleLeases.push(old);next.lease=null;next.job.status='waiting';if(!next.queue.includes(JOB_ID))next.queue.push(JOB_ID);record('lease_expired','queue',title,`Lease ${old.token} is no longer authority. The job returns to the queue; any committed object remains intact.`,{expiredToken:old.token,expiredHolder:old.holder,durableObjectRetained:next.outputs.length===1});};
    const write=(lease)=>{
      if(!lease||!next.lease||lease.token!==next.fence||lease.token!==next.lease.token||lease.holder!==next.lease.holder||!next.workerAvailable){
        next.rejectedWrites++;next.lastWrite={writer:lease?.holder||'none',token:lease?.token||0,currentFence:next.fence,result:'rejected'};
        record('fenced','store','Late writer rejected',`Token ${lease?.token||0} cannot write under fence ${next.fence}. The stable object and current delivery are unchanged.`,{writerToken:lease?.token||0,activeFence:next.fence,result:'rejected'});return false;
      }
      const existing=next.outputs.find(o=>o.key===OUTPUT_KEY);
      if(existing && (existing.jobId !== JOB_ID || existing.sourceVersion !== 'coastline-v1')) { next.lastWrite={writer:lease.holder,token:lease.token,currentFence:next.fence,result:'identity-conflict'}; record('identity_conflict','store','Existing object identity conflict','The key is occupied by a different job or source version. Completion is refused; no object is overwritten.',{writerToken:lease.token,activeFence:next.fence,result:'identity-conflict'}); return false; }
      if(existing){next.reconciliations++;next.lastWrite={writer:lease.holder,token:lease.token,currentFence:next.fence,result:'existing-object'};return 'existing';}
      next.outputs.push({key:OUTPUT_KEY,jobId:JOB_ID,name:'coastline.preview.mp4',sourceVersion:'coastline-v1',committedBy:lease.holder,commitFence:lease.token});next.commitWrites++;
      next.lastWrite={writer:lease.holder,token:lease.token,currentFence:next.fence,result:'committed'};return 'written';
    };
    if(action==='RUN'){
      if(next.job)replay();else{next.job={id:JOB_ID,requestKey:REQUEST_KEY,source:'coastline.mov',status:'queued',attempts:0,replays:0,outputKey:null,acked:false};next.queue.push(JOB_ID);record('queued','queue','Accepted → one retained job','The API binds a stable request key to job_001. Queue durability is simulated in memory.',{requestKey:REQUEST_KEY});}
    }
    if(action==='REPLAY')replay();
    if(action==='TOGGLE_WORKER'){
      next.workerAvailable=!next.workerAvailable;
      if(!next.workerAvailable){if(next.lease)expire('Worker lost → lease revoked');else record('unavailable','worker','Worker taken offline','No lease is issued while the worker pool is unavailable.');}
      else{if(next.job?.status==='waiting')next.job.status='queued';record('restored','worker','Worker restored','Retained work can acquire a fresh lease on the next delivery.');}
    }
    if(action==='EXPIRE_LEASE')expire('Lease expired → delivery eligible again');
    if(action==='STALE_COMMIT'&&next.staleLeases.length)write(next.staleLeases[next.staleLeases.length-1]);
    if(action==='COMMIT_LOST_ACK'&&next.job?.status==='processing'&&next.lease&&next.workerAvailable){
      const lease={...next.lease},result=write(lease);
      if(result){next.job.status='uncertain';record('commit','store','Object committed · acknowledgement lost','The durable object exists, but job status has no output reference and the queue has no ACK. Retrying must reconcile this object, not create another.',{writerToken:lease.token,activeFence:next.fence,acknowledged:false,writeResult:result});}
    }
    if(action==='NEXT'&&next.job&&!next.job.acked){
      if(!next.workerAvailable){if(next.job.status!=='waiting'){next.job.status='waiting';record('waiting','queue','Delivery deferred','The retained job waits for a worker.');}}
      else if(['queued','waiting'].includes(next.job.status)){
        next.queue=next.queue.filter(id=>id!==JOB_ID);next.job.status='processing';next.job.attempts++;next.fence++;next.lease={holder:`worker_${next.job.attempts}`,token:next.fence};
        record('processing','worker',next.job.attempts>1?'New lease → redelivery':'Lease acquired → processing',`Only ${next.lease.holder} with fencing token ${next.fence} may commit. Earlier attempts cannot overwrite its result.`,{holder:next.lease.holder,token:next.fence});
      }else if(['processing','uncertain'].includes(next.job.status)&&next.lease){
        const lease={...next.lease},result=write(lease);
        if(result){next.job.outputKey=OUTPUT_KEY;next.job.status='completed';next.job.acked=true;next.lease=null;
          record(result==='existing'?'reconciled':'completed','store',result==='existing'?'Existing object reconciled → acknowledged':'Object committed → acknowledged',result==='existing'?'The current lease found the stable object, verified its job/source identity, and published its reference. No second storage write occurred.':'The fenced write created one object; its reference is published and delivery acknowledged.',{writerToken:lease.token,activeFence:next.fence,originalCommitFence:next.outputs[0].commitFence,acknowledged:true,writeResult:result});
        }
      }
    }
    return next;
  }
  globalThis.RelayModel=Object.freeze({initialState,transition,invariants,REQUEST_KEY,JOB_ID,OUTPUT_KEY});
})();
