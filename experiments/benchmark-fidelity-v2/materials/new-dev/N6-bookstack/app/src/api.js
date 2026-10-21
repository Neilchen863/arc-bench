// Thin client for the shared JSON store. All business data lives on the server.
async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${method} ${url} failed with ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export const api = {
  list: (col) => request('GET', `/api/${col}`),
  get: (col, id) => request('GET', `/api/${col}/${encodeURIComponent(id)}`),
  create: (col, doc) => request('POST', `/api/${col}`, doc),
  patch: (col, id, doc) => request('PATCH', `/api/${col}/${encodeURIComponent(id)}`, doc),
};

// Business clock: dates come from the server, never from the machine clock.
let nowPromise;
export function businessNow() {
  nowPromise ||= request('GET', '/api/now').then((r) => r.now);
  return nowPromise;
}

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function byCreated(a, b) {
  return String(a.createdOn || a.createdAt).localeCompare(String(b.createdOn || b.createdAt)) || String(a.createdAt).localeCompare(String(b.createdAt));
}
