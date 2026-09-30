(() => {
  globalThis.RelayScenarios = Object.freeze({
    recovery: Object.freeze(['RUN', 'NEXT', 'TOGGLE_WORKER', 'REPLAY', 'TOGGLE_WORKER', 'NEXT', 'NEXT']),
    happy: Object.freeze(['RUN', 'NEXT', 'NEXT']),
    duplicate: Object.freeze(['RUN', 'REPLAY', 'NEXT', 'REPLAY', 'NEXT', 'REPLAY']),
    offline: Object.freeze(['TOGGLE_WORKER', 'RUN', 'NEXT', 'TOGGLE_WORKER', 'NEXT', 'NEXT'])
  });
})();
