import { Typography, List, ListItem, ListItemButton, ListItemText, Box, Button, Stack, Chip, Grid } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Loading } from './common.jsx';
import { api, formatDate } from '../api.js';
import { useLoad } from '../useLoad.js';
import NotFound from './NotFound.jsx';

async function loadBook(bookId) {
  const [book, pages] = await Promise.all([api.get('books', bookId), api.list('pages')]);
  const own = pages
    .filter((p) => p.bookId === bookId)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  return { book, pages: own };
}

export default function BookDetail() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { data, error, loading } = useLoad(() => loadBook(bookId), [bookId]);
  if (loading) return <Loading />;
  if (error) return <NotFound />;
  const { book, pages } = data;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={9}>
        <Card component="article">
          <Typography variant="h3" component="h1" gutterBottom sx={{ wordBreak: 'break-word' }}>{book.name}</Typography>
          {book.description && (
            <Typography sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{book.description}</Typography>
          )}
          {book.tags?.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }} aria-label="Tags" component="ul" style={{ listStyle: 'none', padding: 0 }}>
              {book.tags.map((t) => <li key={t}><Chip label={t} size="small" /></li>)}
            </Stack>
          )}
          <Box component="section" aria-label="Page list">
            {pages.length === 0 ? (
              <Typography color="text.secondary">This book has no pages yet.</Typography>
            ) : (
              <List>
                {pages.map((p) => (
                  <ListItem key={p.id} disablePadding sx={{ display: 'block', borderLeft: 3, borderColor: 'primary.light', mb: 1 }}>
                    <ListItemButton onClick={() => navigate(`/books/${bookId}/pages/${p.id}`)}>
                      <ListItemText primary={p.title} primaryTypographyProps={{ variant: 'h6', component: 'span' }} />
                    </ListItemButton>
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 1 }} noWrap>
                      {(p.body || '').replace(/<[^>]+>/g, ' ')}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Typography variant="h6" component="h2">Details</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Created {formatDate(book.createdOn)}
          {book.updatedAt && book.updatedAt !== book.createdOn ? <><br />Updated {formatDate(book.updatedAt)}</> : null}
        </Typography>
        <Typography variant="h6" component="h2">Actions</Typography>
        <Stack spacing={1} alignItems="flex-start">
          <Button onClick={() => navigate(`/books/${bookId}/pages/new`)}>New Page</Button>
          <Button onClick={() => navigate(`/books/${bookId}/edit`)}>Edit</Button>
        </Stack>
      </Grid>
    </Grid>
  );
}
