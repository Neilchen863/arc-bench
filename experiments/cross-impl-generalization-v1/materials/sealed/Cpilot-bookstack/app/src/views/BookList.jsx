import { Typography, List, ListItem, ListItemButton, ListItemText, Box, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Card, Loading, LoadError } from './common.jsx';
import { api } from '../api.js';
import { useLoad } from '../useLoad.js';

export default function BookList() {
  const navigate = useNavigate();
  const { data, error, loading } = useLoad(() => api.list('books'), []);
  return (
    <Card>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" component="h1">Books</Typography>
        <Button variant="contained" onClick={() => navigate('/books/new')}>Create New Book</Button>
      </Stack>
      {loading && <Loading />}
      {error && <LoadError error={error} />}
      {data && (
        <Box component="section" aria-label="Book list">
          {data.length === 0 ? (
            <Typography color="text.secondary">No books have been created yet.</Typography>
          ) : (
            <List>
              {data.map((b) => (
                <ListItem key={b.id} disablePadding sx={{ display: 'block', mb: 1 }}>
                  <ListItemButton onClick={() => navigate(`/books/${b.id}`)}>
                    <ListItemText primary={b.name} primaryTypographyProps={{ variant: 'h6', component: 'span' }} />
                  </ListItemButton>
                  {b.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2 }} noWrap>
                      {b.description}
                    </Typography>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}
    </Card>
  );
}
