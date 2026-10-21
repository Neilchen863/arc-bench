import { Typography, TextField, Button, Stack, Alert } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Loading } from './common.jsx';
import { api } from '../api.js';
import NotFound from './NotFound.jsx';
import RichBody from './RichBody.jsx';

// New page: /books/:bookId/pages/new ; edit existing: /books/:bookId/pages/:pageId/edit
export default function PageEditor() {
  const { bookId, pageId } = useParams();
  const editing = Boolean(pageId);
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('loading');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = editing
      ? Promise.all([api.get('books', bookId), api.get('pages', pageId)]).then(([, page]) => {
          if (page.bookId !== bookId) throw new Error('page not in book');
          if (!alive) return;
          setTitle(page.title || '');
          setBody(page.body || '');
        })
      : api.get('books', bookId);
    load.then(() => alive && setStatus('ready'), () => alive && setStatus('missing'));
    return () => { alive = false; };
  }, [bookId, pageId, editing]);

  if (status === 'loading') return <Loading />;
  if (status === 'missing') return <NotFound />;

  const cancel = () => navigate(editing ? `/books/${bookId}/pages/${pageId}` : `/books/${bookId}`);

  async function save(e) {
    e.preventDefault();
    if (!title.trim()) { setErr('Page title is required.'); return; }
    setSaving(true);
    try {
      const now = await api.now();
      if (editing) {
        await api.patch('pages', pageId, { title: title.trim(), body, updatedAt: now });
        navigate(`/books/${bookId}/pages/${pageId}`);
      } else {
        await api.create('pages', { bookId, title: title.trim(), body, createdOn: now, updatedAt: now });
        navigate(`/books/${bookId}`);
      }
    } catch (ex) {
      setErr(String(ex.message || ex));
      setSaving(false);
    }
  }

  return (
    <Card>
      <Typography variant="h4" component="h1" gutterBottom>{editing ? 'Edit Page' : 'New Page'}</Typography>
      <Stack component="form" spacing={3} onSubmit={save} noValidate>
        <TextField label="Page title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
          error={Boolean(err) && !title.trim()} />
        <RichBody value={body} onChange={setBody} />
        {err && <Alert severity="error">{err}</Alert>}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button type="button" onClick={cancel}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>Save Page</Button>
        </Stack>
      </Stack>
    </Card>
  );
}
