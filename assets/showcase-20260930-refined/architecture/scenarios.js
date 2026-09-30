(() => {
  globalThis.RelayScenarios = Object.freeze({
    uncertain: Object.freeze(['RUN', 'NEXT', 'COMMIT_LOST_ACK', 'REPLAY', 'EXPIRE_LEASE', 'NEXT', 'STALE_COMMIT', 'NEXT', 'REPLAY']),
    fencing: Object.freeze(['RUN', 'NEXT', 'EXPIRE_LEASE', 'NEXT', 'STALE_COMMIT', 'NEXT']),
    recovery: Object.freeze(['RUN', 'NEXT', 'TOGGLE_WORKER', 'REPLAY', 'TOGGLE_WORKER', 'NEXT', 'NEXT']),
    happy: Object.freeze(['RUN', 'NEXT', 'NEXT']),
    duplicate: Object.freeze(['RUN', 'REPLAY', 'NEXT', 'REPLAY', 'NEXT', 'REPLAY']),
    offline: Object.freeze(['TOGGLE_WORKER', 'RUN', 'NEXT', 'TOGGLE_WORKER', 'NEXT', 'NEXT'])
  });
})();
