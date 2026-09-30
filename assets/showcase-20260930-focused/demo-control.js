/* Gallery walkthrough controls only. Product source downloads do not include this bridge. */
(() => {
  'use strict';
  let parentOrigin;
  try { parentOrigin = new URL(document.referrer).origin; } catch { return; }
  const tours = {"math":[{"caption":"Change one incentive. Every graph follows the same exact solution.","reveal":"#explorer","actions":[["input","#parameter","-1.75"]]},{"caption":"Inside the polygon, the optimum moves freely. No inequality is binding.","reveal":"#geometry","actions":[["select","#regime-select","1"]]},{"caption":"At this corner, the optimum holds while the objective value changes.","reveal":"#geometry","actions":[["select","#regime-select","3"]]},{"caption":"Along the slanted edge, x and y rise. Zero slack identifies the limit.","reveal":".linked-views","actions":[["select","#regime-select","4"]]},{"caption":"The x cap ends movement. Two boundaries now bind.","reveal":"#geometry","actions":[["select","#regime-select","5"]]},{"caption":"Inspect the certificate, exact proof and executable checks behind this worked example.","reveal":"#certificate","actions":[["click","#certificate-state"]]}],"swarm":[{"caption":"Give each role a clear handoff. Build the journal with a deliberately faulty Data candidate.","reveal":".coordination","actions":[["click","#reset-button"],["click","[data-capacity=\"3\"]"],["click","#fault-button"],["click","#auto-run"]]},{"caption":"One duplicate note ID stops the merge. The graph keeps three accepted outputs and shows exactly what is waiting.","reveal":".coordination","actions":[["click","#tab-engineer"]]},{"caption":"Retry only Data. Interface, Accessibility, and the specification keep their original artifacts.","reveal":".coordination","actions":[["click","#retry-button"]]},{"caption":"The valid handoffs rejoin. Separate review and release finish the product; the chart records every real dispatch round.","reveal":"#rounds-panel","actions":[["click","#auto-run"]]},{"caption":"Six computed checks inspect the accepted records and composed markup before release is allowed.","reveal":".live-stage","actions":[["click","[data-stage-view=\"checks\"]"],["click","#tab-reviewer"]]},{"caption":"The team delivers a working reading journal. Choose a book, save a thought, or add a note; every handoff is inspectable.","reveal":".live-stage","actions":[["click","[data-stage-view=\"preview\"]"],["click","[data-book-id=\"book-distance\"]"],["click","#tab-packet"]]}],"memory":[{"caption":"A new task begins with the current project record: relevant decisions, constraints and next steps, each with a source.","reveal":".memory-stage","actions":[["click","#reset"]]},{"caption":"Ask about saving notes. The graph and the context brief update together; unrelated records remain outside the brief.","reveal":".memory-body","actions":[["click","[data-query=\"How should notes be saved?\"]"]]},{"caption":"Follow a changed decision. The old account-first proposal is preserved and points to the current local-notes decision.","reveal":".record-detail","actions":[["click","#show-history"]]},{"caption":"Keep a useful new decision in the project record.","reveal":".remember-panel","actions":[["click","#remember"]]},{"caption":"The next question can retrieve that decision immediately, with its source. The context brief is downloadable.","reveal":".context-panel","actions":[["input","#query","offline reading collaboration"],["click","#retrieve"]]}],"code":[{"caption":"Readable code turns this messy inbox into a real project plan.","reveal":"#result-panel","actions":[["click","#restore"]]},{"caption":"Lower the per-task limit. The plan, totals and row decisions all change together.","reveal":"#result-panel","actions":[["input","#limit","30"]]},{"caption":"Inspect the exact function that just ran, with its validation kept explicit.","reveal":"#code-panel","actions":[["click","#source-validate"]]},{"caption":"A negative estimate stops processing before any partial plan appears.","reveal":"#result-panel","actions":[["select","#preset","invalid"]]},{"caption":"At the boundary: sixty minutes is included, sixty-one is excluded, and zero is valid.","reveal":"#trace-panel","actions":[["input","#limit","60"],["select","#preset","boundary"]]},{"caption":"Rerun executable checks for duplicates, malformed input, boundary values and unchanged source data.","reveal":"#checks-panel","actions":[["click","#run-checks"]]}]};
  const name = location.pathname.split('/').slice(-2)[0];
  const completed = new Set();
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== parentOrigin) return;
    const message = event.data;
    if(message?.type === 'fabius-showcase-stop') { document.querySelectorAll('video,audio').forEach(media=>media.pause()); return; }
    if (message?.type !== 'fabius-showcase-step' || message.task !== name) return;
    const step = message.step;
    if (!Number.isInteger(step) || step < 0 || !tours[name]?.[step]) return;
    const entry = tours[name][step];
    if (!completed.has(step)) {
      for (const [action, selector, value] of entry.actions || []) {
        const element = document.querySelector(selector);
        if (!element) continue;
        if (action === 'click') element.click();
        if (action === 'input' || action === 'fill') { element.value = value; element.dispatchEvent(new Event('input', {bubbles:true})); }
        if (action === 'select') { element.value = value; element.dispatchEvent(new Event('change', {bubbles:true})); }
        if (action === 'check' && element.checked !== value) element.click();
      }
      completed.add(step);
    }
    document.documentElement.dataset.showcaseStep = String(step);
    const target = document.querySelector(entry.reveal);
    if (target) document.scrollingElement.scrollTo({top:Math.max(0,target.getBoundingClientRect().top+scrollY-24),behavior:'instant'});
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && window.parent !== window && !event.defaultPrevented)
      window.parent.postMessage({type:'fabius-preview-escape'},parentOrigin);
  });
})();
