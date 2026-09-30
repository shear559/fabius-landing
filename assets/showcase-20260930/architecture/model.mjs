/* Shared, deterministic state machine. Classic-script compatible for opaque frames. */
(() => {
  const REQUEST_KEY = 'req_media_01';
  const JOB_ID = 'job_001';
  const OUTPUT_KEY = 'previews/job_001.mp4';

  function initialState() {
    return { workerAvailable: true, job: null, queue: [], outputs: [], events: [], sequence: 0, activeNode: 'client' };
  }

  function transition(state, action) {
    if (action === 'RESET') return initialState();
    if (!['RUN', 'NEXT', 'TOGGLE_WORKER', 'REPLAY'].includes(action)) throw new Error(`Unknown action: ${action}`);
    const next = {
      ...state,
      job: state.job ? { ...state.job } : null,
      queue: [...state.queue],
      outputs: state.outputs.map(output => ({ ...output })),
      events: [...state.events]
    };
    const record = (kind, node, title, detail) => {
      next.sequence += 1;
      next.activeNode = node;
      next.events.push({ sequence: next.sequence, kind, node, title, detail });
    };
    const replay = () => {
      if (!next.job) return;
      next.job.replays += 1;
      const completed = next.job.status === 'completed';
      record('retried', 'api', 'Request replayed · same identity', completed
        ? 'The API returns the existing output reference. No new job or object is created.'
        : `The API returns job_001 in its ${next.job.status} state. No second queue entry is created.`);
    };

    if (action === 'RUN') {
      if (next.job) replay();
      else {
        next.job = { id: JOB_ID, requestKey: REQUEST_KEY, source: 'coastline.mov', status: 'queued', attempts: 0, replays: 0, outputKey: null };
        next.queue.push(JOB_ID);
        record('queued', 'queue', 'Accepted → durably queued', 'The API binds req_media_01 to job_001. The queue retains the job until it can be delivered.');
      }
    }
    if (action === 'REPLAY') replay();
    if (action === 'TOGGLE_WORKER') {
      next.workerAvailable = !next.workerAvailable;
      if (!next.workerAvailable) {
        if (next.job?.status === 'processing') {
          next.job.status = 'waiting';
          if (!next.queue.includes(JOB_ID)) next.queue.unshift(JOB_ID);
          record('waiting', 'queue', 'Worker lost → job returned to queue', 'The unfinished delivery is available again. No output was committed.');
        } else record('unavailable', 'worker', 'Worker taken offline', 'Queued work stays in the queue. A new delivery must wait for the worker.');
      } else {
        if (next.job?.status === 'waiting') next.job.status = 'queued';
        record('restored', 'worker', 'Worker restored', next.queue.length ? 'The retained job is ready for delivery. Advance the next event to resume.' : 'The worker can accept the next queued job.');
      }
    }
    if (action === 'NEXT' && next.job && next.job.status !== 'completed') {
      if (!next.workerAvailable) {
        if (next.job.status !== 'waiting') {
          next.job.status = 'waiting';
          record('waiting', 'queue', 'Delivery deferred · worker unavailable', 'The queue keeps job_001. Restore the worker, then advance to retry delivery.');
        }
      } else if (next.job.status === 'queued' || next.job.status === 'waiting') {
        next.queue = next.queue.filter(id => id !== JOB_ID);
        next.job.status = 'processing';
        next.job.attempts += 1;
        record('processing', 'worker', next.job.attempts > 1 ? 'Retried delivery → processing' : 'Job delivered → processing', `Delivery attempt ${next.job.attempts}. The status record now says processing; the output has not been committed.`);
      } else if (next.job.status === 'processing') {
        if (!next.outputs.some(output => output.key === OUTPUT_KEY)) {
          next.outputs.push({ key: OUTPUT_KEY, jobId: JOB_ID, name: 'coastline.preview.mp4' });
        }
        next.job.outputKey = OUTPUT_KEY;
        next.job.status = 'completed';
        record('completed', 'store', 'Output committed → job completed', 'One object is stored at the stable output key. The status record points to it, and the delivery is acknowledged.');
      }
    }
    return next;
  }

  const api = Object.freeze({ initialState, transition, REQUEST_KEY, JOB_ID, OUTPUT_KEY });
  globalThis.RelayModel = api;
})();
