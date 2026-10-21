import React, { useEffect, useState } from 'react';
import { api, formatDate } from '../api.js';
import { navigate } from '../router.jsx';

export default function BookDetail({ bookId }) {
  const [book, setBook] = useState(undefined);
  const [pages, setPages] = useState(null);

  useEffect(() => {
    api.get('books', bookId).then(setBook);
    api.list('pages').then((all) => {
      const mine = all
        .filter((p) => p.bookId === bookId)
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      setPages(mine);
    });
  }, [bookId]);

  if (book === undefined) return <p className="muted">Loading…</p>;
  if (book === null)
    return (
      <div className="card">
        <h1>Book not found</h1>
        <p>
          Return to the book list using Books in the header.
        </p>
      </div>
    );

  return (
    <div className="layout">
      <div>
        <nav aria-label="Breadcrumb" className="breadcrumbs">
          <span>Books</span> <span aria-hidden="true">›</span> <span>{book.name}</span>
        </nav>
        <div className="card">
          <h1>{book.name}</h1>
          {book.description && <p className="description">{book.description}</p>}
          {book.tags && book.tags.length > 0 && (
            <ul className="tags" aria-label="Tags">
              {book.tags.map((t) => (
                <li key={t} className="tag">
                  {t}
                </li>
              ))}
            </ul>
          )}
          <section aria-label="Page list" className="entity-list">
            {pages === null ? (
              <p className="muted">Loading…</p>
            ) : pages.length === 0 ? (
              <p className="muted">This book has no pages yet.</p>
            ) : (
              <ul>
                {pages.map((p) => (
                  <li key={p.id} className="entity page">
                    <button
                      type="button"
                      className="entity-name"
                      onClick={() => navigate(`/books/${bookId}/pages/${p.id}`)}
                    >
                      {p.title}
                    </button>
                    {p.body && <p className="entity-desc">{excerpt(p.body)}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      <aside className="actions" aria-label="Actions">
        <h2>Details</h2>
        {book.created && <p className="muted">Created {formatDate(book.created)}</p>}
        {book.updated && <p className="muted">Updated {formatDate(book.updated)}</p>}
        <h2>Actions</h2>
        <button type="button" className="action" onClick={() => navigate(`/books/${bookId}/pages/new`)}>
          New Page
        </button>
        <button type="button" className="action" onClick={() => navigate(`/books/${bookId}/edit`)}>
          Edit
        </button>
      </aside>
    </div>
  );
}

function excerpt(text) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  return t.length > 120 ? `${t.slice(0, 117)}…` : t;
}
