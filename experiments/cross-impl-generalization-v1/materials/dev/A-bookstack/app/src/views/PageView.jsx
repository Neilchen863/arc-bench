import React, { useEffect, useState } from 'react';
import { api, formatDate } from '../api.js';
import { Link, navigate } from '../router.jsx';

export default function PageView({ bookId, pageId }) {
  const [page, setPage] = useState(undefined);
  const [book, setBook] = useState(null);

  useEffect(() => {
    api.get('pages', pageId).then(setPage);
    api.get('books', bookId).then(setBook);
  }, [bookId, pageId]);

  if (page === undefined) return <p className="muted">Loading…</p>;
  if (page === null || page.bookId !== bookId)
    return (
      <div className="card">
        <h1>Page not found</h1>
        <p>
          <Link to={`/books/${bookId}`}>Back to book</Link>
        </p>
      </div>
    );

  return (
    <div className="layout">
      <div>
        <nav aria-label="Breadcrumb" className="breadcrumbs">
          <span>Books</span> <span aria-hidden="true">›</span>{' '}
          <Link to={`/books/${bookId}`}>{book ? book.name : 'Book'}</Link> <span aria-hidden="true">›</span>{' '}
          <span>{page.title}</span>
        </nav>
        <article className="card page-content">
          <h1>{page.title}</h1>
          <div className="page-body">
            {String(page.body || '')
              .split(/\n{2,}/)
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
          </div>
        </article>
      </div>
      <aside className="actions" aria-label="Actions">
        <h2>Details</h2>
        {page.created && <p className="muted">Created {formatDate(page.created)}</p>}
        {page.updated && <p className="muted">Updated {formatDate(page.updated)}</p>}
        <h2>Actions</h2>
        <button type="button" className="action" onClick={() => navigate(`/books/${bookId}/pages/${pageId}/edit`)}>
          Edit
        </button>
      </aside>
    </div>
  );
}
