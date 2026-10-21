// Thin client for the shared REST store. All business data lives on the server.
async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  now: () => req('GET', '/api/now').then((r) => r.now),
  list: (col) => req('GET', `/api/${col}`),
  get: (col, id) => req('GET', `/api/${col}/${encodeURIComponent(id)}`),
  create: (col, doc) => req('POST', `/api/${col}`, doc),
  patch: (col, id, doc) => req('PATCH', `/api/${col}/${encodeURIComponent(id)}`, doc),
};

export function parseTags(text) {
  return text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
