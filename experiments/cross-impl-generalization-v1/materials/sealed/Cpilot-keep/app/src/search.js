// Pure helpers for note filtering and keyword highlighting.

export const isActive = (note) => !note.trashed && !note.archived;

export function normalizeQuery(query) {
  return (query || '').trim().toLowerCase();
}

// Keyword search: case-insensitive match on title or content.
export function matchesKeyword(note, query) {
  const q = normalizeQuery(query);
  if (!q) return true;
  return (note.title || '').toLowerCase().includes(q) || (note.content || '').toLowerCase().includes(q);
}

// Label filter chosen from the search panel's suggestions.
export function matchesSearchLabel(note, labelId) {
  if (!labelId) return true;
  return (note.labels || []).includes(labelId);
}

// Label filter chosen in the sidebar.
export function hasLabel(note, labelId) {
  return (note.labels || []).includes(labelId);
}

// Split text into plain and matching segments (case-insensitive).
export function splitMatches(text, query) {
  const q = normalizeQuery(query);
  const source = text || '';
  if (!q) return [{ text: source, match: false }];
  const lower = source.toLowerCase();
  const parts = [];
  let from = 0;
  for (let i = lower.indexOf(q); i !== -1; i = lower.indexOf(q, from)) {
    if (i > from) parts.push({ text: source.slice(from, i), match: false });
    parts.push({ text: source.slice(i, i + q.length), match: true });
    from = i + q.length;
  }
  if (from < source.length) parts.push({ text: source.slice(from), match: false });
  return parts;
}

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
