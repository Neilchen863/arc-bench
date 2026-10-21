import { splitMatches } from './search.js';

// Renders text with every keyword match wrapped in a named "Highlight {keyword}" region.
export default function Highlighted({ text, query }) {
  const keyword = query.trim();
  return splitMatches(text, keyword).map((part, i) =>
    part.match ? (
      <mark key={i} role="region" aria-label={`Highlight ${keyword}`} className="highlight">
        {part.text}
      </mark>
    ) : (
      <span key={i}>{part.text}</span>
    )
  );
}
