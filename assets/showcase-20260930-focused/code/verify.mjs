import assert from 'node:assert/strict';
import './model.mjs';
const { buildPlan, validateTasks, runChecks, PRESETS } = globalThis.ClearCode;

for (const result of runChecks()) assert.equal(result.pass, true, result.label);
assert.equal(runChecks().length, 15);
const initial = buildPlan(PRESETS.mixed);
assert.deepEqual(initial.groups.map(g => [g.project, g.minutes, g.tasks.map(t => t.id)]), [
  ['Fieldnotes', 85, ['t4', 't6', 't7']], ['Atlas', 75, ['t1', 't2']]
]);
assert.deepEqual(initial.trace.map(t => t.reason), ['selected', 'selected', 'completed', 'selected', 'duplicate', 'over limit', 'selected', 'selected']);
assert.deepEqual(validateTasks([{ id: ' a ', title: ' A ', project: ' P ', minutes: 1, done: false, extra: 'ignored' }]), [{ id: 'a', title: 'A', project: 'P', minutes: 1, done: false }]);

// A separate, deliberately direct oracle enumerates expected first occurrences.
let comparisons = 0;
for (const firstMinutes of [0, 1, 59, 60, 61, 480]) {
  for (const firstDone of [false, true]) {
    for (const secondMinutes of [0, 60, 61, 480]) {
      for (const duplicate of [false, true]) {
        for (const maxMinutes of [0, 1, 60, 480]) {
          for (const includeDone of [false, true]) {
            const input = [
              { id: ' a ', title: 'First', project: '__proto__', minutes: firstMinutes, done: firstDone },
              { id: duplicate ? 'a' : 'b', title: 'Second', project: '__proto__', minutes: secondMinutes, done: false },
              { id: 'c', title: 'Third', project: 'Other', minutes: 10, done: true }
            ];
            const expected = [];
            if ((includeDone || !firstDone) && firstMinutes <= maxMinutes) expected.push(['a', firstMinutes]);
            if (!duplicate && secondMinutes <= maxMinutes) expected.push(['b', secondMinutes]);
            if (includeDone && maxMinutes >= 10) expected.push(['c', 10]);
            const before = JSON.stringify(input);
            const result = buildPlan(input, maxMinutes, includeDone);
            assert.equal(JSON.stringify(input), before, 'input mutation');
            assert.deepEqual(result.trace.filter(t => t.reason === 'selected').map(t => [t.id, t.minutes]), expected);
            assert.equal(result.groups.reduce((sum, group) => sum + group.minutes, 0), expected.reduce((sum, [, minutes]) => sum + minutes, 0));
            assert.equal(result.groups.flatMap(g => g.tasks).length, expected.length);
            assert.equal(result.trace.length, input.length);
            comparisons++;
          }
        }
      }
    }
  }
}
const maxInput = Array.from({ length: 50 }, (_, i) => ({ id: String(i), title: 'Task', project: 'Same', minutes: 480, done: false }));
assert.equal(buildPlan(maxInput, 480).groups[0].minutes, 24000);
assert.equal(buildPlan([{ id: 'A', title: 'First', project: 'Case', minutes: 1, done: false }, { id: 'a', title: 'Second', project: 'case', minutes: 1, done: false }]).groups.length, 2);
for (const key of ['id', 'title', 'project']) assert.throws(() => buildPlan([{ ...maxInput[0], [key]: 'a'.repeat(61) }]), /1–60/);
console.log(JSON.stringify({ verdict: 'pass', browserFixtureChecks: 15, independentOracleCases: comparisons, maxTotalMinutes: 24000 }));
