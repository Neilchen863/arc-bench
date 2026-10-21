import React, { useEffect, useState } from 'react';
import { api, parseTags } from '../api.js';
import { navigate } from '../router.jsx';
import { useNow, businessNow } from '../now.js';

export default function BookForm({ bookId }) {
  const editing = Boolean(bookId);
  const now = useNow();
  const [loaded, setLoaded] = useState(!editing);
  const [missing, setMissing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) return;
    api.get('books', bookId).then((b) => {
      if (!b) {
        setMissing(true);
      } else {
        setName(b.name || '');
        setDescription(b.description || '');
        setTags((b.tags || []).join(', '));
      }
      setLoaded(true);
    });
  }, [bookId, editing]);

  const cancel = () => navigate(editing ? `/books/${bookId}` : '/books');

  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setBusy(true);
    try {
      const stamp = await businessNow(now);
      const data = { name: name.trim(), description, tags: parseTags(tags), updated: stamp };
      if (editing) {
        await api.patch('books', bookId, data);
        navigate(`/books/${bookId}`);
      } else {
        const created = await api.create('books', { ...data, created: stamp });
        navigate(`/books/${created.id}`);
      }
    } catch (err) {
      setError('The book could not be saved. Please try again.');
      setBusy(false);
    }
  };

  if (missing)
    return (
      <div className="card">
        <h1>Book not found</h1>
      </div>
    );
  if (!loaded) return <p className="muted">Loading…</p>;

  return (
    <div className="card narrow">
      <h1>{editing ? 'Edit Book' : 'Create New Book'}</h1>
      <form onSubmit={save} className="form" noValidate>
        <div className="field">
          <label htmlFor="book-name">Name</label>
          <input id="book-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="book-description">Description</label>
          <textarea
            id="book-description"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="book-tags">Tags</label>
          <input
            id="book-tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            aria-describedby="book-tags-hint"
          />
          <small id="book-tags-hint" className="muted">
            Separate tags with commas.
          </small>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={cancel}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={busy}>
            Save Book
          </button>
        </div>
      </form>
    </div>
  );
}
