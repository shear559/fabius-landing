// Diagnostic evidence only: the project-sentinel fixture and verdict are unchanged.
// Capture-phase selection records distinguish a wrong test selection from a UI rerender.
import playwright from '[user]/node_modules/playwright/index.js';
import {serve} from './grade.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const study = path.resolve(process.argv[2]);
for (const runId of process.argv.slice(3)) {
  const prior = JSON.parse(await fs.readFile(path.join(study, 'graded', runId, 'web', 'exploratory-project-sentinel', 'results.json'), 'utf8'));
  const server = await serve(path.join(study, 'runs', runId, 'artifact'));
  const results = [];
  try {
    for (const engine of ['chromium', 'webkit']) {
      const browser = await playwright[engine].launch({headless: true});
      try {
        for (const width of [360, 1440]) {
          const context = await browser.newContext({viewport: {width, height: 1000}, serviceWorkers: 'block'});
          try {
            await context.addInitScript(board => localStorage.setItem('fieldnote-board:v1', JSON.stringify(board)), prior.fixture);
            const page = await context.newPage();
            await page.goto(server.url);
            await page.evaluate(() => {
              window.__selectionTrace = [];
              const select = document.querySelector('[data-testid=filter-project]');
              for (const type of ['input', 'change']) document.addEventListener(type, event => {
                if (event.target !== select) return;
                window.__selectionTrace.push({type, value: select.value, selectedIndex: select.selectedIndex, label: select.selectedOptions[0]?.label});
              }, true);
            });
            await page.locator('[data-testid=filter-project]').selectOption({label: 'all'});
            await page.waitForTimeout(100);
            results.push({engine, width, observed: await page.evaluate(() => {
              const select = document.querySelector('[data-testid=filter-project]');
              return {events: window.__selectionTrace, after: {value: select.value, selectedIndex: select.selectedIndex, label: select.selectedOptions[0]?.label}, visibleIds: [...document.querySelectorAll('[data-testid=task-card]')].filter(el => el.getClientRects().length && getComputedStyle(el).display !== 'none').map(el => el.dataset.taskId).sort()};
            })});
          } finally { await context.close(); }
        }
      } finally { await browser.close(); }
    }
  } finally { await server.close(); }
  const out = path.join(study, 'graded', runId, 'web', 'exploratory-project-sentinel', 'selection-trace.json');
  await fs.writeFile(out, JSON.stringify({schemaVersion: 1, runId, purpose: 'Refute incorrect selector or option ambiguity; diagnostic capture only, original fixture and primary scores unchanged.', results}, null, 2) + '\n');
  console.log(JSON.stringify({runId, results}));
}
