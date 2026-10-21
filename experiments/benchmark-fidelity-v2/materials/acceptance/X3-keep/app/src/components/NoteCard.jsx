import { useState } from 'react';
import {
  Card, CardActions, CardContent, Chip, IconButton, Menu, MenuItem, Stack, Tooltip, Typography,
} from '@mui/material';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import PushPinIcon from '@mui/icons-material/PushPin';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Highlighted from './Highlighted.jsx';
import { colorValue } from './colors.js';
import { formatDate } from '../search.js';

// One note, identified by its visible title. Actions are scoped to the card.
export default function NoteCard({ note, labels, query, mode, onOpen, onTogglePin, onChangeLabels, onArchive, onTrash, onRestore, onDeleteForever }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const titleId = `note-title-${note.id}`;
  const noteLabels = (note.labels || []).map((id) => labels.find((l) => l.id === id)).filter(Boolean);
  const inTrash = mode === 'trash';
  const closeMenu = () => setMenuAnchor(null);
  const run = (fn) => () => { closeMenu(); fn(note); };

  return (
    <Card
      component="article"
      aria-labelledby={titleId}
      variant="outlined"
      sx={{
        bgcolor: colorValue(note.color), borderRadius: 2, breakInside: 'avoid', display: 'flex', flexDirection: 'column',
        '&:hover, &:focus-within': { boxShadow: 3 },
      }}
    >
      <CardContent
        onClick={inTrash ? undefined : () => onOpen(note)}
        sx={{ cursor: inTrash ? 'default' : 'pointer', pb: 1 }}
      >
        <Typography id={titleId} component="h3" variant="subtitle1" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
          {note.title ? <Highlighted text={note.title} query={query} /> : 'Untitled note'}
        </Typography>
        {note.content && (
          <Typography variant="body2" component="p" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mt: 0.5 }}>
            <Highlighted text={note.content} query={query} />
          </Typography>
        )}
        {noteLabels.length > 0 && (
          <Stack direction="row" useFlexGap spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }} role="list" aria-label="Labels">
            {noteLabels.map((l) => <Chip key={l.id} role="listitem" size="small" label={l.name} />)}
          </Stack>
        )}
        {inTrash && note.deletedAt && (
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
            Deleted {formatDate(note.deletedAt)}
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ mt: 'auto', pt: 0, justifyContent: 'flex-end' }}>
        {!inTrash && (
          <>
            <Tooltip title={note.pinned ? 'Unpin note' : 'Pin note'}>
              <IconButton size="small" aria-label="Pin note" aria-pressed={!!note.pinned} onClick={() => onTogglePin(note)}>
                {note.pinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit note">
              <IconButton size="small" aria-label="Edit note" onClick={() => onOpen(note)}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
        <Tooltip title="More options">
          <IconButton
            size="small"
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={Boolean(menuAnchor)}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        {inTrash
          ? [
            <MenuItem key="restore" onClick={run(onRestore)}>Restore</MenuItem>,
            <MenuItem key="forever" onClick={run(onDeleteForever)}>Delete forever</MenuItem>,
          ]
          : [
            <MenuItem key="labels" onClick={run(onChangeLabels)}>Change labels</MenuItem>,
            <MenuItem key="archive" onClick={run(onArchive)}>{note.archived ? 'Unarchive' : 'Archive'}</MenuItem>,
            <MenuItem key="trash" onClick={run(onTrash)}>Delete note</MenuItem>,
          ]}
      </Menu>
    </Card>
  );
}
