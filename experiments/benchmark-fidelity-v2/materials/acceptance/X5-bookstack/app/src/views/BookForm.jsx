import { Typography, TextField, Button, Stack, Alert } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Loading } from './common.jsx';
import { api, parseTags, formatTags } from '../api.js';
import NotFound from './NotFound.jsx';

// Used both for "Create New Book" (/books/new) and "Edit" (/books/:bookId/edit).
export default function BookForm() {
  const { bookId } = useParams();
  const editing = Boolean(bookId);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '', tags: '' });
  const [status, setStatus] = useState(editing ? 'loading' : 'ready');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    api.get('books', bookId).then(
      (b) => {
        if (!alive) return;
        setForm({ name: b.name || '', description: b.description || '', tags: formatTags(b.tags) });
        setStatus('ready');
      },
      () => alive && setStatus('missing')
    );
    return () => { alive = false; };
  }, [bookId, editing]);

  if (status === 'loading') return <Loading />;
  if (status === 'missing') return <NotFound />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const cancel = () => navigate(editing ? `/books/${bookId}` : '/books');

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    setSaving(true);
    try {
      const doc = { name: form.name.trim(), description: form.description, tags: parseTags(form.tags) };
      if (editing) {
        await api.patch('books', bookId, { ...doc, updatedAt: await api.now() });
        navigate(`/books/${bookId}`);
      } else {
        const now = await api.now();
        const created = await api.create('books', { ...doc, createdOn: now, updatedAt: now });
        navigate(`/books/${created.id}`);
      }
    } catch (ex) {
      setErr(String(ex.message || ex));
      setSaving(false);
    }
  }

  return (
    <Card>
      <Typography variant="h4" component="h1" gutterBottom>{editing ? 'Edit Book' : 'Create New Book'}</Typography>
      <Stack component="form" spacing={3} onSubmit={save} noValidate>
        <TextField label="Name" value={form.name} onChange={set('name')} autoFocus
          error={Boolean(err) && !form.name.trim()} />
        <TextField label="Description" value={form.description} onChange={set('description')} multiline minRows={4} />
        <TextField label="Tags" value={form.tags} onChange={set('tags')}
          helperText="Separate tags with commas, for example: manual, handbook" />
        {err && <Alert severity="error">{err}</Alert>}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button type="button" onClick={cancel}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>Save Book</Button>
        </Stack>
      </Stack>
    </Card>
  );
}
