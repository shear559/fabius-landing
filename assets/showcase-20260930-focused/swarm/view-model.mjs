/* Pure views of scheduler evidence. Never invents duration or completed work. */
(() => {
  'use strict';
  function retainedIds(state) {
    const failure = state.events.find(event => event.kind === 'failed');
    if (!failure) return [];
    return state.events.filter(event => event.kind === 'complete' && event.sequence < failure.sequence && state.tasks[event.taskId].status === 'completed').map(event => event.taskId);
  }
  function rounds(state) {
    return Array.from({ length: state.round }, (_, index) => {
      const number = index + 1;
      return { number, tasks: state.events.filter(event => event.round === number && event.kind === 'start').map(start => {
        const settled = state.events.find(event => event.round === number && event.taskId === start.taskId && ['complete', 'failed'].includes(event.kind));
        return { id: start.taskId, status: settled?.kind === 'complete' ? 'completed' : settled?.kind === 'failed' ? 'failed' : 'running' };
      }) };
    });
  }
  globalThis.CohortView = Object.freeze({ retainedIds, rounds });
})();
