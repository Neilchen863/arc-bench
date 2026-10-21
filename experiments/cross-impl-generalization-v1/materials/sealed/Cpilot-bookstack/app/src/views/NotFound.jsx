import { Typography } from '@mui/material';
import { Card } from './common.jsx';

export default function NotFound() {
  return (
    <Card>
      <Typography variant="h4" component="h1" gutterBottom>Not found</Typography>
      <Typography>The item you requested does not exist.</Typography>
    </Card>
  );
}
