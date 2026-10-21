// Thin client for the shared REST backend. All business data lives on the server.
async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url} failed with ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export const api = {
  now: () => request('GET', '/api/now').then((r) => r.now),
  listNotes: () => request('GET', '/api/notes'),
  createNote: (note) => request('POST', '/api/notes', note),
  updateNote: (id, patch) => request('PATCH', `/api/notes/${id}`, patch),
  deleteNote: (id) => request('DELETE', `/api/notes/${id}`),
  listLabels: () => request('GET', '/api/labels'),
  createLabel: (label) => request('POST', '/api/labels', label),
  updateLabel: (id, patch) => request('PATCH', `/api/labels/${id}`, patch),
  deleteLabel: (id) => request('DELETE', `/api/labels/${id}`),
};
