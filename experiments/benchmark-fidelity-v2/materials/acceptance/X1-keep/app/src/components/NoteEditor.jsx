import { useState } from 'react';
import {
  Box, Button, Chip, Dialog, IconButton, InputBase, Menu, MenuItem, ListItemIcon, Stack, Tooltip, Typography,
} from '@mui/material';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import PushPinIcon from '@mui/icons-material/PushPin';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CircleIcon from '@mui/icons-material/Circle';
import CloseIcon from '@mui/icons-material/Close';
import LabelChooser from './LabelChooser.jsx';
import { NOTE_COLORS, colorValue } from './colors.js';
import { formatDate } from '../search.js';

const visuallyHidden = {
  position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
};

// Editor surface for creating or editing a note. Closing it (button, Escape or
// clicking outside) hands the draft back to the parent, which saves it.
export default function NoteEditor({ note, labels, initialLabels, onClose }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [pinned, setPinned] = useState(!!note?.pinned);
  const [color, setColor] = useState(note?.color || null);
  const [noteLabels, setNoteLabels] = useState(note?.labels || initialLabels || []);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [colorAnchor, setColorAnchor] = useState(null);

  const close = () => onClose({ title, content, pinned, color, labels: noteLabels });
  const labelName = (id) => labels.find((l) => l.id === id)?.name;

  return (
    <Dialog
      open
      onClose={close}
      aria-labelledby="note-editor-heading"
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { bgcolor: colorValue(color), borderRadius: 2 } }}
    >
      <Typography id="note-editor-heading" component="h2" sx={visuallyHidden}>
        {note ? 'Edit note' : 'New note'}
      </Typography>
      <Box sx={{ px: 2, pt: 1.5 }}>
        <Stack direction="row" alignItems="flex-start">
          <InputBase
            autoFocus
            fullWidth
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            inputProps={{ 'aria-label': 'Title' }}
            sx={{ fontSize: 20, fontWeight: 500 }}
          />
          <Tooltip title={pinned ? 'Unpin note' : 'Pin note'}>
            <IconButton aria-label="Pin note" aria-pressed={pinned} onClick={() => setPinned((p) => !p)}>
              {pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton aria-label="Close" onClick={close} edge="end">
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>
        <InputBase
          fullWidth
          multiline
          minRows={3}
          placeholder="Take a note…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          inputProps={{ 'aria-label': 'Note text' }}
          sx={{ mt: 1 }}
        />
        {noteLabels.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }} aria-label="Labels on this note" role="list">
            {noteLabels.map((id) => labelName(id) && (
              <Chip key={id} role="listitem" size="small" label={labelName(id)} />
            ))}
          </Stack>
        )}
        {note?.editedAt && (
          <Typography variant="caption" color="text.secondary" component="p" sx={{ textAlign: 'right', mt: 1 }}>
            Edited {formatDate(note.editedAt)}
          </Typography>
        )}
      </Box>
      <Stack direction="row" alignItems="center" sx={{ px: 1, py: 1 }}>
        <Tooltip title="Background color">
          <IconButton
            aria-label="Background color"
            aria-haspopup="menu"
            aria-expanded={Boolean(colorAnchor)}
            onClick={(e) => setColorAnchor(e.currentTarget)}
          >
            <PaletteOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Add label">
          <IconButton aria-label="Add label" aria-haspopup="dialog" onClick={() => setChooserOpen(true)}>
            <LabelOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <Menu anchorEl={colorAnchor} open={Boolean(colorAnchor)} onClose={() => setColorAnchor(null)}>
        {NOTE_COLORS.map((c) => (
          <MenuItem
            key={c.name}
            selected={c.id === color}
            onClick={() => { setColor(c.id); setColorAnchor(null); }}
          >
            <ListItemIcon>
              <CircleIcon sx={{ color: c.value, stroke: '#9aa0a6', strokeWidth: 1 }} />
            </ListItemIcon>
            {c.name}
            {c.id === color && <CheckIcon fontSize="small" sx={{ ml: 1 }} />}
          </MenuItem>
        ))}
      </Menu>
      <LabelChooser
        open={chooserOpen}
        labels={labels}
        selected={noteLabels}
        onDone={(ids) => { setNoteLabels(ids); setChooserOpen(false); }}
      />
    </Dialog>
  );
}
