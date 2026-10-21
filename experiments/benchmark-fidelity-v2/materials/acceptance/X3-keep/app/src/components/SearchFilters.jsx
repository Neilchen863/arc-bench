import { ListItemIcon, ListItemText, MenuItem, MenuList, Paper, Typography } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import LabelIcon from '@mui/icons-material/Label';

// Panel shown while the search box is focused and empty: suggested label filters as a menu of options.
export default function SearchFilters({ labels, onChoose }) {
  return (
    <Paper component="section" aria-labelledby="search-filters-heading" variant="outlined" sx={{ maxWidth: 640, mx: 'auto' }}>
      <Typography id="search-filters-heading" component="h2" variant="subtitle2" sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
        Filter by label
      </Typography>
      <MenuList aria-labelledby="search-filters-heading" dense>
        {labels.map((l) => (
          <MenuItem key={l.id} onClick={() => onChoose(l.id)}>
            <ListItemIcon>{l.builtin ? <NotificationsNoneIcon fontSize="small" /> : <LabelIcon fontSize="small" />}</ListItemIcon>
            <ListItemText>{l.name}</ListItemText>
          </MenuItem>
        ))}
      </MenuList>
    </Paper>
  );
}
