import { useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, List, ListItem, TextField, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

function LabelRow({ label, onRename, onDelete }) {
  const [name, setName] = useState(label.name);
  const commit = () => { const v = name.trim(); if (v && v !== label.name) onRename(label, v); else setName(label.name); };
  return (
    <ListItem disableGutters>
      <TextField
        fullWidth
        size="small"
        variant="standard"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.querySelector('input')?.blur(); }}
        slotProps={{
          htmlInput: { 'aria-label': `Rename label ${label.name}` },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Tooltip title="Delete label">
                  <IconButton size="small" aria-label={`Delete label ${label.name}`} onClick={() => onDelete(label)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          },
        }}
      />
    </ListItem>
  );
}

export default function EditLabelsDialog({ open, labels, onClose, onCreate, onRename, onDelete }) {
  const [draft, setDraft] = useState('');
  const create = () => { const v = draft.trim(); if (!v) return; onCreate(v); setDraft(''); };
  const userLabels = labels.filter((l) => !l.builtin);
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="edit-labels-title" maxWidth="xs" fullWidth>
      <DialogTitle id="edit-labels-title">Edit labels</DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          size="small"
          variant="standard"
          label="Create new label"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); create(); } }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Create label">
                    <IconButton size="small" aria-label="Create label" onClick={create}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            },
          }}
        />
        <List dense>
          {userLabels.map((l) => <LabelRow key={l.id} label={l} onRename={onRename} onDelete={onDelete} />)}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
