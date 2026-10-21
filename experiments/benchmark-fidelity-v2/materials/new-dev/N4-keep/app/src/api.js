// Thin REST client for the shared runtime server. All business data lives on the server.
async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export const api = {
  now: () => request('GET', '/api/now').then(r => r.now),
  list: col => request('GET', `/api/${col}`),
  create: (col, doc) => request('POST', `/api/${col}`, doc),
  patch: (col, id, doc) => request('PATCH', `/api/${col}/${id}`, doc),
  remove: (col, id) => request('DELETE', `/api/${col}/${id}`),
};

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
}
