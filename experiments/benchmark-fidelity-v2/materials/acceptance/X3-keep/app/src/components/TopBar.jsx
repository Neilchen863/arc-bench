import { useState } from 'react';
import {
  AppBar, Box, Chip, IconButton, InputBase, Menu, MenuItem, Paper, Toolbar, Tooltip, Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

export default function TopBar({
  sidebarExpanded, onToggleSidebar, search, labels, onSearchFocus, onQueryChange, onClearLabelFilter, onClearSearch,
  layout, onToggleLayout, onOpenSettings, searchInputRef,
}) {
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const filterLabel = labels.find((l) => l.id === search.labelId);

  return (
    <AppBar position="fixed" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', zIndex: (t) => t.zIndex.drawer + 1 }}>
      <Toolbar sx={{ gap: 1 }}>
        <Tooltip title="Main menu">
          <IconButton
            edge="start"
            aria-label="Main menu"
            aria-expanded={sidebarExpanded}
            aria-controls="sidebar"
            onClick={onToggleSidebar}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>
        <LightbulbIcon sx={{ color: '#f9ab00' }} aria-hidden />
        <Typography component="span" variant="h6" sx={{ mr: 3, color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
          Keep
        </Typography>
        <Paper
          component="form"
          role="search"
          onSubmit={(e) => e.preventDefault()}
          elevation={0}
          sx={{ flex: 1, maxWidth: 720, display: 'flex', alignItems: 'center', bgcolor: search.active ? '#fff' : '#f1f3f4', boxShadow: search.active ? 2 : 0, borderRadius: 2, px: 1 }}
        >
          <SearchIcon sx={{ color: 'text.secondary', mx: 1 }} aria-hidden />
          {filterLabel && (
            <Chip
              size="small"
              label={filterLabel.name}
              onDelete={onClearLabelFilter}
              sx={{ mr: 1 }}
            />
          )}
          <InputBase
            inputRef={searchInputRef}
            fullWidth
            placeholder="Search"
            value={search.query}
            onFocus={onSearchFocus}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') onClearSearch(); }}
            inputProps={{ type: 'search', 'aria-label': 'Search notes' }}
            sx={{ py: 1, '& input::-webkit-search-cancel-button': { display: 'none' } }}
          />
          {search.active && (
            <Tooltip title="Clear search">
              <IconButton aria-label="Clear search" onClick={onClearSearch}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          )}
        </Paper>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={layout === 'grid' ? 'List view' : 'Grid view'}>
          <IconButton aria-label={layout === 'grid' ? 'List view' : 'Grid view'} onClick={onToggleLayout}>
            {layout === 'grid' ? <ViewAgendaOutlinedIcon /> : <GridViewOutlinedIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Settings">
          <IconButton
            aria-label="Settings"
            aria-haspopup="menu"
            aria-expanded={Boolean(settingsAnchor)}
            onClick={(e) => setSettingsAnchor(e.currentTarget)}
          >
            <SettingsOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={settingsAnchor} open={Boolean(settingsAnchor)} onClose={() => setSettingsAnchor(null)}>
          <MenuItem onClick={() => { setSettingsAnchor(null); onOpenSettings(); }}>Settings</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
