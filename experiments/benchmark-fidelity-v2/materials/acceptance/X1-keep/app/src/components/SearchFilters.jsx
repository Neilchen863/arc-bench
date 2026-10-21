import { Box, ButtonBase, Paper, Typography } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import LabelIcon from '@mui/icons-material/Label';

// Panel shown while the search box is focused and empty: suggested label filters.
export default function SearchFilters({ labels, onChoose }) {
  return (
    <Paper component="section" aria-labelledby="search-filters-heading" variant="outlined" sx={{ maxWidth: 640, mx: 'auto' }}>
      <Typography id="search-filters-heading" component="h2" variant="subtitle2" sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
        Filter by label
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '2px', p: 0, pb: 0 }}>
        {labels.map((l) => (
          <ButtonBase
            key={l.id}
            onClick={() => onChoose(l.id)}
            sx={{
              flexDirection: 'column', gap: 1, height: 140, bgcolor: '#f1f3f4', '&:hover, &.Mui-focusVisible': { bgcolor: '#e8eaed' },
            }}
          >
            {l.builtin ? <NotificationsNoneIcon sx={{ fontSize: 36, color: '#5f6368' }} /> : <LabelIcon sx={{ fontSize: 36, color: '#5f6368' }} />}
            <Typography variant="body2">{l.name}</Typography>
          </ButtonBase>
        ))}
      </Box>
    </Paper>
  );
}
