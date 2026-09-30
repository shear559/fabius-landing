/* Classic script as well as importable Node module: works in opaque previews. */
(() => {
  'use strict';

  function validateTasks(input) {
    if (!Array.isArray(input) || input.length > 50) {
      throw new Error('Use a JSON array with at most 50 tasks.');
    }
    return input.map((task, index) => {
      const fail = message => { throw new Error(`Row ${index + 1}: ${message}`); };
      if (!task || typeof task !== 'object' || Array.isArray(task)) fail('expected a task object.');
      for (const key of ['id', 'title', 'project']) {
        if (typeof task[key] !== 'string' || !task[key].trim() || task[key].trim().length > 60) {
          fail(`${key} must be text, 1–60 characters after trimming.`);
        }
      }
      if (!Number.isInteger(task.minutes) || task.minutes < 0 || task.minutes > 480) {
        fail('minutes must be a whole number from 0 to 480.');
      }
      if (typeof task.done !== 'boolean') fail('done must be true or false.');
      return {
        id: task.id.trim(), title: task.title.trim(), project: task.project.trim(),
        minutes: task.minutes, done: task.done
      };
    });
  }

  function buildPlan(input, maxMinutes = 60, includeDone = false) {
    const tasks = validateTasks(input);
    if (!Number.isInteger(maxMinutes) || maxMinutes < 0 || maxMinutes > 480) {
      throw new Error('The effort limit must be a whole number from 0 to 480.');
    }
    if (typeof includeDone !== 'boolean') throw new Error('includeDone must be true or false.');
    const seen = new Set();
    const trace = tasks.map((task, index) => {
      const duplicate = seen.has(task.id);
      seen.add(task.id);
      const reason = duplicate ? 'duplicate'
        : task.done && !includeDone ? 'completed'
        : task.minutes > maxMinutes ? 'over limit' : 'selected';
      return { ...task, row: index + 1, reason };
    });
    const groups = new Map();
    for (const task of trace.filter(task => task.reason === 'selected')) {
      const group = groups.get(task.project) ?? { project: task.project, minutes: 0, tasks: [] };
      group.minutes += task.minutes;
      group.tasks.push(task);
      groups.set(task.project, group);
    }
    return { groups: [...groups.values()].sort((a, b) => b.minutes - a.minutes), trace };
  }

  const task = (id, title, project, minutes, done = false) => ({ id, title, project, minutes, done });
  const PRESETS = {
    mixed: [
      task('t1', 'Sketch the reading view', 'Atlas', 45),
      task(' t2 ', ' Write keyboard shortcuts ', ' Atlas ', 30),
      task('t3', 'Test the empty state', 'Atlas', 20, true),
      task('t4', 'Map the chapter outline', 'Fieldnotes', 60),
      task('t2', 'Duplicate imported task', 'Atlas', 30),
      task('t5', 'Prototype the search', 'Atlas', 120),
      task('t6', 'Review source citations', 'Fieldnotes', 25),
      task('t7', 'Mark the milestone', 'Fieldnotes', 0)
    ],
    boundary: [
      task('a', 'Exactly at the limit', 'Boundary', 60),
      task('b', 'One minute over', 'Boundary', 61),
      task('c', 'Zero-minute milestone', 'Boundary', 0),
      task('d', 'Already finished', 'Boundary', 15, true),
      task('a', 'Same ID, later row', 'Boundary', 5)
    ],
    invalid: [task('a', 'Valid task', 'Atlas', 20), task('b', 'Invalid estimate', 'Atlas', -5)],
    empty: []
  };

  function runChecks() {
    const results = [];
    const check = (label, test) => {
      try { results.push({ label, pass: test() === true }); }
      catch (error) { results.push({ label, pass: false, error: error.message }); }
    };
    const rejects = fn => { try { fn(); return false; } catch { return true; } };
    check('Empty input produces an empty plan', () => buildPlan([]).groups.length === 0);
    check('Whitespace is trimmed before grouping', () => {
      const result = buildPlan([task(' a ', ' One ', ' Atlas ', 10), task('b', 'Two', 'Atlas', 20)]);
      return result.groups.length === 1 && result.groups[0].minutes === 30 && result.trace[0].id === 'a';
    });
    check('First occurrence wins, including excluded rows', () => {
      const result = buildPlan([task('a', 'First', 'Atlas', 10, true), task(' a ', 'Second', 'Atlas', 10)]);
      return result.groups.length === 0 && result.trace[1].reason === 'duplicate';
    });
    check('A task exactly at the limit is included', () => buildPlan(PRESETS.boundary).trace[0].reason === 'selected');
    check('A task one minute over is excluded', () => buildPlan(PRESETS.boundary).trace[1].reason === 'over limit');
    check('Zero is a valid estimate', () => buildPlan(PRESETS.boundary, 0).groups[0].tasks[0].minutes === 0);
    check('Completed tasks require explicit inclusion', () => buildPlan(PRESETS.boundary, 60, true).trace[3].reason === 'selected');
    check('Negative, fractional and non-finite minutes fail', () => [-1, 0.5, NaN, Infinity, '20', 481].every(minutes => rejects(() => buildPlan([task('a', 'One', 'Atlas', minutes)]))));
    check('Invalid completed rows cannot bypass validation', () => rejects(() => buildPlan([task('a', 'One', 'Atlas', -1, true)])));
    check('Missing fields and wrong types fail clearly', () => [null, {}, [], task('', 'One', 'Atlas', 10), { ...task('a', 'One', 'Atlas', 10), done: 'false' }].every(row => rejects(() => buildPlan([row]))));
    check('Invalid options are rejected', () => [-1, 481, 1.5, '60', NaN].every(limit => rejects(() => buildPlan([], limit))) && rejects(() => buildPlan([], 60, 'yes')));
    check('Group names cannot modify object prototypes', () => buildPlan([task('a', 'One', '__proto__', 10)]).groups[0].project === '__proto__');
    check('Input objects are never modified', () => {
      const input = [Object.freeze(task(' a ', ' One ', ' Atlas ', 10))];
      Object.freeze(input);
      return buildPlan(input).trace[0].title === 'One' && input[0].id === ' a ';
    });
    check('All selected minutes appear in group totals', () => {
      const result = buildPlan(PRESETS.mixed);
      return result.groups.reduce((n, g) => n + g.minutes, 0) === 160
        && result.trace.filter(t => t.reason === 'selected').length === 5;
    });
    check('More than 50 tasks and non-arrays fail', () => rejects(() => buildPlan(Array(51).fill(task('a', 'One', 'Atlas', 1)))) && rejects(() => buildPlan({})));
    return results;
  }

  globalThis.ClearCode = Object.freeze({ buildPlan, validateTasks, runChecks, PRESETS });
})();
