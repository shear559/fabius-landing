/* Preview-wrapper keyboard bridge. Candidate source files are unchanged. */
(() => {
  'use strict';
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented || window.parent === window) return;
    const fromDialog = event.composedPath().some(element => element instanceof Element &&
      (element.tagName === 'DIALOG' || element.getAttribute('role') === 'dialog'));
    if (fromDialog) return;
    window.parent.postMessage({ type: 'fabius-preview-escape' }, '*');
  });
})();
