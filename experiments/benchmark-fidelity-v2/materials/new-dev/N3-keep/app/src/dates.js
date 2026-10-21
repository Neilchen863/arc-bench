// Dates are always rendered from business time (GET /api/now), in UTC.
export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
}

const DAY = 24 * 60 * 60 * 1000;
// A trashed note is retained for less than seven elapsed 24-hour days.
export function isRetained(note, nowIso) {
  if (!note.deletedAt || !nowIso) return true;
  return Date.parse(nowIso) - Date.parse(note.deletedAt) < 7 * DAY;
}
