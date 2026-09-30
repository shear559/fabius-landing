import assert from 'node:assert/strict';
await import('./model.mjs');
const { initialState, transition, JOB_ID, REQUEST_KEY, OUTPUT_KEY } = globalThis.RelayModel;

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
  assert.equal(state.job.id, JOB_ID);
  assert.equal(state.job.requestKey, REQUEST_KEY);
  assert.ok(['queued', 'waiting', 'processing', 'completed'].includes(state.job.status));
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
    assert.equal(state.outputs.length, 0, 'No output before successful completion');
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
  assert.equal(result.job.attempts, name === 'recovery' ? 2 : 1, `${name} has the expected delivery attempts`);
  assert.equal(result.job.replays, name === 'duplicate' ? 3 : name === 'recovery' ? 1 : 0, `${name} has the expected replay count`);
}
console.log('PASS all four shipped browser recipes: expected completion, attempts, replay counts, and unique output');
