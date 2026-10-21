// Thin client for the shared REST store. All business data lives on the server.
async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export const api = {
  now: () => req('GET', '/api/now').then((r) => r.now),
  list: (col) => req('GET', `/api/${col}`),
  get: (col, id) => req('GET', `/api/${col}/${id}`),
  create: (col, doc) => req('POST', `/api/${col}`, doc),
  patch: (col, id, doc) => req('PATCH', `/api/${col}/${id}`, doc),
};

export const parseTags = (s) =>
  s.split(',').map((t) => t.trim()).filter(Boolean);
export const formatTags = (tags) => (tags || []).join(', ');

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}
