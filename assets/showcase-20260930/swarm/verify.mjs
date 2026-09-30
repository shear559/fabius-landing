import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import './model.mjs';

const M = globalThis.CohortModel;
let checks = 0;
function check(name, fn) {
  fn();
  checks += 1;
  console.log(`PASS ${name}`);
}

function settleAll(state, model = M, reversed = false) {
  const tasks = model.running(state);
  if (reversed) tasks.reverse();
  for (const task of tasks) state = model.settleTask(state, task.id);
  return state;
}

function completePlanner(state = M.createState(), model = M) {
  return model.settleTask(model.startRound(state), 'planner');
}

function assertCap(model) {
  for (const concurrency of [1, 2, 3]) {
    let state = model.createState(concurrency);
    let rounds = 0;
    while (!model.isComplete(state)) {
      state = model.startRound(state);
      assert.ok(model.running(state).length <= concurrency, 'Running tasks exceed the concurrency cap');
      state = settleAll(state, model);
      rounds += 1;
      assert.ok(rounds <= 4, 'The fixed graph did not finish within four rounds');
    }
    assert.equal(rounds, concurrency === 1 ? 4 : 3);
  }
}

check('Only Planner starts ready; no artifact exists before execution', () => {
  const state = M.createState();
  assert.deepEqual(M.ready(state).map(task => task.id), ['planner']);
  assert.deepEqual(Object.values(state.tasks).map(task => task.status), ['ready', 'blocked', 'blocked', 'blocked']);
  assert.equal(Object.keys(state.artifacts).length, 0);
  assert.equal(M.packet(state), null);
});

check('Planner completion makes both specialists eligible in one parallel round', () => {
  const state = completePlanner();
  assert.deepEqual(M.ready(state).map(task => task.id), ['designer', 'engineer']);
  const next = M.startRound(state);
  assert.deepEqual(M.running(next).map(task => task.id), ['designer', 'engineer']);
  assert.equal(next.tasks.designer.lane, 1);
  assert.equal(next.tasks.engineer.lane, 2);
  assert.equal(next.tasks.reviewer.status, 'blocked');
});

check('Review waits for both dependencies under either settlement order', () => {
  for (const order of [['designer', 'engineer'], ['engineer', 'designer']]) {
    let state = M.startRound(completePlanner());
    state = M.settleTask(state, order[0]);
    assert.equal(state.tasks.reviewer.status, 'blocked');
    assert.throws(() => M.startRound(state), /already running/);
    state = M.settleTask(state, order[1]);
    assert.equal(state.tasks.reviewer.status, 'ready');
    assert.deepEqual(M.running(M.startRound(state)).map(task => task.id), ['reviewer']);
  }
});

check('Concurrency 1 / 2 / 3 is enforced for every dispatch', () => assertCap(M));

check('Third lane stays unused when only two tasks are eligible', () => {
  const state = M.startRound(completePlanner(M.createState(3)));
  assert.equal(M.running(state).length, 2);
  assert.ok(M.running(state).every(task => state.tasks[task.id].lane <= 2));
});

check('Injected failure blocks review and produces no Engineer artifact', () => {
  let state = M.setFailure(M.createState(), true);
  state = completePlanner(state);
  state = settleAll(M.startRound(state));
  assert.equal(state.tasks.engineer.status, 'failed');
  assert.equal(state.tasks.reviewer.status, 'blocked');
  assert.equal(state.tasks.designer.status, 'completed');
  assert.equal(state.artifacts.engineer, undefined);
  assert.equal(Object.keys(state.artifacts).length, 2);
  assert.equal(state.failureArmed, false);
  assert.equal(M.packet(state), null);
  assert.throws(() => M.startRound(state), /Retry the failed task/);
});

check('Retry runs only the failed task and never duplicates successful work', () => {
  for (const concurrency of [1, 2, 3]) {
    let state = M.setFailure(M.createState(concurrency), true);
    while (state.tasks.engineer.status !== 'failed') state = settleAll(M.startRound(state));
    const oldArtifacts = { ...state.artifacts };
    const retry = M.retryTask(state, 'engineer');
    assert.deepEqual(M.running(retry).map(task => task.id), ['engineer']);
    assert.equal(retry.tasks.planner.attempts, 1);
    assert.equal(retry.tasks.designer.attempts, 1);
    state = M.settleTask(retry, 'engineer');
    assert.equal(state.tasks.engineer.attempts, 2);
    assert.equal(state.tasks.engineer.completions, 1);
    assert.equal(state.tasks.reviewer.status, 'ready');
    for (const id of Object.keys(oldArtifacts)) assert.equal(state.artifacts[id], oldArtifacts[id]);
    state = settleAll(M.startRound(state));
    assert.equal(M.isComplete(state), true);
    assert.ok(M.TASKS.every(task => state.tasks[task.id].completions === 1));
    assert.deepEqual(state.events.filter(event => event.kind === 'complete' && event.taskId).map(event => event.taskId), ['planner', 'designer', 'engineer', 'reviewer']);
  }
});

check('The complete packet contains every produced fixture exactly once', () => {
  let state = M.createState();
  while (!M.isComplete(state)) state = settleAll(M.startRound(state));
  const packet = M.packet(state);
  assert.equal(packet.file, 'luma-handoff.md');
  for (const task of M.TASKS) {
    assert.equal(packet.content.split(state.artifacts[task.id].content).length - 1, 1);
  }
  assert.throws(() => M.startRound(state), /All tasks are complete/);
});

check('Invalid capacity, duplicate completion, and successful-task retry are rejected', () => {
  for (const value of [0, 4, -1, '2', NaN, null]) assert.throws(() => M.createState(value), /Concurrency/);
  const state = completePlanner();
  assert.throws(() => M.settleTask(state, 'planner'), /not running/);
  assert.throws(() => M.retryTask(state, 'planner'), /Only a failed task/);
  assert.throws(() => M.settleTask(state, 'missing'), /Unknown task/);
  const running = M.startRound(state);
  assert.throws(() => M.setConcurrency(running, 1), /finish/);
  assert.throws(() => M.retryTask(running, 'engineer'), /finish/);
  assert.throws(() => M.setFailure(running, true), /Reset/);
});

check('Failure can be canceled before dispatch and state transitions leave input untouched', () => {
  const initial = M.createState();
  const before = JSON.stringify(initial);
  let state = M.setFailure(initial, true);
  state = M.setFailure(state, false);
  state = M.setConcurrency(state, 3);
  state = completePlanner(state);
  state = settleAll(M.startRound(state));
  assert.equal(state.tasks.engineer.status, 'completed');
  assert.equal(JSON.stringify(initial), before);
  assert.equal(M.running(initial).length, 0);
  assert.equal(initial.events.length, 1);
});

check('Fresh state fully clears a previous failed run', () => {
  let oldState = M.setFailure(M.createState(), true);
  oldState = settleAll(M.startRound(completePlanner(oldState)));
  assert.equal(oldState.tasks.engineer.status, 'failed');
  const reset = M.createState(3);
  assert.equal(reset.concurrency, 3);
  assert.equal(reset.round, 0);
  assert.equal(reset.failureArmed, false);
  assert.equal(reset.events.length, 1);
  assert.equal(Object.keys(reset.artifacts).length, 0);
  assert.ok(Object.values(reset.tasks).every(task => task.attempts === 0 && task.completions === 0));
});

const source = await readFile(new URL('./model.mjs', import.meta.url), 'utf8');
check('Mutation control: removing the concurrency cap fails the cap oracle', () => {
  assert.ok(source.includes('ready(state).slice(0, state.concurrency)'));
  const sandbox = {};
  vm.runInNewContext(source.replace('ready(state).slice(0, state.concurrency)', 'ready(state)'), sandbox);
  assert.throws(() => assertCap(sandbox.CohortModel), /Running tasks exceed/);
});

console.log(`\n${checks} scheduler checks passed. Browser layout, DOM interaction, CSP, and timer cancellation need separate browser verification.`);
