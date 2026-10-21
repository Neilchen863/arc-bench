import { Box, Typography } from '@mui/material';
import NoteCard from './NoteCard.jsx';

function Grid({ notes, layout, ...cardProps }) {
  return (
    <Box
      sx={layout === 'list'
        ? { display: 'grid', gap: 2, maxWidth: 600, mx: 'auto' }
        : { display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', alignItems: 'start' }}
    >
      {notes.map((n) => <NoteCard key={n.id} note={n} {...cardProps} />)}
    </Box>
  );
}

// Lists notes newest first; pinned notes get their own section when present.
export default function NoteGrid({ notes, emptyText, splitPinned = true, ...props }) {
  const ordered = [...notes].reverse();
  if (ordered.length === 0) {
    return <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 8 }}>{emptyText}</Typography>;
  }
  const pinned = ordered.filter((n) => n.pinned);
  const others = ordered.filter((n) => !n.pinned);
  if (!splitPinned || pinned.length === 0) return <Grid notes={ordered} {...props} />;
  return (
    <>
      <Box component="section" aria-labelledby="pinned-heading" sx={{ mb: 4 }}>
        <Typography id="pinned-heading" component="h2" variant="overline" color="text.secondary">Pinned</Typography>
        <Grid notes={pinned} {...props} />
      </Box>
      {others.length > 0 && (
        <Box component="section" aria-labelledby="others-heading">
          <Typography id="others-heading" component="h2" variant="overline" color="text.secondary">Others</Typography>
          <Grid notes={others} {...props} />
        </Box>
      )}
    </>
  );
}
