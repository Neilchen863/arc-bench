import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { navigate } from '../router.jsx';

export default function Books() {
  const [books, setBooks] = useState(null);
  useEffect(() => {
    api.list('books').then(setBooks).catch(() => setBooks([]));
  }, []);
  return (
    <div className="layout">
      <div className="card">
        <h1>Books</h1>
        <section aria-label="Book list" className="entity-list">
          {books === null ? (
            <p className="muted">Loading…</p>
          ) : books.length === 0 ? (
            <p className="muted">No books have been created yet.</p>
          ) : (
            <ul>
              {books.map((b) => (
                <li key={b.id} className="entity book">
                  <button type="button" className="entity-name" onClick={() => navigate(`/books/${b.id}`)}>
                    {b.name}
                  </button>
                  {b.description && <p className="entity-desc">{b.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <aside className="actions" aria-label="Actions">
        <h2>Actions</h2>
        <button type="button" className="action" onClick={() => navigate('/books/new')}>
          Create New Book
        </button>
      </aside>
    </div>
  );
}
