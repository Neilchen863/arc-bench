// Split text into plain / matched segments for case-insensitive keyword highlighting.
export function segments(text, keyword) {
  const src = text || '';
  const q = (keyword || '').trim();
  if (!q) return [{ text: src, match: false }];
  const hay = src.toLowerCase();
  const needle = q.toLowerCase();
  const out = [];
  let i = 0;
  for (;;) {
    const j = hay.indexOf(needle, i);
    if (j < 0) break;
    if (j > i) out.push({ text: src.slice(i, j), match: false });
    out.push({ text: src.slice(j, j + needle.length), match: true });
    i = j + needle.length;
  }
  if (i < src.length) out.push({ text: src.slice(i), match: false });
  return out;
}

export function matchesKeyword(note, keyword) {
  const q = (keyword || '').trim().toLowerCase();
  if (!q) return true;
  return (note.title || '').toLowerCase().includes(q) || (note.content || '').toLowerCase().includes(q);
}
