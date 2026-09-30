(() => {
  const { initialState, transition } = globalThis.RelayModel;
  let state = initialState();
  let selectedNode = 'api';
  const $ = id => document.getElementById(id);
  const icons = {
    client: '<rect x="3" y="4" width="22" height="16" rx="2"/><path d="M9 25h10M14 20v5M7 9h4m-4 4h10"/>',
    api: '<path d="m10 6-7 8 7 8m8-16 7 8-7 8M16 4l-4 20"/>',
    queue: '<rect x="4" y="3" width="20" height="6" rx="2"/><rect x="4" y="11" width="20" height="6" rx="2"/><rect x="4" y="19" width="20" height="6" rx="2"/><path d="M8 6h1m-1 8h1m-1 8h1"/>',
    worker: '<rect x="6" y="6" width="16" height="16" rx="3"/><path d="M10 2v4m8-4v4m-8 16v4m8-4v4M2 10h4m-4 8h4m16-8h4m-4 8h4M11 11h6v6h-6z"/>',
    store: '<path d="m3 9 11-6 11 6v13l-11 6-11-6Z"/><path d="m3 9 11 6 11-6M14 15v13M8 6l11 6"/>',
    status: '<rect x="5" y="3" width="18" height="23" rx="2"/><path d="M9 9h10M9 14h10M9 19h6"/>'
  };
  const nodes = [
    { id: 'client', name: 'Client', step: '01', description: 'The request begins here.', owns: 'A stable request key and the source media reference.', failure: 'Send the same key again if the response is lost. The API returns the existing job.' },
    { id: 'api', name: 'API', step: '02', description: 'Accept once. Return the same identity.', owns: 'The request-to-job mapping and a durable queue entry.', failure: 'A repeated request looks up its key before creating work. Replays reuse job_001.' },
    { id: 'queue', name: 'Durable queue', step: '03', description: 'Work waits here until it can move.', owns: 'Pending deliveries, retained through worker outages.', failure: 'An interrupted delivery returns to the queue. Restore the worker to deliver it again.' },
    { id: 'worker', name: 'Worker', step: '04', description: 'Turn source media into a preview.', owns: 'One delivery attempt, then a commit to a stable output key.', failure: 'If it stops before committing, no output is created and the job becomes available again.' },
    { id: 'store', name: 'Object store', step: '05', description: 'One job has one output address.', owns: 'The committed preview under previews/job_001.mp4.', failure: 'The model reuses the stable key and checks for an existing object. Store failures are outside this simulation.' },
    { id: 'status', name: 'Status record', step: '06', description: 'The readable account of this job.', owns: 'Queued, waiting, processing or completed state, plus the output reference.', failure: 'This model updates the status and output together. Partial commit failures are outside its scope.' }
  ];

  function drawTopology(mode) {
    const vertical = mode === 'stacked';
    const positions = vertical
      ? { client: [22, 18, 150, 76], api: [22, 125, 150, 76], queue: [22, 232, 150, 76], worker: [22, 339, 150, 76], store: [22, 446, 150, 76], status: [211, 254, 104, 128] }
      : { client: [22, 72, 130, 106], api: [197, 72, 130, 106], queue: [372, 72, 130, 106], worker: [547, 72, 130, 106], store: [722, 72, 130, 106], status: [342, 231, 190, 60] };
    const edges = vertical
      ? [['client-api', 'M97 94V120'], ['api-queue', 'M97 201V227'], ['queue-worker', 'M97 308V334'], ['worker-store', 'M97 415V441'], ['api-status', 'M172 163H263V249'], ['worker-status', 'M172 377H206']]
      : [['client-api', 'M152 125H192'], ['api-queue', 'M327 125H367'], ['queue-worker', 'M502 125H542'], ['worker-store', 'M677 125H717'], ['api-status', 'M262 178V261H337'], ['worker-status', 'M612 178V261H537']];
    const nodeMarkup = nodes.map(node => {
      const [x, y, width, height] = positions[node.id];
      const compact = node.id === 'status';
      let content;
      if (compact && !vertical) {
        content = `<g class="node-icon" transform="translate(14 17) scale(.8)">${icons[node.id]}</g><text x="49" y="26" class="node-name">Status record</text><text x="49" y="44" class="node-meta" data-node-meta="status">No record</text>`;
      } else if (compact) {
        content = `<g class="node-icon" transform="translate(15 14) scale(.7)">${icons[node.id]}</g><text x="14" y="56" class="node-name">Status</text><text x="14" y="74" class="node-name">record</text><text x="14" y="103" class="node-meta" data-node-meta="status">No record</text>`;
      } else if (vertical) {
        content = `<g class="node-icon" transform="translate(14 25) scale(.75)">${icons[node.id]}</g><text x="46" y="31" class="node-name">${node.name}</text><text x="46" y="51" class="node-meta" data-node-meta="${node.id}"></text><text x="135" y="15" text-anchor="end" class="node-step">${node.step}</text>`;
      } else {
        content = `<g class="node-icon" transform="translate(15 15) scale(.8)">${icons[node.id]}</g><text x="115" y="24" text-anchor="end" class="node-step">${node.step}</text><text x="15" y="66" class="node-name">${node.name}</text><text x="15" y="85" class="node-meta" data-node-meta="${node.id}"></text>`;
      }
      return `<g class="diagram-node" data-node="${node.id}" role="button" tabindex="0" aria-label="Inspect ${node.name}" aria-pressed="false" transform="translate(${x} ${y})"><rect class="node-box" width="${width}" height="${height}" rx="10"/>${content}</g>`;
    }).join('');
    return `<svg class="topology--${mode}" viewBox="0 0 ${vertical ? '338 542' : '875 322'}" role="group" aria-label="${vertical ? 'Vertical' : 'Horizontal'} media processing topology"><defs><marker id="arrow-${mode}" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="m1 1 5 3-5 3" fill="none" stroke="var(--navy-line)" stroke-width="1.3"/></marker></defs>${edges.map(([id, d]) => `<path class="edge ${id.includes('status') ? 'edge-record' : ''}" data-edge="${id}" d="${d}" marker-end="url(#arrow-${mode})"/>`).join('')}${nodeMarkup}</svg>`;
  }
  $('topology').innerHTML = drawTopology('wide') + drawTopology('stacked');

  function selectNode(id) {
    selectedNode = id;
    const node = nodes.find(item => item.id === id);
    $('inspector-title').textContent = node.name;
    $('node-index').textContent = `${node.step} / 06`;
    $('inspector-icon').innerHTML = `<svg viewBox="0 0 28 30" aria-hidden="true">${icons[id]}</svg>`;
    $('node-description').textContent = node.description;
    $('node-owns').textContent = node.owns;
    $('node-failure').textContent = node.failure;
    document.querySelectorAll('[data-node]').forEach(element => {
      const selected = element.dataset.node === selectedNode;
      element.classList.toggle('is-selected', selected);
      element.setAttribute('aria-pressed', String(selected));
    });
  }

  function render() {
    const job = state.job;
    $('queue-count').textContent = state.queue.length;
    $('attempt-count').textContent = job?.attempts || 0;
    $('output-count').textContent = state.outputs.length;
    $('run-job').disabled = Boolean(job);
    $('next-event').disabled = !job || job.status === 'completed' || (job.status === 'waiting' && !state.workerAvailable);
    $('replay-request').disabled = !job;
    $('worker-label').textContent = state.workerAvailable ? 'Worker online' : 'Worker unavailable';
    $('worker-dot').classList.toggle('is-offline', !state.workerAvailable);
    $('worker-toggle').textContent = state.workerAvailable ? 'Take worker offline' : 'Restore worker';
    $('worker-toggle').setAttribute('aria-pressed', String(!state.workerAvailable));
    $('worker-note').textContent = state.workerAvailable ? 'Interrupt it at any point in the job.' : 'Queued work is retained until it returns.';
    $('job-status').textContent = job ? job.status[0].toUpperCase() + job.status.slice(1) : 'Ready';
    $('job-status').dataset.state = job?.status || 'ready';
    const hints = {
      queued: state.workerAvailable ? 'Next event: deliver the queued job to the worker.' : 'Next event: attempt delivery while the worker is unavailable.',
      waiting: 'The job is safe in the queue. Restore the worker to continue.',
      processing: 'Next event: commit the preview and mark the job completed.',
      completed: 'Completed with one output. Replay the request to inspect idempotency.'
    };
    $('next-hint').textContent = job ? hints[job.status] : 'Run the synthetic job to start the trace.';
    $('result-name').textContent = state.outputs[0]?.name || 'Awaiting completion';
    $('result-detail').textContent = state.outputs.length ? `${state.outputs[0].key} · Synthetic record, no media file is generated.` : 'The output appears only when the worker commits it.';
    $('result').classList.toggle('is-complete', state.outputs.length === 1);
    $('replay-count').textContent = `${job?.replays || 0} ${(job?.replays || 0) === 1 ? 'replay' : 'replays'}`;
    const meta = {
      client: job ? 'Request submitted' : 'Ready to submit',
      api: job ? 'Identity retained' : 'POST /jobs',
      queue: `${state.queue.length} waiting`,
      worker: state.workerAvailable ? job?.status === 'processing' ? 'Processing' : 'Available' : 'Unavailable',
      store: `${state.outputs.length} ${state.outputs.length === 1 ? 'object' : 'objects'}`,
      status: job ? job.status[0].toUpperCase() + job.status.slice(1) : 'No record'
    };
    document.querySelectorAll('[data-node-meta]').forEach(element => { element.textContent = meta[element.dataset.nodeMeta]; });
    document.querySelectorAll('[data-node]').forEach(element => {
      element.classList.toggle('is-current', element.dataset.node === state.activeNode);
      element.classList.toggle('is-offline', element.dataset.node === 'worker' && !state.workerAvailable);
    });
    const highlighted = job?.status === 'completed' ? ['worker-store', 'worker-status'] : job?.status === 'processing' ? ['queue-worker', 'worker-status'] : job ? ['api-queue', 'api-status'] : [];
    document.querySelectorAll('[data-edge]').forEach(element => element.classList.toggle('is-active', highlighted.includes(element.dataset.edge)));
    if (state.events.length) {
      $('event-list').replaceChildren(...state.events.map(event => {
        const item = document.createElement('li');
        item.dataset.event = event.kind;
        const number = document.createElement('span');
        number.className = 'event-number';
        number.textContent = String(event.sequence).padStart(2, '0');
        const content = document.createElement('div');
        const title = document.createElement('strong');
        const description = document.createElement('p');
        title.textContent = event.title;
        description.textContent = event.detail;
        content.append(title, description);
        item.append(number, content);
        return item;
      }));
    } else $('event-list').innerHTML = '<li class="empty-trace"><span class="empty-mark" aria-hidden="true">↳</span><div><strong>No events yet.</strong><p>Every state transition appears here, in order.</p></div></li>';
  }

  function act(action) { state = transition(state, action); render(); }
  $('run-job').addEventListener('click', () => act('RUN'));
  $('next-event').addEventListener('click', () => act('NEXT'));
  $('reset').addEventListener('click', () => { act('RESET'); selectNode('api'); });
  $('worker-toggle').addEventListener('click', () => act('TOGGLE_WORKER'));
  $('replay-request').addEventListener('click', () => act('REPLAY'));
  $('topology').addEventListener('click', event => {
    const node = event.target.closest('[data-node]');
    if (node) selectNode(node.dataset.node);
  });
  $('topology').addEventListener('keydown', event => {
    const node = event.target.closest('[data-node]');
    if (node && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      selectNode(node.dataset.node);
    }
  });
  selectNode(selectedNode);
  render();
})();
