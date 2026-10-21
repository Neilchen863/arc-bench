import { Box } from '@mui/material';
import { splitMatches } from '../search.js';

// Renders text with every keyword occurrence wrapped in a visible <mark>.
export default function Highlighted({ text, query }) {
  return splitMatches(text, query).map((part, i) =>
    part.match ? (
      <Box
        key={i}
        component="mark"
        sx={{ bgcolor: '#fdd663', color: 'inherit', borderRadius: '2px', px: '1px', fontWeight: 600 }}
      >
        {part.text}
      </Box>
    ) : (
      <span key={i}>{part.text}</span>
    ),
  );
}
