import { Alert, Box, CircularProgress, Paper, Breadcrumbs, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function Loading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress aria-label="Loading" />
    </Box>
  );
}

export function LoadError({ error }) {
  return <Alert severity="error">Could not load: {String(error?.message || error)}</Alert>;
}

export function Card({ children, ...rest }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 4 } }} {...rest}>
      {children}
    </Paper>
  );
}

// trail: [{ label, to }] ; last item rendered as current text
export function Trail({ trail }) {
  return (
    <Breadcrumbs aria-label="Breadcrumb" sx={{ mb: 2 }}>
      {trail.map((t, i) =>
        i === trail.length - 1 ? (
          <Typography key={i} color="text.primary" aria-current="page">{t.label}</Typography>
        ) : (
          <Link key={i} component={RouterLink} to={t.to} underline="hover">{t.label}</Link>
        )
      )}
    </Breadcrumbs>
  );
}
