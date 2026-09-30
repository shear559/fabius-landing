import { writeFile } from 'node:fs/promises';
await import('./product-source.mjs');
await import('./quality.mjs');
await import('./model.mjs');
const M = globalThis.CohortModel;
let state = M.createState();
while (!M.isComplete(state)) {
  state = M.startRound(state);
  for (const task of M.running(state)) state = M.settleTask(state, task.id);
}
for (const task of M.TASKS) {
  await writeFile(new URL(task.file, import.meta.url), state.artifacts[task.id].content + '\n');
}
await writeFile(new URL('product-brief.md', import.meta.url), '# Luma product brief\n\n' + M.BRIEF + '\n');
await writeFile(new URL('luma-handoff.md', import.meta.url), M.packet(state).content + '\n');
console.log('Wrote seven accepted artifacts, the source brief, and the complete handoff. Open product.html for the standalone product.');
