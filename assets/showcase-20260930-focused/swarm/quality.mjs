/* A separate deterministic reviewer: it consumes artifacts and never generates them. */
(() => {
  'use strict';
  function validateData(data) {
    const issues = [];
    if (!data || !Array.isArray(data.books) || !Array.isArray(data.notes)) return [{ code: 'INVALID_SCHEMA', path: 'root', message: 'books and notes must be arrays.' }];
    const bookIds = new Set();
    data.books.forEach((book, index) => {
      if (!book.id || bookIds.has(book.id)) issues.push({ code: 'DUPLICATE_BOOK_ID', path: `books[${index}].id`, message: 'Every book must have one unique nonempty identity.' });
      bookIds.add(book.id);
      if (!book.title) issues.push({ code: 'MISSING_TITLE', path: `books[${index}].title`, message: 'A book requires a display title.' });
    });
    const noteIds = new Set();
    data.notes.forEach((note, index) => {
      if (!note.id || noteIds.has(note.id)) issues.push({ code: 'DUPLICATE_NOTE_ID', path: `notes[${index}].id`, message: `Note identity ${note.id || '(empty)'} is duplicated or missing.` });
      noteIds.add(note.id);
      if (!bookIds.has(note.bookId)) issues.push({ code: 'UNKNOWN_BOOK', path: `notes[${index}].bookId`, message: 'The referenced book does not exist.' });
      if (!['insight', 'practice'].includes(note.kind) || typeof note.saved !== 'boolean' || typeof note.text !== 'string' || !note.text.trim()) issues.push({ code: 'INVALID_NOTE', path: `notes[${index}]`, message: 'A note needs text, a known kind, and a boolean saved flag.' });
    });
    return issues;
  }
  function review(bundle, data, access) {
    const html = bundle.html;
    const issues = validateData(data);
    const firstBook = data.books[0];
    const expectedVisible = data.notes.filter(note => note.bookId === firstBook.id);
    const ids = [...html.matchAll(/(?:^|\s)id="([^"]+)"/g)].map(match => match[1]);
    const checks = [
      { id: 'dataset', label: 'Unique identities and valid book references', passed: issues.length === 0, evidence: issues.length ? issues.map(issue => issue.code).join(', ') : `${data.books.length} books and ${data.notes.length} notes pass the schema.` },
      { id: 'binding', label: 'All book selectors are bound to actual records', passed: data.books.every(book => html.includes(`data-book-id="${book.id}"`)), evidence: 'Every dataset book has a matching product control.' },
      { id: 'notes', label: 'Initial notes match the selected book', passed: expectedVisible.every(note => html.split(`data-note-id="${note.id}"`).length === 2) && [...html.matchAll(/data-note-id=/g)].length === expectedVisible.length, evidence: `The initial view must contain exactly ${expectedVisible.length} notes from ${firstBook.title}.` },
      { id: 'labels', label: 'Interactive groups and note input have labels', passed: html.includes(`aria-label="${access.library}"`) && html.includes(`aria-label="${access.filters}"`) && html.includes('for="luma-note-text"') && html.includes('id="luma-note-text"'), evidence: 'Collection, filter, and input labels must match the accessibility contract.' },
      { id: 'ids', label: 'Document IDs are unique', passed: new Set(ids).size === ids.length, evidence: `${ids.length} document IDs inspected.` },
      { id: 'handlers', label: 'No inline executable handlers or scripts', passed: !/\bon(?:click|load|submit|error)\s*=|<script/i.test(html), evidence: 'Product behavior is supplied by an external classic script.' }
    ];
    return { passed: checks.every(check => check.passed), checks, scope: 'Deterministic data and markup contracts only; not a complete accessibility or security audit.' };
  }
  globalThis.CohortQuality = Object.freeze({ validateData, review });
})();
