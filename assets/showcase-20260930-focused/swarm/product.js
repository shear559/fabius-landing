(() => {
  'use strict';
  const P = globalThis.CohortProduct;
  function mount(root, data = P.DATA, labels = P.LABELS, template = P.TEMPLATE) {
    const local = JSON.parse(JSON.stringify(data));
    const view = { bookId: local.books[0].id, filter: 'all', savedOnly: false, composer: false };
    let localId = 0;
    const paint = () => { root.innerHTML = P.render(local, labels, view, template); };
    root.onclick = event => {
      const button = event.target.closest('button');
      if (!button || !root.contains(button)) return;
      let focusSelector;
      if (button.dataset.bookId) { view.bookId = button.dataset.bookId; focusSelector = `[data-book-id="${view.bookId}"]`; }
      else if (button.dataset.noteFilter) { view.filter = button.dataset.noteFilter; focusSelector = `[data-note-filter="${view.filter}"]`; }
      else if (button.dataset.productView) { view.savedOnly = button.dataset.productView === 'saved'; focusSelector = `[data-product-view="${button.dataset.productView}"]`; }
      else if (button.dataset.saveNote) { const note = local.notes.find(item => item.id === button.dataset.saveNote); if (note) note.saved = !note.saved; focusSelector = `[data-save-note="${button.dataset.saveNote}"]`; }
      else if (button.hasAttribute('data-new-note')) { view.composer = !view.composer; focusSelector = view.composer ? '#luma-note-text' : '[data-new-note]'; }
      else return;
      paint();
      root.querySelector(focusSelector)?.focus({ preventScroll: true });
      if (view.composer && button.hasAttribute('data-new-note')) root.querySelector('.note-form').scrollTop = 0;
    };
    root.onsubmit = event => {
      if (!event.target.matches('.note-form')) return;
      event.preventDefault();
      const field = event.target.querySelector('textarea');
      const text = field.value.trim();
      if (!text) { field.setCustomValidity('Write a note before adding it.'); field.reportValidity(); return; }
      field.setCustomValidity('');
      localId += 1;
      local.notes.push({ id: `local-note-${localId}`, bookId: view.bookId, chapter: 'Your reading note', text, kind: 'insight', saved: true });
      view.composer = false; view.filter = 'all'; view.savedOnly = false;
      paint();
      root.querySelector('[data-new-note]').focus({ preventScroll: true });
    };
    root.oninput = event => { if (event.target.matches('textarea')) event.target.setCustomValidity(''); };
    paint();
  }
  globalThis.CohortProductUI = Object.freeze({ mount });
  const standalone = document.getElementById('standalone-product');
  if (standalone) mount(standalone);
})();
