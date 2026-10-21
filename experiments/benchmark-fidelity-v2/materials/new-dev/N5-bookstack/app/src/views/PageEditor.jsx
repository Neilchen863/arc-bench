import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { navigate } from '../router.jsx';
import { useNow, businessNow } from '../now.js';


export default function PageEditor({ bookId, pageId }) {
  const editing = Boolean(pageId);
  const now = useNow();
  const [loaded, setLoaded] = useState(!editing);
  const [missing, setMissing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) return;
    api.get('pages', pageId).then((p) => {
      if (!p) {
        setMissing(true);
      } else {
        setTitle(p.title || '');
        setBody(p.body || '');
      }
      setLoaded(true);
    });
  }, [pageId, editing]);

  const cancel = () => navigate(editing ? `/books/${bookId}/pages/${pageId}` : `/books/${bookId}`);

  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!title.trim()) {
      setError('Page title is required.');
      return;
    }
    setBusy(true);
    try {
      const stamp = await businessNow(now);
      if (editing) {
        await api.patch('pages', pageId, { title: title.trim(), body, updated: stamp });
        navigate(`/books/${bookId}/pages/${pageId}`);
      } else {
        await api.create('pages', { bookId, title: title.trim(), body, created: stamp, updated: stamp });
        navigate(`/books/${bookId}`);
      }
    } catch (err) {
      setError('The page could not be saved. Please try again.');
      setBusy(false);
    }
  };

  if (missing)
    return (
      <div className="card">
        <h1>Page not found</h1>
      </div>
    );
  if (!loaded) return <p className="muted">Loading…</p>;

  return (
    <form className="editor" onSubmit={save} noValidate>
      <div className="editor-toolbar">
        <h1 className="visually-hidden">{editing ? 'Edit Page' : 'New Page'}</h1>
        <button type="button" className="secondary" onClick={cancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={busy}>
          Save Page
        </button>
      </div>
      <div className="card editor-card">
        <label htmlFor="page-title" className="field-label">
          Page title <span className="req" aria-hidden="true">*</span>
          <small id="page-title-hint" className="muted"> Shown as the page heading</small>
        </label>
        <input
          id="page-title"
          className="title-input"
          type="text"
          aria-describedby="page-title-hint"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label htmlFor="page-body" className="field-label">
          Page content
        </label>
        <textarea
          id="page-body"
          className="body-input"
          rows={16}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
