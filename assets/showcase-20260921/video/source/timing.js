/* Reading-time check for the script. A viewer reads the lines of a scene in order; a line can be read
   once it has mostly arrived, at the budgeted pace, and the scene may only start to leave after a
   short pause. The end card must then hold, complete, before the film ends. */
'use strict';
const words = s => s.split(/\s+/).filter(w => /\w/.test(w)).length;
function timing(T) {
  const R = T.reading;
  return T.scenes.map((sc, i) => {
    const last = i === T.scenes.length - 1;
    let read = 0;
    const lines = sc.lines.map(l => {
      const from = Math.max(read, l.at + R.legibleAfter);
      read = from + words(l.text) / R.wordsPerSecond + R.perLine;
      return { text: l.text, words: words(l.text), at: l.at, readFrom: +from.toFixed(2), readBy: +read.toFixed(2) };
    });
    const leaves = last ? T.duration : sc.end - T.exit;
    const need = last ? R.endHold : R.holdBeforeExit;
    const slack = +(leaves - read - need).toFixed(2);
    const settled = Math.max(...sc.lines.map(l => l.at + T.lineIn));
    return { scene: sc.id, length: +(sc.end - sc.start).toFixed(2), readBy: +read.toFixed(2), leaves: +leaves.toFixed(2),
      hold: +(leaves - read).toFixed(2), holdNeeded: need, settledHold: +(leaves - settled).toFixed(2), slack, pass: slack >= -1e-9, lines };
  });
}
module.exports = { timing, words };
if (require.main === module) {
  const rows = timing(require('./scenes/timeline.js'));
  for (const r of rows) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.scene.padEnd(9)} ${r.length.toFixed(1)} s  read by ${r.readBy.toFixed(2)}, leaves ${r.leaves.toFixed(2)}, hold ${r.hold.toFixed(2)} s (need ${r.holdNeeded})`);
  process.exitCode = rows.every(r => r.pass) ? 0 : 1;
}
