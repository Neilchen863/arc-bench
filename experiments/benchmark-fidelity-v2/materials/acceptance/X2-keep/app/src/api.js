// Thin REST client for the shared runtime server. All business data lives on the server.
async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} failed (${res.status})`)
  return res.status === 204 ? null : res.json()
}

export const api = {
  now: () => request('GET', '/api/now').then(r => r.now),
  list: col => request('GET', `/api/${col}`),
  create: (col, doc) => request('POST', `/api/${col}`, doc),
  patch: (col, id, doc) => request('PATCH', `/api/${col}/${id}`, doc),
  remove: (col, id) => request('DELETE', `/api/${col}/${id}`),
}
