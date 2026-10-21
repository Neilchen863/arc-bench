import { useEffect, useState } from 'react';
import {
  Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormGroup, Typography,
} from '@mui/material';

// Dialog for picking which labels a note carries.
export default function LabelChooser({ open, labels, selected, onDone }) {
  const [checked, setChecked] = useState(selected || []);
  useEffect(() => { if (open) setChecked(selected || []); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <Dialog open={open} onClose={() => onDone(checked)} aria-labelledby="label-chooser-title" maxWidth="xs" fullWidth>
      <DialogTitle id="label-chooser-title">Label note</DialogTitle>
      <DialogContent dividers>
        {labels.length === 0 ? (
          <Typography color="text.secondary">No labels yet.</Typography>
        ) : (
          <FormGroup>
            {labels.map((label) => (
              <FormControlLabel
                key={label.id}
                label={label.name}
                control={<Checkbox checked={checked.includes(label.id)} onChange={() => toggle(label.id)} />}
              />
            ))}
          </FormGroup>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onDone(checked)}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
