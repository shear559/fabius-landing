import assert from 'node:assert/strict';
await import('./model.mjs');
const { initialState, transition, invariants, JOB_ID, REQUEST_KEY, OUTPUT_KEY } = globalThis.RelayModel;

const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
};
let checkedTransitions = 0;
function check(state) {
  assert.equal(new Set(state.queue).size, state.queue.length, 'A job cannot occupy the queue twice');
  assert.ok(state.outputs.length <= 1, 'At most one terminal output may exist');
  assert.equal(new Set(state.outputs.map(output => output.key)).size, state.outputs.length);
  assert.equal(state.events.length, state.sequence, 'Trace sequence must describe every recorded event');
  state.events.forEach((event, index) => assert.equal(event.sequence, index + 1));
  if (!state.job) {
    assert.deepEqual(state.queue, []);
    assert.deepEqual(state.outputs, []);
    return;
  }
  for (const item of invariants(state)) assert.equal(item.pass,true,item.label);
  assert.equal(state.commitWrites,state.outputs.length);
  if(state.lease)assert.equal(state.lease.token,state.fence);
  assert.equal(state.job.acked,state.job.status==='completed');
  assert.equal(state.job.id, JOB_ID);
  assert.equal(state.job.requestKey, REQUEST_KEY);
  assert.ok(['queued', 'waiting', 'processing', 'uncertain', 'completed'].includes(state.job.status));
  assert.ok(Number.isInteger(state.job.attempts) && state.job.attempts >= 0);
  assert.ok(Number.isInteger(state.job.replays) && state.job.replays >= 0);
  assert.deepEqual(state.queue, ['queued', 'waiting'].includes(state.job.status) ? [JOB_ID] : []);
  if (state.job.status === 'processing') assert.equal(state.workerAvailable, true);
  if (state.job.status === 'completed') {
    assert.equal(state.outputs.length, 1);
    assert.equal(state.outputs[0].key, OUTPUT_KEY);
    assert.equal(state.outputs[0].jobId, JOB_ID);
    assert.equal(state.job.outputKey, OUTPUT_KEY);
  } else {
    assert.ok(state.outputs.length <= 1, 'A committed object may precede completion acknowledgement');
    assert.equal(state.job.outputKey, null);
  }
}
function step(state, action) {
  const before = JSON.stringify(state);
  const next = transition(freeze(state), action);
  assert.equal(JSON.stringify(state), before, 'Transitions must not mutate their input');
  assert.deepEqual(next, transition(state, action), 'The same state and action must yield the same result');
  check(next);
  checkedTransitions++;
  return next;
}
function scenario(actions) {
  return actions.reduce(step, initialState());
}

const completed = scenario(['RUN', 'NEXT', 'NEXT']);
assert.equal(completed.job.status, 'completed');
assert.equal(completed.job.attempts, 1);
assert.deepEqual(completed.events.map(event => event.kind), ['queued', 'processing', 'completed']);
console.log('PASS happy path: queued → processing → completed; one output');

const deferred = scenario(['TOGGLE_WORKER', 'RUN', 'NEXT']);
assert.equal(deferred.job.status, 'waiting');
assert.equal(deferred.job.attempts, 0);
const deferredAgain = step(deferred, 'NEXT');
assert.deepEqual(deferredAgain, deferred, 'Waiting does not create false progress or repeated delivery events');
const recovered = ['TOGGLE_WORKER', 'NEXT', 'NEXT'].reduce(step, deferred);
assert.equal(recovered.job.status, 'completed');
assert.equal(recovered.job.attempts, 1);
console.log('PASS unavailable before delivery: retained queue, no output, restore and completion');

const interrupted = scenario(['RUN', 'NEXT', 'TOGGLE_WORKER']);
assert.equal(interrupted.job.status, 'waiting');
assert.deepEqual(interrupted.queue, [JOB_ID]);
assert.equal(interrupted.outputs.length, 0);
const retried = ['REPLAY', 'TOGGLE_WORKER', 'NEXT', 'NEXT'].reduce(step, interrupted);
assert.equal(retried.job.status, 'completed');
assert.equal(retried.job.attempts, 2);
assert.equal(retried.outputs.length, 1);
assert.equal(retried.events.filter(event => event.kind === 'retried').length, 1);
console.log('PASS interrupted processing: requeued, replay deduplicated, second delivery commits once');

for (const actions of [['RUN'], ['RUN', 'NEXT'], ['RUN', 'NEXT', 'NEXT']]) {
  const state = scenario(actions);
  const replayed = ['REPLAY', 'RUN', 'REPLAY'].reduce(step, state);
  assert.deepEqual(replayed.queue, state.queue);
  assert.deepEqual(replayed.outputs, state.outputs);
  assert.equal(replayed.job.status, state.job.status);
  assert.equal(replayed.job.attempts, state.job.attempts);
  assert.equal(replayed.job.replays, 3);
}
let terminal = completed;
for (let i = 0; i < 25; i++) terminal = ['NEXT', 'REPLAY', 'TOGGLE_WORKER', 'TOGGLE_WORKER'].reduce(step, terminal);
assert.equal(terminal.outputs.length, 1);
assert.deepEqual(terminal.outputs, completed.outputs);
assert.equal(terminal.job.attempts, 1);
console.log('PASS idempotency: replay during every phase; 25 terminal replays preserve the same output');
assert.deepEqual(step(terminal, 'RESET'), initialState());
assert.throws(() => transition(initialState(), 'UNKNOWN'), /Unknown action/);
console.log('PASS reset and unsupported-action boundary');

const actions = ['RUN', 'NEXT', 'TOGGLE_WORKER', 'REPLAY'];
function explore(state, depth) {
  if (!depth) return;
  for (const action of actions) explore(step(state, action), depth - 1);
}
explore(initialState(), 7);
console.log(`PASS ${checkedTransitions.toLocaleString('en-US')} checked transitions: purity, determinism, identity, queue ownership and output uniqueness`);
console.log('Not verified by this command: browser rendering, host CSP, real infrastructure or real media processing.');

await import('./scenarios.js');
for (const [name, recipe] of Object.entries(globalThis.RelayScenarios)) {
  const result = scenario(recipe);
  assert.equal(result.job.status, 'completed', `${name} must finish`);
  assert.equal(result.outputs.length, 1, `${name} must commit once`);
  assert.equal(result.job.attempts, ['recovery','uncertain','fencing'].includes(name) ? 2 : 1, `${name} has the expected delivery attempts`);
  assert.equal(result.job.replays, name === 'duplicate' ? 3 : name === 'recovery' ? 1 : name === 'uncertain' ? 2 : 0, `${name} has the expected replay count`);
}
console.log('PASS all six shipped browser recipes: expected completion, attempts, replay counts, and unique output');

const ambiguous = scenario(['RUN','NEXT','COMMIT_LOST_ACK']);
assert.equal(ambiguous.job.status,'uncertain');assert.equal(ambiguous.outputs.length,1);assert.equal(ambiguous.job.acked,false);assert.equal(ambiguous.job.outputKey,null);assert.equal(ambiguous.commitWrites,1);
const durable=JSON.stringify(ambiguous.outputs);
const expired=step(ambiguous,'EXPIRE_LEASE');assert.equal(expired.lease,null);assert.equal(expired.queue.length,1);assert.equal(JSON.stringify(expired.outputs),durable);
const beforeNewLease=step(expired,'STALE_COMMIT');assert.equal(beforeNewLease.rejectedWrites,1);assert.equal(JSON.stringify(beforeNewLease.outputs),durable);
const delivered=step(expired,'NEXT');assert.equal(delivered.lease.token,2);assert.equal(delivered.lease.holder,'worker_2');
const fenced=step(delivered,'STALE_COMMIT');assert.equal(fenced.lastWrite.result,'rejected');assert.equal(fenced.job.status,'processing');assert.deepEqual(fenced.lease,delivered.lease);assert.equal(JSON.stringify(fenced.outputs),durable);
const reconciled=step(fenced,'NEXT');assert.equal(reconciled.job.acked,true);assert.equal(reconciled.commitWrites,1);assert.equal(reconciled.reconciliations,1);assert.equal(reconciled.outputs[0].commitFence,1);assert.equal(reconciled.fence,2);assert.equal(reconciled.events.at(-1).kind,'reconciled');
assert.equal(JSON.stringify(reconciled.outputs),durable);
assert.equal(step(reconciled,'STALE_COMMIT').outputs.length,1);
const localRecovery=step(ambiguous,'NEXT');assert.equal(localRecovery.job.acked,true);assert.equal(localRecovery.commitWrites,1);assert.equal(localRecovery.job.attempts,1);
const earlyFence=scenario(['RUN','NEXT','EXPIRE_LEASE','NEXT','STALE_COMMIT']);assert.equal(earlyFence.outputs.length,0);assert.equal(earlyFence.rejectedWrites,1);assert.equal(step(earlyFence,'NEXT').outputs[0].commitFence,2);
const foreign={...delivered,outputs:[{...delivered.outputs[0],sourceVersion:'different-source'}]};const conflict=transition(foreign,'NEXT');assert.equal(conflict.job.acked,false);assert.equal(conflict.lastWrite.result,'identity-conflict');assert.equal(conflict.outputs[0].sourceVersion,'different-source');
for(const action of ['COMMIT_LOST_ACK','EXPIRE_LEASE','STALE_COMMIT'])assert.deepEqual(step(initialState(),action),initialState());
let complexTransitions=0;
function exploreFailures(state,depth){if(!depth)return;for(const action of ['RUN','NEXT','REPLAY','COMMIT_LOST_ACK','EXPIRE_LEASE','STALE_COMMIT']){const next=step(state,action);complexTransitions++;exploreFailures(next,depth-1);}}
exploreFailures(initialState(),6);
console.log(`PASS ambiguous commit, pre/post-redelivery fencing, unchanged durable object, same-lease reconciliation, wrong-source refusal, unsupported phase no-ops; ${complexTransitions.toLocaleString('en-US')} additional fault-sequence transitions.`);
console.log(`TOTAL PASS: ${checkedTransitions.toLocaleString('en-US')} immutable deterministic transitions with identity, queue, fence, unique-write and acknowledgement invariants.`);
