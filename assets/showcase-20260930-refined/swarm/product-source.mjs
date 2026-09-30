/* Deterministic product renderer shared by integration, review, and the preview. */
(() => {
  'use strict';
  const DATA = {
    books: [
      { id: 'book-noticing', title: 'On noticing', subtitle: 'Attention & everyday life', spine: '01', cover: 'noticing' },
      { id: 'book-distance', title: 'The longer view', subtitle: 'Perspective & patience', spine: '02', cover: 'distance' },
      { id: 'book-intervals', title: 'Small intervals', subtitle: 'Practice & possibility', spine: '03', cover: 'intervals' }
    ],
    notes: [
      { id: 'note-01', bookId: 'book-noticing', chapter: 'The ordinary afternoon', text: 'Attention changes what an ordinary day has to offer. Look again before you look elsewhere.', kind: 'insight', saved: true },
      { id: 'note-02', bookId: 'book-noticing', chapter: 'A small observation', text: 'Keep one sentence from today: something you noticed without trying to make it useful.', kind: 'practice', saved: false },
      { id: 'note-03', bookId: 'book-distance', chapter: 'Let the idea settle', text: 'Some thoughts need distance before their shape becomes clear. Return to them with less urgency.', kind: 'insight', saved: true },
      { id: 'note-04', bookId: 'book-distance', chapter: 'The margin', text: 'Leave room beside the first interpretation. Tomorrow may bring a better question.', kind: 'practice', saved: false },
      { id: 'note-05', bookId: 'book-intervals', chapter: 'Begin smaller', text: 'A practice can start with an interval small enough to repeat and meaningful enough to keep.', kind: 'insight', saved: true }
    ]
  };
  const LABELS = { library: 'Choose a reading collection', filters: 'Filter reading notes', text: 'Your reading note', save: 'Save note', unsave: 'Unsave note', add: 'Add a note' };
  const TEMPLATE = `<section class="luma-app" aria-label="Reading journal">
  {{header}}
  {{intro}}
  <div class="book-shelf" role="group" aria-label="{{library-label}}">{{books}}</div>
  {{toolbar}}
  <div class="reading-notes" aria-live="polite">{{notes}}</div>
  {{composer}}
  {{footer}}
</section>`;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  function render(data, labels = LABELS, view = {}, template = TEMPLATE) {
    const selected = view.bookId || data.books[0].id;
    const filter = view.filter || 'all';
    const savedOnly = Boolean(view.savedOnly);
    const book = data.books.find(item => item.id === selected) || data.books[0];
    const visible = data.notes.filter(note => note.bookId === book.id && (filter === 'all' || note.kind === filter) && (!savedOnly || note.saved));
    const header = `<header class="luma-header"><span class="luma-brand">luma<span>.</span></span><nav aria-label="Journal view"><button type="button" data-product-view="all" aria-pressed="${!savedOnly}">Library</button><button type="button" data-product-view="saved" aria-pressed="${savedOnly}">Saved <span>${data.notes.filter(note => note.saved).length}</span></button></nav><button type="button" class="new-note" data-new-note aria-expanded="${Boolean(view.composer)}">New note <span aria-hidden="true">+</span></button></header>`;
    const intro = `<div class="luma-intro"><div><p>A PLACE FOR WHAT STAYS</p><h2>Reading room<span>.</span></h2></div><span>${data.books.length} books · ${data.notes.length} notes</span></div>`;
    const books = data.books.map(item => `<button type="button" class="book-card ${item.cover}" data-book-id="${item.id}" aria-pressed="${item.id === book.id}"><span class="book-cover"><span class="book-edition">LUMA EDITIONS / ${item.spine}</span><strong>${escape(item.title)}</strong><span class="cover-art" aria-hidden="true"><i></i><i></i><i></i></span><span class="book-subtitle">${escape(item.subtitle)}</span></span><span class="book-caption"><span>${escape(item.title)}</span><span>${data.notes.filter(note => note.bookId === item.id).length} notes</span></span></button>`).join('');
    const toolbar = `<div class="notes-toolbar"><div><h3>${savedOnly ? 'Saved from ' : 'Notes from '}<em>${escape(book.title)}</em></h3><span>${visible.length} ${visible.length === 1 ? 'thought' : 'thoughts'} to return to</span></div><div class="note-filters" role="group" aria-label="${escape(labels.filters)}">${['all', 'insight', 'practice'].map(kind => `<button type="button" data-note-filter="${kind}" aria-pressed="${filter === kind}">${kind === 'all' ? 'All' : kind === 'insight' ? 'Ideas' : 'Practice'}</button>`).join('')}</div></div>`;
    const notes = visible.length ? visible.map(note => `<article class="journal-note" data-note-id="${escape(note.id)}"><div class="note-meta"><span>${escape(note.chapter)}</span><button type="button" class="save-note" data-save-note="${escape(note.id)}" aria-pressed="${note.saved}" aria-label="${escape(note.saved ? labels.unsave : labels.save)}: ${escape(note.chapter)}"><svg viewBox="0 0 20 24" aria-hidden="true"><path d="M4 2h12v20l-6-4-6 4Z"/></svg></button></div><p>${escape(note.text)}</p><span class="note-kind">${note.kind === 'practice' ? 'A practice to try' : 'An idea to keep'}</span></article>`).join('') : '<p class="notes-empty">No notes match this view. Choose another filter or add a thought.</p>';
    const composer = `<form class="note-form" ${view.composer ? '' : 'hidden'}><label for="luma-note-text">${escape(labels.text)}</label><textarea id="luma-note-text" name="note" required maxlength="280" placeholder="A thought you want to return to…"></textarea><div><span>Local to this preview · no account</span><button type="submit">${escape(labels.add)}</button></div></form>`;
    const footer = `<footer class="luma-footer"><span>Keep the thought. Leave room for another.</span><span>Original synthetic reading notes</span></footer>`;
    const slots = { header, intro, 'library-label': escape(labels.library), books, toolbar, notes, composer, footer };
    return template.replace(/\{\{([a-z-]+)\}\}/g, (match, key) => slots[key] ?? match);
  }
  globalThis.CohortProduct = Object.freeze({ DATA, LABELS, TEMPLATE, render, escape });
})();
