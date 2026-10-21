// Pure search helpers (keyword matching and highlight splitting).

export function normalizeQuery(query) {
  return query.trim().toLowerCase();
}

// Case-insensitive match against a note's title or content.
export function matchesKeyword(note, query) {
  const q = normalizeQuery(query);
  if (!q) return true;
  return (note.title || '').toLowerCase().includes(q) || (note.content || '').toLowerCase().includes(q);
}

export function hasLabel(note, labelId) {
  return (note.labels || []).includes(labelId);
}

// Splits text into [{text, match}] segments for every case-insensitive occurrence of query.
export function splitMatches(text, query) {
  const q = normalizeQuery(query);
  const source = text || '';
  if (!q) return [{ text: source, match: false }];
  const lower = source.toLowerCase();
  const parts = [];
  let from = 0;
  let idx = lower.indexOf(q, from);
  while (idx !== -1) {
    if (idx > from) parts.push({ text: source.slice(from, idx), match: false });
    parts.push({ text: source.slice(idx, idx + q.length), match: true });
    from = idx + q.length;
    idx = lower.indexOf(q, from);
  }
  if (from < source.length) parts.push({ text: source.slice(from), match: false });
  return parts;
}
