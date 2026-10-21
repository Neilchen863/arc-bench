import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Tooltip,
} from '@mui/material';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

export const DRAWER_OPEN = 280;
export const DRAWER_CLOSED = 72;

function Item({ icon, text, selected, expanded, onClick }) {
  const button = (
    <ListItemButton
      selected={selected}
      aria-current={selected ? 'page' : undefined}
      aria-label={expanded ? undefined : text}
      onClick={onClick}
      sx={{
        minHeight: 48, borderRadius: expanded ? '0 24px 24px 0' : '24px', mx: expanded ? 0 : 1, px: expanded ? 3 : 1.5,
        '&.Mui-selected': { bgcolor: '#feefc3' }, '&.Mui-selected:hover': { bgcolor: '#feefc3' },
      }}
    >
      <ListItemIcon sx={{ minWidth: expanded ? 48 : 0 }}>{icon}</ListItemIcon>
      {expanded && <ListItemText primary={text} primaryTypographyProps={{ noWrap: true, fontWeight: 500, fontSize: 14 }} />}
    </ListItemButton>
  );
  return expanded ? button : <Tooltip title={text} placement="right">{button}</Tooltip>;
}

export default function Sidebar({ expanded, labels, view, searching, onSelect, onEditLabels }) {
  const reminders = labels.find((l) => l.builtin);
  const userLabels = labels.filter((l) => !l.builtin);
  const is = (type, id) => !searching && view.type === type && (id === undefined || view.labelId === id);
  const width = expanded ? DRAWER_OPEN : DRAWER_CLOSED;
  return (
    <Drawer
      variant="permanent"
      sx={{ width, flexShrink: 0, '& .MuiDrawer-paper': { width, boxSizing: 'border-box', borderRight: 0, transition: 'width 150ms', overflowX: 'hidden' } }}
    >
      <Toolbar />
      <Box component="nav" id="sidebar" aria-label="Main navigation" sx={{ pt: 1 }}>
        <List disablePadding>
          <Item icon={<LightbulbOutlinedIcon />} text="Notes" expanded={expanded} selected={is('notes')} onClick={() => onSelect({ type: 'notes' })} />
          {reminders && (
            <Item icon={<NotificationsNoneIcon />} text={reminders.name} expanded={expanded} selected={is('label', reminders.id)} onClick={() => onSelect({ type: 'label', labelId: reminders.id })} />
          )}
          {userLabels.map((l) => (
            <Item key={l.id} icon={<LabelOutlinedIcon />} text={l.name} expanded={expanded} selected={is('label', l.id)} onClick={() => onSelect({ type: 'label', labelId: l.id })} />
          ))}
          <Item icon={<EditOutlinedIcon />} text="Edit labels" expanded={expanded} selected={false} onClick={onEditLabels} />
          <Item icon={<ArchiveOutlinedIcon />} text="Archive" expanded={expanded} selected={is('archive')} onClick={() => onSelect({ type: 'archive' })} />
          <Item icon={<DeleteOutlineIcon />} text="Trash" expanded={expanded} selected={is('trash')} onClick={() => onSelect({ type: 'trash' })} />
        </List>
      </Box>
    </Drawer>
  );
}
