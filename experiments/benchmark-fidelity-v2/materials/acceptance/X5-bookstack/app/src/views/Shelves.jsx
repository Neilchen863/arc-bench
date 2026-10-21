import { Typography, List, ListItem, ListItemButton, ListItemText, Box } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Loading, LoadError, Trail } from './common.jsx';
import { api } from '../api.js';
import { useLoad } from '../useLoad.js';
import NotFound from './NotFound.jsx';

// Shelves are outside this build's scope; browsing the seeded shelves is provided read-only.
export function ShelfList() {
  const navigate = useNavigate();
  const { data, error, loading } = useLoad(() => api.list('shelves'), []);
  return (
    <Card>
      <Typography variant="h4" component="h1" gutterBottom>Shelves</Typography>
      {loading && <Loading />}
      {error && <LoadError error={error} />}
      {data && (
        <Box component="section" aria-label="Shelf list">
          <List>
            {data.map((s) => (
              <ListItem key={s.id} disablePadding>
                <ListItemButton onClick={() => navigate(`/shelves/${s.id}`)}>
                  <ListItemText primary={s.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Card>
  );
}

export function ShelfDetail() {
  const { shelfId } = useParams();
  const { data, error, loading } = useLoad(() => api.get('shelves', shelfId), [shelfId]);
  if (loading) return <Loading />;
  if (error) return <NotFound />;
  return (
    <>
      <Trail trail={[{ label: data.name }]} />
      <Card>
        <Typography variant="h3" component="h1" gutterBottom>{data.name}</Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{data.description}</Typography>
      </Card>
    </>
  );
}
