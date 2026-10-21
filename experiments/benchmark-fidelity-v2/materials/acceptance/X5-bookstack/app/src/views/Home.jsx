import { Typography } from '@mui/material';
import { Card } from './common.jsx';
import { api, formatDate } from '../api.js';
import { useLoad } from '../useLoad.js';

export default function Home() {
  const { data: now } = useLoad(() => api.now(), []);
  return (
    <Card>
      <Typography variant="h4" component="h1" gutterBottom>Welcome to BookStack</Typography>
      <Typography paragraph>
        Browse the knowledge base using the Shelves and Books entries in the top navigation,
        or log in to access your personal dashboard.
      </Typography>
      {now && <Typography variant="body2" color="text.secondary">Today is {formatDate(now)}.</Typography>}
    </Card>
  );
}
