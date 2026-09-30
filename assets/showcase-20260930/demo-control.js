/* Gallery walkthrough controls only. Product source downloads do not include this bridge. */
(() => {
  'use strict';
  let parentOrigin;
  try { parentOrigin = new URL(document.referrer).origin; } catch { return; }
  const tours = {"security":[{"caption":"Start with an Editor updating their own document.","reveal":"#boundary","actions":[["click","#reset"]]},{"caption":"A Guest cannot read this restricted document.","reveal":"#boundary","actions":[["select","#scenario","guest"]]},{"caption":"Admin deletion still requires a second factor.","reveal":"#boundary","actions":[["select","#scenario","admin"]]},{"caption":"Verify MFA and follow the granted decision.","reveal":"#boundary","actions":[["check","#mfa",true]]},{"caption":"Compare roles under the same context.","reveal":".matrix-section"}],"architecture":[{"caption":"Submit one request to the durable queue.","reveal":"#topology","actions":[["click","#reset"],["click","#run-job"]]},{"caption":"The worker picks up the queued job.","reveal":"#topology","actions":[["click","#next-event"]]},{"caption":"Interrupt the worker. The job returns to the queue.","reveal":".worker-control","actions":[["click","#worker-toggle"]]},{"caption":"Restore the worker and deliver the retained job again.","reveal":"#topology","actions":[["click","#worker-toggle"],["click","#next-event"]]},{"caption":"Commit one output and mark the job complete.","reveal":"#result","actions":[["click","#next-event"]]},{"caption":"Replay the request. The same job and output remain.","reveal":".identity-panel","actions":[["click","#replay-request"]]}],"swarm":[{"caption":"Start the Planner and arm a recoverable Engineer failure.","reveal":".topology-board","actions":[["click","#reset-button"],["click","#fault-button"],["click","#run-button"]]},{"caption":"Designer and Engineer run in parallel.","reveal":".topology-board","actions":[["click","#run-button"]]},{"caption":"The failed Engineer blocks review; completed work remains.","reveal":".run-message"},{"caption":"Retry only the failed task.","reveal":".topology-board","actions":[["click","#retry-button"]]},{"caption":"With both artifacts ready, Reviewer can proceed.","reveal":".topology-board","actions":[["click","#run-button"]]},{"caption":"Inspect the assembled handoff and every source artifact.","reveal":".artifact-panel","actions":[["click","#tab-packet"]]}]};
  const name = location.pathname.split('/').slice(-2)[0];
  const completed = new Set();
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== parentOrigin) return;
    const message = event.data;
    if (message?.type !== 'fabius-showcase-step' || message.task !== name) return;
    const step = message.step;
    if (!Number.isInteger(step) || step < 0 || !tours[name]?.[step]) return;
    const entry = tours[name][step];
    if (!completed.has(step)) {
      for (const [action, selector, value] of entry.actions || []) {
        const element = document.querySelector(selector);
        if (!element) continue;
        if (action === 'click') element.click();
        if (action === 'select') { element.value = value; element.dispatchEvent(new Event('change', {bubbles:true})); }
        if (action === 'check' && element.checked !== value) element.click();
      }
      completed.add(step);
    }
    const target = document.querySelector(entry.reveal);
    if (target) document.scrollingElement.scrollTo({top:Math.max(0,target.getBoundingClientRect().top+scrollY-24),behavior:'instant'});
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && window.parent !== window && !event.defaultPrevented)
      window.parent.postMessage({type:'fabius-preview-escape'},parentOrigin);
  });
})();
