import { Typography, Button, Stack, Grid } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Loading, Trail } from './common.jsx';
import { api, formatDate } from '../api.js';
import { useLoad } from '../useLoad.js';
import NotFound from './NotFound.jsx';
import { toHtml } from './RichBody.jsx';

async function loadPage(bookId, pageId) {
  const [book, page] = await Promise.all([api.get('books', bookId), api.get('pages', pageId)]);
  if (page.bookId !== bookId) throw new Error('page not in book');
  return { book, page };
}

export default function PageView() {
  const { bookId, pageId } = useParams();
  const navigate = useNavigate();
  const { data, error, loading } = useLoad(() => loadPage(bookId, pageId), [bookId, pageId]);
  if (loading) return <Loading />;
  if (error) return <NotFound />;
  const { book, page } = data;
  return (
    <>
      <Trail trail={[{ label: book.name, to: `/books/${bookId}` }, { label: page.title }]} />
      <Grid container spacing={3}>
        <Grid item xs={12} md={9}>
          <Card component="article">
            <Typography variant="h3" component="h1" gutterBottom sx={{ wordBreak: 'break-word' }}>{page.title}</Typography>
            <Typography component="div" dangerouslySetInnerHTML={{ __html: toHtml(page.body) }} />
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Typography variant="h6" component="h2">Details</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Created {formatDate(page.createdOn)}
            {page.updatedAt && page.updatedAt !== page.createdOn ? <><br />Updated {formatDate(page.updatedAt)}</> : null}
          </Typography>
          <Typography variant="h6" component="h2">Actions</Typography>
          <Stack spacing={1} alignItems="flex-start">
            <Button onClick={() => navigate(`/books/${bookId}/pages/${pageId}/edit`)}>Edit</Button>
          </Stack>
        </Grid>
      </Grid>
    </>
  );
}
